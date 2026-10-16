-- =============================================================================
-- 002 — Skema pengerasan pre-order
-- =============================================================================
-- Menambah landasan untuk tiga hal:
--   1. Penalti siswa yang tidak mengambil pesanan (kolom di profiles).
--   2. Mode bayar dan jejak poin (kolom di orders + vouchers).
--   3. Pengerasan guard profil, supaya siswa tidak bisa menghapus penaltinya.
--
-- PENTING — kenapa berkas ini TIDAK memakai nilai enum barunya:
--   Postgres menolak memakai nilai yang baru ditambahkan ke sebuah tipe enum di
--   transaksi yang sama dengan saat nilai itu ditambahkan. SQL Editor
--   menjalankan satu tempelan sebagai satu transaksi. Jadi di sini hanya ada
--   penambahan nilai enum, kolom baru, dan index biasa; pemakaiannya
--   (default kolom, index unik parsial, RPC) ada di 003.
--
-- Idempoten: aman dijalankan berulang kali.
--
-- Jalankan lewat SQL Editor, atau dari terminal:
--   node --env-file=.env.local scripts/db.mjs supabase/migrations/002_preorder_schema.sql

-- -----------------------------------------------------------------------------
-- 1. Nilai status baru
-- -----------------------------------------------------------------------------
-- awaiting_approval : pesanan baru masuk, menunggu penjual menerima.
-- unclaimed         : siswa tidak mengambil pesanan yang sudah dinyatakan siap.
-- Nilai 'pending' lama sengaja dibiarkan ada (dipensiunkan) dan tidak pernah
-- dipakai lagi; menghapusnya menuntut membongkar tipe enum, dan risikonya tidak
-- sebanding pada database yang sudah live.
alter type public.order_status add value if not exists 'awaiting_approval';
alter type public.order_status add value if not exists 'unclaimed';

-- -----------------------------------------------------------------------------
-- 2. Kolom penalti di profiles
-- -----------------------------------------------------------------------------
-- unclaimed_orders_count   : jumlah pelanggaran berjalan. Ke-2 memicu blokir.
-- preorder_blocked_until   : batas akhir blokir. Kedaluwarsa sendiri, tanpa cron.
alter table public.profiles
  add column if not exists unclaimed_orders_count integer not null default 0,
  add column if not exists preorder_blocked_until timestamptz;

-- -----------------------------------------------------------------------------
-- 3. Kolom pembayaran di orders
-- -----------------------------------------------------------------------------
-- payment_mode    : 'cash' bayar tunai di kantin, 'points' lunas dengan poin.
-- points_paid     : poin yang didebit saat checkout. Untuk mode cash berisi
--                   biaya voucher, untuk mode points berisi harga penuh. Karena
--                   itu aturan pengembaliannya satu: kembalikan points_paid.
-- points_refunded : poin yang sudah dikembalikan, supaya saldo siswa bisa
--                   dipertanggungjawabkan saat ia bertanya.
alter table public.orders
  add column if not exists payment_mode text not null default 'cash',
  add column if not exists points_paid integer not null default 0,
  add column if not exists points_refunded integer not null default 0;

do $$ begin
  alter table public.orders add constraint orders_payment_mode_chk
    check (payment_mode in ('cash', 'points'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.orders add constraint orders_points_paid_chk
    check (points_paid >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.orders add constraint orders_points_refunded_chk
    check (points_refunded >= 0);
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 4. Jejak voucher
-- -----------------------------------------------------------------------------
-- Voucher yang poinnya dikembalikan harus meninggalkan jejak, bukan menghilang.
alter table public.vouchers
  add column if not exists order_id uuid
    references public.orders(id) on delete set null,
  add column if not exists refunded_at timestamptz;

-- -----------------------------------------------------------------------------
-- 5. Index pendukung
-- -----------------------------------------------------------------------------
-- Mempercepat pemeriksaan "apakah siswa ini punya pesanan aktif?".
-- Invarian sebenarnya (maksimal satu) baru ditegakkan index unik parsial di 003,
-- karena index itu menyebut nilai enum yang belum boleh dipakai di sini.
create index if not exists orders_student_status_idx
  on public.orders (student_id, status);

-- -----------------------------------------------------------------------------
-- 6. Guard profil diperluas
-- -----------------------------------------------------------------------------
-- Policy profiles_self_update mengizinkan siswa memperbarui profilnya sendiri.
-- Tanpa perluasan ini, dua kolom penalti baru jadi lubang: siswa bisa
-- mengosongkan unclaimed_orders_count atau menghapus blokirnya sendiri, dan
-- seluruh fitur penalti jadi hiasan.
--
-- RPC sistem (security definer) menandai transaksinya dengan set_config, sama
-- seperti yang sudah dipakai process_waste_deposit dan place_order.
create or replace function public.prevent_profile_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.allow_profile_system_update', true), 'off') = 'on' then
    return new;
  end if;

  if auth.uid() = new.id
     and (new.role is distinct from old.role
          or new.points_balance is distinct from old.points_balance
          or new.total_recycled_kg is distinct from old.total_recycled_kg
          or new.qr_code_token is distinct from old.qr_code_token
          or new.unclaimed_orders_count is distinct from old.unclaimed_orders_count
          or new.preorder_blocked_until is distinct from old.preorder_blocked_until) then
    raise exception 'Field role/saldo/token/penalti hanya dapat diubah oleh sistem.';
  end if;

  return new;
end $$;
