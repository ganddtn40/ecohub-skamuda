# Pengerasan Pre-Order Kantin & Perbaikan Autentikasi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat pesanan kantin fiktif tidak lagi menguntungkan — siswa maksimal punya satu pesanan aktif, penjual bisa menolak sebelum memasak dengan poin siswa kembali utuh, dan siswa yang tidak mengambil pesanan menerima konsekuensi bertingkat; sekaligus memperbaiki halaman login di HP dan menambah alur lupa password.

**Architecture:** Semua aturan bisnis ditegakkan di Postgres, bukan di klien. Setiap perpindahan status pesanan lewat RPC `security definer`, dan policy update langsung pada `orders` dicabut, sehingga siswa yang memanggil REST Supabase dengan JWT yang sah pun tetap ditolak. Batas satu pesanan aktif dijamin oleh index unik parsial, bukan oleh pengecekan yang bisa kalah balapan. UI hanya menjelaskan aturan itu dan menampilkan hasilnya.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.7, Tailwind 3.4, Supabase (Postgres + Auth + RLS + Realtime), Lucide React, framer-motion (ditambahkan di Fase C).

**Spec:** `docs/superpowers/specs/2026-10-16-preorder-hardening-design.md`

## Global Constraints

- 100% ikon Lucide. Tidak ada emoji di kode, salinan, atau sebagai pengganti gambar.
- Salinan yang dilihat pengguna berbahasa Indonesia; komentar kode berbahasa Indonesia mengikuti gaya berkas sekitarnya.
- Semua rute, policy RLS, RPC, dan aturan bisnis yang tidak disebut rencana ini dipertahankan apa adanya.
- `npx tsc --noEmit` harus keluar 0 dan `npm run build` harus berhasil. ESLint diabaikan saat build; tsc adalah gerbangnya.
- Klien Supabase tetap untyped; tipe tulis-tangan hidup di `src/types/database.ts`.
- Radius: `rounded-full` untuk tombol dan pill filter, `rounded-control` (12px) untuk input dan blok daftar, `rounded-card` (16px) untuk permukaan.
- Tipografi: `text-body` (17px) adalah dasar, `text-small` (13px) adalah lantai. Tidak ada teks di bawah 13px. Angka memakai kelas `tnum`.
- Tidak ada garis tepi `border-*` kecuali pemisah `<tr>` sungguhan, kolom form, dan interior `[data-ui]`.
- Setiap animasi harus inert saat `prefers-reduced-motion: reduce`.
- Migrasi dijalankan berurutan 002 → 003 dan harus idempoten (aman dijalankan dua kali).
- Tabel material bernama `waste_item_types` (bukan `waste_types`).
- `SUPABASE_SERVICE_ROLE_KEY` tidak pernah dicetak dan tidak pernah di-commit; `.env.local` tetap gitignored.
- Kurs poin: 1 poin = Rp10. Harga poin satu keranjang = `sum(menu_items.points_price × quantity)`.
- Kode error RPC: `PZ001` diblokir, `PZ002` sudah punya pesanan aktif, `PZ003` saldo kurang, `PZ004` menu tanpa harga poin, `PZ005` transisi tidak legal. Jaring terakhir `23505` (pelanggaran index unik) diperlakukan sebagai `PZ002`.

## Prasyarat Eksekusi

**Menjalankan SQL.** Tidak ada `psql` di mesin ini dan `.env.local` hanya memuat URL REST + kunci.
Semua SQL dijalankan lewat **Supabase SQL Editor** (Dashboard → SQL Editor → tempel → Run),
jalur yang sudah dipakai proyek ini. Setiap langkah SQL di bawah menyebut persis apa yang
ditempel dan keluaran apa yang berarti lulus.

Kalau Anda lebih suka saya menjalankannya sendiri, beri saya **Session pooler connection string**
(Dashboard → Connect → Session pooler) dan langkah-langkah itu berubah jadi perintah otomatis.
Tanpa itu, setiap langkah SQL butuh Anda menempel dan mengabarkan hasilnya.

**Akun demo** (kata sandi `Skamuda2026!`): `siswa.demo@skamuda.sch.id`,
`petugas.demo@skamuda.sch.id`, `kantin.berkah@skamuda.sch.id` (Kantin Pakde).

**Server dev** dijalankan dengan `npm run dev` di `skamuda-ecohub`. Setiap perubahan
`tailwind.config.ts` wajib disertai restart server, karena server basi diam-diam membuang token
`theme.extend` baru.

---

## Review Focus

Lima kelas masukan yang spec tidak sebutkan tetapi paling mungkin menggigit pemakai perangkat
lunak ini. Masing-masing punya ujinya sendiri di task yang memiliki kodenya.

1. **Siswa menekan "Buat pesanan" dua kali cepat.** Harusnya tetap satu pesanan, bukan dua. Index unik parsial yang menjaminnya. (Task 3.)
2. **Keranjang berisi menu dengan `points_price` NULL atau 0, dibayar dengan poin.** Harusnya ditolak dengan alasan jelas, tidak pernah jadi pesanan gratis. `points_price = 0` adalah lubang yang paling mudah terlewat. (Task 3 dan Task 6.)
3. **Penjual menekan "Tidak Diambil" dua kali pada pesanan yang sama.** Harusnya pelanggaran terhitung sekali dan poin dikembalikan paling banyak sekali. (Task 4.)
4. **Blokir 3 hari seorang siswa berakhir saat halaman kantin sudah terbuka.** Harusnya UI pesan kembali muncul, bukan spanduk blokir yang basi selamanya. (Task 7.)
5. **Tautan reset dibuka di peramban berbeda dari yang memintanya.** Harusnya ada pesan yang jelas dan jalan kembali ke `/lupa-password`, bukan lemparan diam-diam ke `/login`. (Task 10.)

---

## Fase A — Pengerasan Pre-Order

### Task 1: Skema pre-order (migrasi 002)

**Files:**
- Create: `supabase/migrations/002_preorder_schema.sql`

**Interfaces:**
- Consumes: skema `001_production_live.sql` yang sudah live.
- Produces (dipakai Task 3, 4, 6, 7):
  - `public.order_status` bertambah nilai `'awaiting_approval'` dan `'unclaimed'`
  - `public.profiles.unclaimed_orders_count integer not null default 0`
  - `public.profiles.preorder_blocked_until timestamptz`
  - `public.orders.payment_mode text not null default 'cash'` dengan check `in ('cash','points')`
  - `public.orders.points_paid integer not null default 0` dengan check `>= 0`
  - `public.orders.points_refunded integer not null default 0` dengan check `>= 0`
  - `public.vouchers.order_id uuid references public.orders(id) on delete set null`
  - `public.vouchers.refunded_at timestamptz`
  - index `orders_student_status_idx on public.orders (student_id, status)`
  - `public.prevent_profile_escalation()` diperluas menjaga dua kolom profil baru

- [ ] **Step 1: Tulis migrasi 002**

Isi berkas, berurutan. Tidak satu pun pernyataan di sini **memakai** nilai enum baru —
itu wajib, karena Postgres menolak pemakaian nilai enum di transaksi yang sama dengan
saat nilai itu ditambahkan, dan SQL Editor menjalankan satu tempelan sebagai satu transaksi.

```sql
-- Nilai enum baru. Aman ditambahkan di sini; pemakaiannya baru ada di 003.
alter type public.order_status add value if not exists 'awaiting_approval';
alter type public.order_status add value if not exists 'unclaimed';

-- Kolom profil untuk penalti.
alter table public.profiles
  add column if not exists unclaimed_orders_count integer not null default 0,
  add column if not exists preorder_blocked_until timestamptz;

-- Kolom pesanan untuk mode bayar dan jejak poin.
alter table public.orders
  add column if not exists payment_mode text not null default 'cash',
  add column if not exists points_paid integer not null default 0,
  add column if not exists points_refunded integer not null default 0;

-- Check constraint ditambah terpisah supaya bisa idempoten.
do $$ begin
  alter table public.orders add constraint orders_payment_mode_chk
    check (payment_mode in ('cash', 'points'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.orders add constraint orders_points_paid_chk check (points_paid >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.orders add constraint orders_points_refunded_chk check (points_refunded >= 0);
exception when duplicate_object then null; end $$;

-- Jejak voucher: pesanan mana, dan kapan dikembalikan.
alter table public.vouchers
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists refunded_at timestamptz;

-- Index pendukung pemeriksaan pesanan aktif.
create index if not exists orders_student_status_idx on public.orders (student_id, status);
```

- [ ] **Step 2: Perluas guard profil di berkas yang sama**

Tambahkan dua kolom baru ke daftar yang dijaga `prevent_profile_escalation`, dengan
mengganti isi fungsinya. Tanpa ini siswa bisa menghapus penaltinya sendiri: policy
`profiles_self_update` mengizinkan pembaruan profil sendiri.

```sql
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
```

- [ ] **Step 3: Terapkan migrasi**

Tempel seluruh isi `supabase/migrations/002_preorder_schema.sql` ke SQL Editor, lalu Run.
Expected: `Success. No rows returned`.

- [ ] **Step 4: Jalankan ulang untuk membuktikan idempotensi**

Tempel berkas yang sama sekali lagi, lalu Run.
Expected: `Success. No rows returned` — bukan `type "order_status" already exists` dan bukan
`column already exists`.

- [ ] **Step 5: Buktikan guard profil menolak siswa**

Tempel skrip probe ini, ganti `<UUID_SISWA>` dengan id `siswa.demo@skamuda.sch.id`
(ambil lewat `select id from auth.users where email = 'siswa.demo@skamuda.sch.id';`).

```sql
do $$
declare v_student uuid := '<UUID_SISWA>';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_student::text)::text, true);
  begin
    update public.profiles set unclaimed_orders_count = 0 where id = v_student;
    raise exception 'GAGAL: guard tidak menolak, siswa bisa menghapus penaltinya sendiri.';
  exception
    when others then
      if sqlerrm like 'GAGAL:%' then raise; end if;
      raise notice 'LULUS: guard menolak -> %', sqlerrm;
  end;
end $$;
```

Expected: notice `LULUS: guard menolak -> Field role/saldo/token/penalti hanya dapat diubah oleh sistem.`

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/002_preorder_schema.sql
git commit -m "feat(db): add preorder penalty columns, payment mode, and profile guard"
```

---

### Task 2: Tipe dan konstanta

**Files:**
- Modify: `src/types/database.ts`
- Modify: `src/lib/constants.ts`
- Modify: `src/lib/auth.ts`
- Create: `src/lib/order-errors.ts`

**Interfaces:**
- Consumes: skema dari Task 1.
- Produces (dipakai Task 3–12):
  - `export type OrderPaymentMode = "cash" | "points"`
  - `OrderStatus` bertambah `"awaiting_approval"` dan `"unclaimed"`; `"pending"` tetap ada sebagai pensiunan
  - `Order` bertambah `payment_mode: OrderPaymentMode`, `points_paid: number`, `points_refunded: number`
  - `Profile` bertambah `unclaimed_orders_count: number`, `preorder_blocked_until: string | null`
  - `Voucher` bertambah `order_id: string | null`, `refunded_at: string | null`
  - `TicketData` bertambah `payment_mode: OrderPaymentMode`, `points_paid: number`
  - `export interface PreorderStatus` dengan `is_blocked: boolean`, `blocked_until: string | null`, `unclaimed_count: number`, `active_order_id: string | null`, `active_order_status: OrderStatus | null`, `active_booking_code: string | null`
  - `ORDER_STATUS_META`, `STATUS_TONE` bertambah entri untuk dua status baru; `ORDER_STATUS_FLOW` menjadi `["awaiting_approval", "processing", "ready_for_pickup", "completed"]`
  - `export function mapOrderError(input: string): string`

- [ ] **Step 1: Perluas `OrderStatus` dan tambah tipe pesanan**

Di `src/types/database.ts`, ganti definisi `OrderStatus`:

```ts
export type OrderStatus =
  | "awaiting_approval"
  | "processing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "unclaimed"
  /** Pensiunan: masih ada di tipe enum Postgres, tidak pernah dipakai sejak migrasi 003. */
  | "pending";

export type OrderPaymentMode = "cash" | "points";
```

- [ ] **Step 2: Jalankan tsc untuk melihat kegagalan yang diinginkan**

Run: `npx tsc --noEmit`
Expected: FAIL — `ORDER_STATUS_META` dan `STATUS_TONE` di `src/lib/constants.ts` kekurangan
kunci `awaiting_approval` dan `unclaimed`. Ini yang membuat penambahan status tidak bisa
diam-diam terlewat.

- [ ] **Step 3: Tambah kolom baru ke `Order`, `Profile`, `Voucher`, dan `TicketData`**

`Order` bertambah `payment_mode: OrderPaymentMode`, `points_paid: number`, `points_refunded: number`.
`Profile` bertambah `unclaimed_orders_count: number`, `preorder_blocked_until: string | null`.
`Voucher` bertambah `order_id: string | null`, `refunded_at: string | null`.
`TicketData` bertambah `payment_mode: OrderPaymentMode`, `points_paid: number`.

Tambahkan juga `PreorderStatus` seperti di blok Interfaces.

- [ ] **Step 4: Lengkapi konstanta status**

Di `src/lib/constants.ts`:

```ts
awaiting_approval: { label: "Menunggu Diterima", hint: "Pesanan baru masuk, menunggu penjual menerima." },
// ...
unclaimed: { label: "Tidak Diambil", hint: "Pesanan tidak diambil siswa." },
```

`STATUS_TONE`: `awaiting_approval: "amber"`, `unclaimed: "red"`.
`ORDER_STATUS_FLOW`: hapus `"pending"`, sisipkan `"awaiting_approval"` di depan.
Pertahankan entri `pending` yang lama supaya pesanan warisan tetap bisa dirender.

- [ ] **Step 5: Ikut sertakan kolom profil baru di `PROFILE_COLUMNS`**

Di `src/lib/auth.ts`, tambahkan `unclaimed_orders_count, preorder_blocked_until` ke
`PROFILE_COLUMNS`. Tanpa ini `Profile` berbohong: tipenya mengklaim kolomnya ada padahal
query tidak mengambilnya.

- [ ] **Step 6: Tulis `src/lib/order-errors.ts`**

```ts
/** Memetakan kegagalan RPC pesanan ke kalimat Indonesia yang bisa dibaca siswa/penjual. */
export function mapOrderError(input: string): string
```

Aturan pemetaan, diperiksa berurutan: mengandung `PZ001` → sebutkan blokir;
`PZ002` atau `23505` → sebutkan masih ada pesanan aktif;
`PZ003` → saldo belum cukup; `PZ004` → ada menu tanpa harga poin;
`PZ005` → status sudah berubah, muat ulang. Selain itu kembalikan `input` apa adanya.

- [ ] **Step 7: Jalankan tsc**

Run: `npx tsc --noEmit`
Expected: PASS, keluar 0.

- [ ] **Step 8: Commit**

```bash
git add src/types/database.ts src/lib/constants.ts src/lib/auth.ts src/lib/order-errors.ts
git commit -m "feat(types): model preorder statuses, payment mode, and error mapping"
```

---

### Task 3: `place_order` v2, index unik, dan uji aturan

**Files:**
- Create: `supabase/migrations/003_preorder_logic.sql`
- Create: `supabase/tests/002_preorder_rules.sql`

**Interfaces:**
- Consumes: skema Task 1.
- Produces (dipakai Task 4, 6, 7):
  - `public.place_order(p_stand_id uuid, p_slot text, p_notes text, p_items jsonb, p_voucher_points integer default 0, p_payment_mode text default 'cash') returns jsonb`
    dengan kunci balikan `order_id, booking_code, subtotal, discount, net_total, points_left, status, payment_mode, points_paid`
  - default kolom `public.orders.status` menjadi `'awaiting_approval'`
  - index `orders_one_active_per_student`

- [ ] **Step 1: Tulis skrip uji yang gagal**

Create `supabase/tests/002_preorder_rules.sql`. Bentuknya satu blok `do` yang mengumpulkan
hasil lalu **selalu** mengakhiri dengan `raise exception`, sehingga transaksinya selalu
di-rollback dan hasilnya tetap terlihat di panel pesan SQL Editor.

Rangka yang dipakai:

```sql
do $$
declare
  v_student uuid;
  v_stand   uuid;
  v_results text[] := '{}';
  v_order   jsonb;
begin
  select id into v_student from auth.users where email = 'siswa.demo@skamuda.sch.id';
  select id into v_stand from public.canteen_stands where is_active limit 1;

  -- Bersihkan pesanan demo lebih dulu, sebagai postgres, supaya aturan bisa diuji dari nol.
  delete from public.order_items where order_id in (select id from public.orders where student_id = v_student);
  delete from public.orders where student_id = v_student;
  update public.profiles set points_balance = 5000, unclaimed_orders_count = 0,
         preorder_blocked_until = null where id = v_student;
  perform set_config('app.allow_profile_system_update', 'on', true);

  -- Mulai menyamar sebagai siswa.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_student::text)::text, true);

  v_results := v_results || 'INFO: mulai uji aturan place_order';
  -- ... blok per aturan, masing-masing begin/exception sendiri ...
  raise exception E'\n%', array_to_string(v_results, E'\n');
end $$;
```

Setiap aturan ditulis sebagai sub-blok `begin ... exception when others then ... end;` supaya
satu kegagalan tidak menghentikan aturan berikutnya. Tujuh aturan yang harus ada, dengan
assertion tepat:

1. **Pesanan pertama berhasil dan berstatus menunggu diterima** — `place_order` dengan
   `p_payment_mode => 'cash'`, lalu pastikan `v_order->>'status' = 'awaiting_approval'`.
2. **Pesanan kedua ditolak `PZ002`** — panggil lagi; pastikan SQLSTATE `PZ002`.
3. **Keranjang berisi menu `points_price` NULL dengan mode poin ditolak `PZ004`** — pakai
   menu yang `points_price is null`; pastikan `PZ004`. Ini menutup Review Focus nomor 2.
4. **Menu berharga poin 0 dengan mode poin juga ditolak** — pastikan `PZ004`, bukan pesanan
   gratis. (`points_price = 0` harus diperlakukan sama dengan NULL.)
5. **Saldo kurang dengan mode poin ditolak `PZ003`** — set `points_balance` ke 10 lebih dulu,
   panggil dengan keranjang mahal; pastikan `PZ003`.
6. **Siswa terblokir ditolak `PZ001`** — set `preorder_blocked_until = now() + interval '1 day'`,
   panggil; pastikan `PZ001`.
7. **Index unik menolak pesanan aktif kedua walau RPC dilewati** — diuji di blok `do` terpisah
   di awal berkas, sebagai `postgres` dan sebelum penyamaran dimulai: sisipkan langsung satu
   baris `orders` berstatus `awaiting_approval` untuk siswa yang sama, lalu pastikan gagal
   dengan SQLSTATE `23505`. Inilah yang membuktikan batasnya ditegakkan database, bukan
   pengecekan di RPC, sehingga dua permintaan checkout bersamaan tidak bisa lolos berdua.
   Ini yang menutup Review Focus nomor 1.

- [ ] **Step 2: Jalankan skrip untuk memastikan gagal**

Tempel berkas uji ke SQL Editor, Run.
Expected: `ERROR: function public.place_order(uuid, text, text, jsonb, integer, text) does not exist`
— blok `do` gagal dikompilasi karena fungsinya belum ada. Inilah sinyal gagalnya.

- [ ] **Step 3: Tulis migrasi 003 dengan `place_order` v2**

Create `supabase/migrations/003_preorder_logic.sql`. Strukturnya:

```sql
-- Default status baru. Aman di sini karena nilai enumnya ditambahkan di transaksi 002.
alter table public.orders alter column status set default 'awaiting_approval';

-- Invarian satu pesanan aktif, ditegakkan database, bukan pengecekan yang bisa kalah balapan.
create unique index if not exists orders_one_active_per_student
  on public.orders (student_id)
  where status in ('awaiting_approval', 'processing', 'ready_for_pickup');

create or replace function public.place_order(
  p_stand_id       uuid,
  p_slot           text,
  p_notes          text,
  p_items          jsonb,
  p_voucher_points integer default 0,
  p_payment_mode   text default 'cash'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$ /* ... isi ... */ $$;
```

Isi fungsinya mempertahankan seluruh validasi `001` (login, peran siswa, slot, stand aktif,
item milik stand dan tersedia, subtotal > 0) dan menambahkan, dalam urutan ini:

1. `select * into v_profile from public.profiles where id = v_uid for update;` tetap paling
   awal — kunci baris ini yang membuat dua permintaan bersamaan terserialisasi.
2. Reset malas: jika `preorder_blocked_until` sudah lewat, set hitungan ke 0 dan kosongkan
   kolomnya.
3. Jika masih diblokir → `raise exception 'Siswa sedang diblokir...' using errcode = 'PZ001'`.
4. Jika ada pesanan aktif → `raise ... using errcode = 'PZ002'`, sertakan `booking_code`-nya.
5. Hitung subtotal dari `price_idr` seperti sebelumnya.
6. Cabang `p_payment_mode`:
   - `'cash'` — perilaku voucher lama, `points_paid` = `p_voucher_points`,
     `discount_applied` = potongan, `payment_mode` = `'cash'`.
   - `'points'` — hitung `v_points_cost` dari `sum(mi.points_price * qty)` dengan syarat
     **setiap** baris punya `points_price` yang `> 0`, jika tidak → `errcode = 'PZ004'`.
     Jika `points_balance < v_points_cost` → `errcode = 'PZ003'`. Lalu potong saldo dengan
     `set_config('app.allow_profile_system_update','on',true)` lebih dulu, set `points_paid`
     = `v_points_cost`, `discount_applied` = `v_subtotal`.
   - Nilai lain → `errcode = 'PZ004'`.
7. Sisip pesanan dengan `status = 'awaiting_approval'`.
8. Balikan ditambah `status`, `payment_mode`, `points_paid`.

- [ ] **Step 4: Terapkan migrasi**

Tempel seluruh isi `003_preorder_logic.sql` ke SQL Editor, Run.
Expected: `Success. No rows returned`.

- [ ] **Step 5: Jalankan ulang skrip uji**

Expected: pesan berisi enam baris `LULUS:` dan nol baris `GAGAL:`.
Kalau ada `GAGAL:`, perbaiki migrasinya dan ulangi Step 3–5.

- [ ] **Step 6: Buktikan index unik bekerja dan idempoten**

Jalankan ulang migrasi (Step 4). Expected: tetap `Success`, bukan `relation already exists`.
Lalu jalankan ulang skrip uji. Expected: hasil yang sama persis seperti Step 5.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/003_preorder_logic.sql supabase/tests/002_preorder_rules.sql
git commit -m "feat(db): enforce one active order per student in place_order"
```

---

### Task 4: `vendor_resolve_order`, `get_preorder_status`, cabut policy, papan penjual

Task ini satu perubahan utuh: "pengelolaan pesanan penjual pindah dari `update` tabel ke RPC".
Policy dicabut dan UI-nya diganti dalam langkah yang sama, supaya tidak pernah ada keadaan
di mana papan penjual rusak.

**Files:**
- Modify: `supabase/migrations/003_preorder_logic.sql`
- Create: `supabase/tests/003_preorder_resolution.sql`
- Create: `src/components/ui/ConfirmDialog.tsx`
- Modify: `src/components/vendor/OrderBoard.tsx`
- Modify: `src/components/vendor/BookingVerifier.tsx`
- Modify: `src/app/(app)/kantin/page.tsx`

**Koreksi saat pengerjaan (Task 4):** `BookingVerifier.tsx` tidak ada di daftar awal, padahal
ia jalur kedua yang mengubah status pesanan — `update` langsung ke tabel, dipakai
`/kantin/scan`. Begitu policy `orders_vendor_update` dicabut, `update` seperti itu tetap
mengembalikan sukses dengan nol baris: penjual melihat "Status diperbarui" padahal tidak ada
yang berubah. Jadi ia dipindah ke `vendor_resolve_order` di task ini juga, bukan menunggu.

**Interfaces:**
- Consumes: `place_order` dari Task 3, `mapOrderError` dari Task 2.
- Produces (dipakai Task 5, 7):
  - `public.vendor_resolve_order(p_order_id uuid, p_action text) returns jsonb` →
    `{ order_id, status, points_refunded, unclaimed_count, blocked_until }`.
    `p_action` sah: `'accept' | 'reject' | 'ready' | 'complete' | 'unclaimed'`.
  - `public.get_preorder_status() returns jsonb` →
    `{ is_blocked, blocked_until, unclaimed_count, active_order_id, active_order_status, active_booking_code }`
  - policy `orders_vendor_update` pada `public.orders` **dicabut**
  - `ConfirmDialog` dengan props
    `{ open: boolean; title: string; description: string; confirmLabel: string; tone?: "danger" | "primary"; pending?: boolean; onConfirm: () => void; onClose: () => void }`
  - `VendorOrder` bertambah `payment_mode: OrderPaymentMode` dan `points_paid: number`

- [ ] **Step 1: Tulis skrip uji resolusi yang gagal**

Create `supabase/tests/003_preorder_resolution.sql` memakai rangka `do` yang sama dengan
Task 3. Sebagai siswa: buat pesanan berstatus `awaiting_approval`. Lalu berpindah menyamar
sebagai vendor (cari `vendor_id` dari stand yang dipakai) dan uji:

1. `vendor_resolve_order(id, 'accept')` → status `processing`.
2. `vendor_resolve_order(id, 'ready')` → status `ready_for_pickup`.
3. **Aksi tidak legal ditolak `PZ005`** — dari `ready_for_pickup`, panggil `'accept'`.
4. **Penjual lain tidak bisa menyentuh pesanan ini** — impersonasi vendor stand kedua
   (kalau hanya ada satu stand, lewati aturan ini dan catat `LEWAT:` di hasil); pastikan error.
5. **`unclaimed` pertama mengembalikan poin penuh** — pakai pesanan mode `points`; catat
   `points_balance` sebelum dan sesudah; pastikan selisihnya 0 dan `unclaimed_count = 1`
   serta `preorder_blocked_until is null`.
6. **`unclaimed` kedua menghanguskan poin dan memblokir** — ulangi alur, pastikan
   `unclaimed_count = 2`, `preorder_blocked_until` terisi, dan `points_refunded = 0`.
   Ini menutup Review Focus nomor 3 bagian pertama.
7. **`unclaimed` ganda pada pesanan yang sama tidak dihitung dua kali** — panggil
   `(id, 'unclaimed')` dua kali berturut pada pesanan yang sudah `unclaimed`; pastikan
   panggilan kedua gagal `PZ005` dan hitungannya tidak bertambah. Ini menutup Review Focus
   nomor 3 bagian kedua.
8. **Mengembalikan poin sebesar `points_paid`** — untuk pesanan mode `cash` dengan voucher,
   pastikan yang kembali adalah biaya voucher, dan `vouchers.refunded_at` terisi.

- [ ] **Step 2: Jalankan skrip untuk memastikan gagal**

Tempel ke SQL Editor, Run.
Expected: `ERROR: function public.vendor_resolve_order(uuid, text) does not exist`.

- [ ] **Step 3: Tambah kedua RPC ke migrasi 003**

Append ke `supabase/migrations/003_preorder_logic.sql`, dalam urutan:

```sql
create or replace function public.vendor_resolve_order(p_order_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = public
as $$ /* ... */ $$;

create or replace function public.get_preorder_status()
returns jsonb language plpgsql volatile security definer set search_path = public
as $$ /* ... */ $$;

drop policy if exists orders_vendor_update on public.orders;
```

`vendor_resolve_order` wajib, berurutan:
1. Tolak kalau `auth.uid()` bukan `canteen_vendor`.
2. Ambil pesanan `for update`; tolak kalau tidak ada.
3. **Periksa kepemilikan sendiri**: `orders.stand_id` harus milik stand dengan
   `vendor_id = auth.uid()`. Wajib, karena `security definer` melewati RLS.
4. Tentukan status tujuan dari `p_action` dan tolak yang tidak legal dengan `PZ005`:
   `accept` hanya dari `awaiting_approval`; `ready` hanya dari `processing`;
   `complete` dari `processing` atau `ready_for_pickup`;
   `reject` hanya dari `awaiting_approval`; `unclaimed` hanya dari `ready_for_pickup`.
5. Untuk `reject`: set `cancelled`, lalu kembalikan poin penuh.
6. Untuk `unclaimed`: set `unclaimed`, lalu baca hitungan **sebelum** bertambah.
   Jika 0 → kembalikan poin penuh dan set hitungan 1. Jika ≥ 1 → jangan kembalikan poin,
   set hitungan 2 dan `preorder_blocked_until = now() + interval '3 days'`.
7. Pengembalian poin, satu jalur untuk kedua mode: `set_config('app.allow_profile_system_update','on',true)`,
   lalu `update profiles set points_balance = points_balance + orders.points_paid`,
   isi `orders.points_refunded = points_paid`, dan jika ada baris `vouchers` dengan
   `order_id` pesanan ini, isi `refunded_at = now()`.
8. Balikkan `{ order_id, status, points_refunded, unclaimed_count, blocked_until }`.

- [ ] **Step 4: Terapkan migrasi**

Tempel seluruh isi `003_preorder_logic.sql` ke SQL Editor, Run.
Expected: `Success. No rows returned`.

- [ ] **Step 5: Jalankan ulang skrip uji resolusi**

Expected: seluruh baris `LULUS:` atau `LEWAT:`, nol `GAGAL:`.

- [ ] **Step 6: Buktikan klien tidak bisa lagi mengubah status**

Sebagai siswa (bukan vendor), coba `update` status pada `orders` lewat REST dengan anon key:
setelah policy dicabut harus nol baris terpengaruh atau error. Catat hasilnya di ringkasan
commit. Kalau ini lolos, seluruh pendekatan gugur.

- [ ] **Step 7: Tulis `src/components/ui/ConfirmDialog.tsx`**

Client component, memakai pola fokus dan Escape yang sama dengan `Sheet` yang sudah ada
(`src/components/ui/Sheet.tsx`) — baca berkas itu dulu dan ikuti. Tanpa `shadow-float`,
tanpa garis tepi; pakai `rounded-card bg-white`.

- [ ] **Step 8: Ganti papan penjual ke RPC**

Di `src/components/vendor/OrderBoard.tsx`:

- Ganti `NEXT_ACTION` dengan pemetaan per status: `awaiting_approval` → primer "Terima
  Pesanan" + sekunder "Tolak"; `processing` → "Siap Diambil"; `ready_for_pickup` →
  "Selesai Diambil" + sekunder "Tidak Diambil".
- Ganti `activeStatuses` menjadi `["awaiting_approval", "processing", "ready_for_pickup"]`.
- `updateStatus` tidak lagi memanggil `.from("orders").update(...)`, tetapi
  `supabase.rpc("vendor_resolve_order", { p_order_id: order.id, p_action: action })`,
  dan pesan errornya lewat `mapOrderError`.
- Tombol sekunder yang merugikan membuka `ConfirmDialog` lebih dulu; teksnya menyebut
  akibatnya untuk siswa ("Tidak Diambil" menyebut poin hangus dan blokir).
- Tampilkan `payment_mode` supaya penjual tahu apakah masih ada uang tunai yang harus
  ditagih. Untuk `points`, ganti nominal rupiah dengan "Sudah dibayar dengan poin ·
  <points_paid> P".

- [ ] **Step 9: Teruskan kolom baru dari halaman penjual**

Di `src/app/(app)/kantin/page.tsx`, tambahkan `payment_mode, points_paid` ke `select(...)` dan
ke pemetaan `VendorOrder`.

- [ ] **Step 9b: Pindahkan `BookingVerifier.tsx` ke RPC juga**

Tambahan dari koreksi di atas. Di `src/components/vendor/BookingVerifier.tsx`, ganti
`NEXT_ACTION` supaya berkunci pada `awaiting_approval` (bukan `pending`) dan berisi nama aksi
plus status tujuan; lalu ganti `supabase.from("orders").update({ status })` menjadi
`supabase.rpc("vendor_resolve_order", { p_order_id, p_action })` dengan pesan error lewat
`mapOrderError`.

- [ ] **Step 10: Verifikasi di peramban**

Jalankan `npm run dev`. Masuk sebagai `kantin.berkah@skamuda.sch.id`. Lakukan alur penuh pada
pesanan sungguhan: Terima → Siap → Selesai. Expected: setiap aksi mengubah badge status tanpa
muat ulang manual, dan tidak ada tombol yang muncul pada status yang salah.

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/003_preorder_logic.sql supabase/tests/003_preorder_resolution.sql src/components/vendor/OrderBoard.tsx src/components/ui/ConfirmDialog.tsx "src/app/(app)/kantin/page.tsx"
git commit -m "feat(vendor): accept or reject orders through an RPC with confirmation"
```

---

### Task 5: Toast dan peringatan pesanan baru

**Files:**
- Create: `src/components/ui/Toast.tsx`
- Create: `src/components/vendor/OrderFeed.tsx`
- Modify: `src/components/realtime/RealtimeRefresher.tsx`
- Modify: `src/components/vendor/OrderBoard.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/(app)/kantin/page.tsx`
- Create: `supabase/migrations/004_realtime_replica_identity.sql`
- Modify: `supabase/tests/001_schema_probe.sql`

**Interfaces:**
- Consumes: `RealtimeRefresher` yang sudah ada dan `OrderBoard` dari Task 4.
- Produces:
  - `ToastProvider` (client) dan `useToast()` → `{ show(message: string, options?: { actionLabel?: string; onAction?: () => void }): void }`
  - `RealtimeRefresher` bertambah prop opsional `onInsert?: (table: string, row: Record<string, unknown>) => void`
  - `OrderFeed` (client) — pemilik filter status papan sekaligus pemicu toast
  - `OrderBoard` menerima `status` dan `onStatusChange`; tipe `OrderFilter` diekspor

- [ ] **Step 1: Tulis `src/components/ui/Toast.tsx`**

`ToastProvider` merender satu host di sudut bawah, menampung maksimal tiga toast, dan
menutupnya otomatis setelah beberapa detik. Belum pakai framer-motion (itu Fase C);
pakai transisi CSS. Toast memakai `role="status"` dan `aria-live="polite"`, bukan `alert`.

- [ ] **Step 2: Pasang host di `src/app/(app)/layout.tsx`**

Bungkus isi layout dengan `ToastProvider` supaya halaman mana pun bisa memunculkan toast.

- [ ] **Step 3: Tambah prop `onInsert` ke `RealtimeRefresher`**

Di handler `postgres_changes` yang sudah ada, setelah memanggil penyegaran, panggil
`onInsert?.(table, payload.new)` bila propnya diberikan. Perubahan ini tidak boleh mengubah
perilaku yang sudah ada saat propnya tidak diberikan.

- [ ] **Step 4: Munculkan toast di papan penjual**

Toast dipicu dari `OrderFeed` — komponen client baru yang membungkus `RealtimeRefresher` dan
`OrderBoard`. Filternya harus pindah ke sana karena aksi "Lihat" pada toast perlu
memindahkannya, dan `kantin/page.tsx` adalah Server Component yang tidak bisa memegang hook.
Isi toast: "Pesanan baru · <pickup_time_slot> · <booking_code>" dengan aksi "Lihat" yang
menyaring papan ke `awaiting_approval`.

- [ ] **Step 5: Tambah penghitung pesanan menunggu diterima**

Angkanya menempel pada tab "Menunggu" di baris filter status, bukan chip terpisah di atas
papan. Dua kontrol untuk saringan yang sama hanya membuat penjual ragu harus menekan yang mana.

**Catatan penyimpangan dari spec, disengaja:** spec menyebut filter bawaan mengarah ke
`awaiting_approval`. Itu akan menyembunyikan pesanan yang sedang disiapkan dari penjual, yang
adalah kemunduran operasional. Jadi filter bawaan tetap `aktif`, dan penyaringan ke
`awaiting_approval` terjadi lewat aksi "Lihat" pada toast — dipicu pengguna, tidak permanen.

**Catatan penyimpangan saat pengerjaan, disengaja — realtime INSERT tidak sampai.** Selama
pengerjaan Task 5, peristiwa INSERT untuk `orders` terbukti **tidak pernah** sampai ke klien,
sementara UPDATE dan DELETE sampai. Sudah diperiksa dan bukan setelan yang bisa dibetulkan dari
sini: `orders` ada di publikasi `supabase_realtime`, `wal_level` = logical, semua flag
publikasi menyala, `replica identity` = full, dan penjual memang boleh membaca barisnya di
bawah RLS (diuji dengan menyamar sebagai penjual lewat `set_config('request.jwt.claims', ...)`).
Jadi penekanannya ada di dalam Realtime sendiri. Akibatnya toast berbasis `onInsert` tidak akan
pernah muncul di lingkungan ini.

Karena itu toast dipicu dari dua arah sekaligus, memakai satu himpunan id supaya tidak dobel:

1. `onInsert` realtime — instan, dan yang benar begitu sisi Supabase beres.
2. Selisih data dari server — papan disegarkan berkala (30 detik, hanya selagi tab terlihat),
   lalu pesanan `awaiting_approval` yang belum pernah diberitakan dibandingkan.

Tanpa nomor 2, fitur ini tertulis benar tapi tidak akan pernah berbunyi — lebih buruk daripada
tidak ada. Hapus nomor 2 kalau Realtime sudah menyalurkan INSERT.

**Migrasi 004:** `replica identity full` untuk `orders` dan `order_items` dipasang supaya basis
data yang berjalan dan berkas migrasi tidak berbeda. Ia bukan penyebab masalah di atas.

- [ ] **Step 6: Verifikasi di peramban**

Papan penjual dibuka, lalu pesanan baru dibuat dari sisi basis data. Expected: toast muncul
tanpa memuat ulang halaman, tab penghitungnya bertambah satu, dan menekan "Lihat" memindahkan
filter ke "Menunggu". Karena INSERT realtime tidak sampai (lihat catatan di atas), kejadian
yang bisa diverifikasi adalah jalur cadangan: sisipkan baris, tunggu satu tick penyegaran.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/Toast.tsx src/components/vendor/OrderFeed.tsx src/components/vendor/OrderBoard.tsx src/components/realtime/RealtimeRefresher.tsx "src/app/(app)/layout.tsx" "src/app/(app)/kantin/page.tsx" supabase/migrations/004_realtime_replica_identity.sql supabase/tests/001_schema_probe.sql
git commit -m "feat(vendor): alert on new orders and count the queue"
```

---

### Task 6: Perhitungan poin, pemilih bayar, dan tiket dari nilai RPC

**Files:**
- Create: `src/lib/preorder.ts`
- Create: `scripts/check-preorder-rules.ts`
- Modify: `src/components/student/MenuCatalog.tsx`
- Modify: `src/components/student/BookingTicket.tsx`
- Modify: `src/app/(app)/siswa/pesanan/page.tsx`
- Modify: `src/components/vendor/BookingVerifier.tsx`

**Koreksi saat pengerjaan (Task 4):** dua berkas terakhir ikut tersentuh di task ini. Begitu
`TicketData.payment_mode` dan `points_paid` menjadi wajib di Task 2, setiap tempat yang
menyusun `TicketData` harus mengisinya — dan ada empat tempat, bukan dua: `MenuCatalog.tsx`,
`BookingTicket.tsx`, `app/(app)/siswa/pesanan/page.tsx`, dan `components/vendor/BookingVerifier.tsx`.
`tsc` baru akan menangkapnya saat field-nya benar-benar dipakai, jadi keempatnya dikerjakan
bersamaan di sini.

**Interfaces:**
- Consumes: `TicketData` dan `OrderPaymentMode` dari Task 2; `place_order` v2 dari Task 3;
  `mapOrderError` dari Task 2.
- Produces (dipakai Task 7):
  - `export type PointsPayment = { available: true; cost: number } | { available: false; reason: "menu-tanpa-harga-poin" | "saldo-kurang"; cost: number | null }`
  - `export function evaluatePointsPayment(lines: Array<{ points_price: number | null; qty: number }>, balance: number): PointsPayment`

- [ ] **Step 1: Tulis pemeriksaan yang gagal**

Create `scripts/check-preorder-rules.ts`. Berkas ini **tidak boleh mengimpor apa pun** selain
`../src/lib/preorder.ts`, supaya Node bisa menjalankannya dengan penghapusan tipe bawaan.

Assertion yang harus ada:

- keranjang dua item `points_price` 1500 dan 500 dengan qty 2 dan 1 → `available: true`, `cost` 3500
- keranjang berisi satu item `points_price: null` → `available: false`, `reason: "menu-tanpa-harga-poin"`
- keranjang berisi satu item `points_price: 0` → `available: false`, `reason: "menu-tanpa-harga-poin"`
- keranjang sah tetapi saldo 100 → `available: false`, `reason: "saldo-kurang"`
- keranjang sah dengan saldo persis sama dengan biaya → `available: true`

Skrip mencetak satu baris per assertion dan keluar dengan kode 1 bila ada yang gagal.

- [ ] **Step 2: Jalankan untuk memastikan gagal**

Run: `node --experimental-strip-types scripts/check-preorder-rules.ts`
Expected: FAIL — modul `../src/lib/preorder.ts` belum ada.

- [ ] **Step 3: Tulis `src/lib/preorder.ts`**

`evaluatePointsPayment` mengembalikan `menu-tanpa-harga-poin` bila ada baris dengan
`points_price` `null` **atau `<= 0`** — harga poin nol berarti pesanan gratis dan itu tidak
boleh lolos. Bila semuanya sah tetapi `balance < cost`, kembalikan `saldo-kurang`.

- [ ] **Step 4: Jalankan untuk memastikan lulus**

Run: `node --experimental-strip-types scripts/check-preorder-rules.ts`
Expected: PASS, keluar 0.

- [ ] **Step 5: Tambah pemilih bayar ke `MenuCatalog`**

Di sheet checkout, di atas blok "Tukar poin", tambahkan dua pilihan: "Bayar tunai di kantin"
dan "Bayar penuh dengan poin — <cost> P". Pakai `evaluatePointsPayment` untuk status dan
alasannya. Saat opsi poin tidak tersedia, tampilkan alasannya sebagai teks 13px, bukan tombol
mati tanpa keterangan. Memilih poin menyembunyikan tier voucher dan mengubah ringkasan
menjadi Subtotal, "Dibayar dengan poin −<cost> P", "Sisa tunai Rp0".

- [ ] **Step 6: Kirim mode bayar dan pakai nilai balikan RPC**

`submitOrder` mengirim `p_payment_mode`. Pesan errornya lewat `mapOrderError`. Tiket lokal
dibangun dari nilai balikan RPC, bukan dari hitungan ulang di klien, dengan pemetaan eksplisit:
`subtotal` → `TicketData.total_price`, `discount` → `TicketData.discount_applied`, dan
`booking_code`, `status`, `payment_mode`, `points_paid` diteruskan apa adanya. `net_total`
tidak ikut disimpan karena sudah bisa dihitung dari dua kolom pertama, dan `status: "pending"`
yang hard-code dihapus.

- [ ] **Step 7: Tampilkan mode bayar di `BookingTicket`**

Untuk `payment_mode === "points"`, tampilkan "Sudah dibayar dengan poin · <points_paid> P" dan
"sisa tunai Rp0". Untuk `cash`, perilaku sekarang dipertahankan.

- [ ] **Step 8: Verifikasi di peramban**

Masuk sebagai `siswa.demo@skamuda.sch.id`. Uji tiga hal: keranjang yang memenuhi syarat bisa
dibayar poin dan ringkasannya menunjukkan Rp0; keranjang mahal menonaktifkan opsi poin sambil
menyebut alasannya; dan pesanan tunai dengan voucher tetap berperilaku seperti sebelumnya.

- [ ] **Step 9: Commit**

```bash
git add src/lib/preorder.ts scripts/check-preorder-rules.ts src/components/student/MenuCatalog.tsx src/components/student/BookingTicket.tsx
git commit -m "feat(student): pay for an order with points and trust the RPC totals"
```

---

### Task 7: Tiga keadaan halaman kantin siswa

**Files:**
- Create: `src/components/student/PreorderGate.tsx`
- Modify: `src/app/(app)/siswa/kantin/page.tsx`
- Modify: `src/components/student/StudentOrderList.tsx`

**Interfaces:**
- Consumes: `PreorderStatus` dan `TicketData` dari Task 2; `get_preorder_status` dari Task 4;
  `MenuCatalog` dari Task 6.
- Produces: `PreorderGate` dengan props
  `{ status: PreorderStatus; activeOrder: TicketData | null; children: React.ReactNode }`

- [ ] **Step 1: Ambil status pre-order di halaman**

Di `src/app/(app)/siswa/kantin/page.tsx`, panggil `supabase.rpc("get_preorder_status")` di
dalam `Promise.all` yang sudah ada, dengan `unwrap`. Bila `active_order_id` terisi, ambil
pesanan itu beserta itemnya (RLS mengizinkan membaca milik sendiri) dan susun sebagai
`TicketData`.

- [ ] **Step 2: Tulis `PreorderGate`**

Tiga keadaan yang saling meniadakan:

- `status.is_blocked` → blok `bg-danger-50` tanpa garis tepi, ikon `Ban`, judul 17px
  "Pre-Order Kantin diblokir sementara", satu kalimat penjelas, waktu aktif kembali dalam
  angka `tnum`, dan asal blokirnya. Tidak ada anak yang dirender.
- `status.active_order_id` → kartu pesanan aktif dari `activeOrder`: kode booking besar,
  badge status, slot, stand, item, total, dan selama `awaiting_approval` kalimat
  "Menunggu penjual menerima pesanan ini" plus tautan ke `/siswa/pesanan`. Tidak ada anak
  yang dirender.
- selain itu → render `children`, dan bila `status.unclaimed_count === 1` tambahkan blok
  `bg-gold-50` di atasnya berisi satu kalimat peringatan.

- [ ] **Step 3: Ketahui bahwa blokir bisa berakhir saat halaman terbuka**

Karena halaman ini server-rendered dan `revalidate = 0`, spanduk blokir tidak akan hilang
sendiri saat blokir berakhir. Tambahkan `RealtimeRefresher` untuk tabel `profiles` pada
halaman ini sehingga perubahan `preorder_blocked_until` memicu penyegaran. Ini yang menutup
Review Focus nomor 4; tanpa itu siswa terkunci secara visual sampai ia memuat ulang sendiri.

- [ ] **Step 4: Tampilkan pengembalian poin di riwayat pesanan siswa**

Di `src/components/student/StudentOrderList.tsx`, tambahkan `points_refunded` ke query dan
tampilkan baris "+<n> P dikembalikan" pada pesanan yang poinnya kembali. Label status baru
mengikuti `ORDER_STATUS_META` yang sudah diperluas di Task 2 — periksa bahwa keduanya
benar-benar muncul dan tidak jatuh ke nilai bawaan.

- [ ] **Step 5: Verifikasi di peramban**

Masuk sebagai `siswa.demo@skamuda.sch.id`. Tiga keadaan harus bisa dipaksa dan diperiksa:
bebas (katalog tampil); ada pesanan aktif (kartu pesanan aktif, tombol pesan tidak ada);
diblokir (set `preorder_blocked_until` lewat SQL Editor lalu muat ulang — spanduk merah
muncul dan tidak ada cara memesan).

- [ ] **Step 6: Commit**

```bash
git add src/components/student/PreorderGate.tsx "src/app/(app)/siswa/kantin/page.tsx" src/components/student/StudentOrderList.tsx
git commit -m "feat(student): explain the block, the active order, and the first warning"
```

---

## Fase B — Autentikasi

### Task 8: Login dan register rapi di HP

**Files:**
- Modify: `src/app/(auth)/layout.tsx`
- Modify: `src/components/auth/LoginForm.tsx`
- Modify: `src/components/auth/RegisterForm.tsx`

**Interfaces:**
- Consumes: tidak ada.
- Produces: tidak ada tipe baru.

- [ ] **Step 1: Perbaiki pemusatan dan padding di `(auth)/layout.tsx`**

Ganti pembungkus `<main>` menjadi pemusatan yang aman terhadap luapan: wadah
`min-h-dvh overflow-y-auto` di luar, lalu `my-auto` pada kartu — **bukan** `justify-center`.
Pada flex column, `justify-center` memotong bagian atas dan membuatnya tidak terjangkau
scroll begitu isi lebih tinggi dari layar; `my-auto` runtuh jadi nol saat tidak ada ruang
kosong sehingga hasil visualnya sama tetapi tidak ada elemen yang bisa hilang.

Terapkan `px-4 py-6` di bawah `sm`, dan biarkan foto tetap turun ke bawah sebagai penutup di
layar sempit.

- [ ] **Step 2: Pastikan kolom yang difokus naik ke atas keyboard**

Tambahkan jarak gulir bawah pada kolom-kolom form (`scroll-mb`) dan pastikan tidak ada
`overflow-hidden` pada rantai pembungkus yang menghalangi gulir. `dvh` dipakai, bukan `vh`,
supaya tinggi ikut menyusut saat keyboard muncul.

- [ ] **Step 3: Tambah tautan lupa password**

Di `src/components/auth/LoginForm.tsx`, tepat di bawah kolom kata sandi, tambahkan tautan
`text-[15px]` "Lupa password?" menuju `ROUTE.forgotPassword` (rutenya dibuat di Task 9).

- [ ] **Step 4: Terapkan padding yang sama di `RegisterForm`**

Form pendaftaran memakai kartu `rounded-card bg-white p-6 sm:p-8` yang sama; pastikan
paddingnya konsisten dengan login di layar sempit.

- [ ] **Step 5: Verifikasi di peramban pada lebar 360px**

Jalankan `npm run dev`, buka `/login` dan `/register` pada lebar 360px. Expected: tidak ada
isi yang terpotong di atas, halaman bisa digulir sampai dasar, dan tombol submit terjangkau.
Uji juga tinggi 560px untuk meniru keyboard terbuka.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(auth)/layout.tsx" src/components/auth/LoginForm.tsx src/components/auth/RegisterForm.tsx
git commit -m "fix(auth): centre the form without clipping it on short screens"
```

---

### Task 9: Halaman lupa password

**Files:**
- Create: `src/components/auth/ForgotPasswordForm.tsx`
- Create: `src/app/(auth)/lupa-password/page.tsx`
- Modify: `src/lib/constants.ts`
- Modify: `src/lib/supabase/middleware.ts`

**Interfaces:**
- Consumes: `(auth)` shell dari Task 8.
- Produces (dipakai Task 10): `ROUTE.forgotPassword = "/lupa-password"`,
  `ROUTE.resetPassword = "/reset-password"`, keduanya masuk `PUBLIC_PATHS`.

- [ ] **Step 1: Tambah rute dan daftar publik**

Di `src/lib/constants.ts`, tambahkan `forgotPassword` dan `resetPassword` ke `ROUTE`, dan
keduanya ke `PUBLIC_PATHS`.

- [ ] **Step 2: Pastikan `/reset-password` tidak ikut ditendang**

Di `src/lib/supabase/middleware.ts`, cabang "sudah login → arahkan ke dashboard" sekarang
mencocokkan persis `/login` dan `/register`. Tambahkan komentar eksplisit bahwa
`/reset-password` sengaja **tidak** ikut ke situ: sesi recovery adalah sesi yang sah, dan
kalau ikut, pengguna yang baru mengeklik tautan reset langsung dilempar ke dashboard sebelum
sempat mengganti sandinya.

- [ ] **Step 3: Tulis `ForgotPasswordForm`**

Satu kolom email dan satu tombol. Memanggil
`supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` })`.
Sukses maupun email yang tidak terdaftar menampilkan pesan yang sama persis — "Kalau email
itu terdaftar, tautan reset sudah dikirim" — supaya halaman ini tidak bisa dipakai menebak
email mana yang punya akun.

- [ ] **Step 4: Tulis halaman `/lupa-password`**

Judul, satu kalimat penjelas, formnya, dan tautan kembali ke `/login`.

- [ ] **Step 5: Verifikasi di peramban**

Buka `/lupa-password` tanpa login. Kirim email terdaftar dan email yang tidak ada.
Expected: pesan sukses identik untuk keduanya, dan tidak ada error mentah yang bocor.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/ForgotPasswordForm.tsx "src/app/(auth)/lupa-password/page.tsx" src/lib/constants.ts src/lib/supabase/middleware.ts
git commit -m "feat(auth): request a password reset without revealing accounts"
```

---

### Task 10: Halaman reset password

**Files:**
- Create: `src/components/auth/ResetPasswordForm.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`
- Modify: `src/lib/auth-errors.ts`
- Modify: `src/app/auth/callback/route.ts`

**Interfaces:**
- Consumes: `ROUTE.resetPassword` dan `PUBLIC_PATHS` dari Task 9; `/auth/callback` yang sudah
  menangani `type=recovery` dan meneruskan `next`.
- Produces: tidak ada tipe baru.

- [ ] **Step 1: Tulis `ResetPasswordForm`**

Dua kolom (kata sandi baru, ulangi) dengan validasi panjang minimum dan kecocokan. Memanggil
`supabase.auth.updateUser({ password })`. Setelah berhasil, panggil
`supabase.auth.signOut({ scope: "others" })` supaya sesi lama di perangkat lain ikut berakhir,
lalu arahkan ke `ROLE_HOME` sesuai peran. Pesan errornya lewat `mapAuthError`.

Bila tidak ada sesi saat komponen dipasang, jangan render formnya — render keadaan
"Tautan tidak valid atau sudah kedaluwarsa" beserta tautan ke `/lupa-password`.

- [ ] **Step 2: Tulis halaman `/reset-password`**

Halaman server tipis yang merender `ResetPasswordForm` di dalam shell `(auth)`.

- [ ] **Step 3: Arahkan kegagalan recovery ke halaman yang benar**

Di `src/app/auth/callback/route.ts`, kegagalan saat ini berakhir di
`/login?error=verifikasi` untuk semua jenis. Tambahkan cabang: bila `type === "recovery"`
(atau `next` menunjuk ke `/reset-password`), arahkan ke `/reset-password?error=kedaluwarsa`.
Tanpa ini, tautan reset yang dibuka di peramban lain — di mana code verifier PKCE tidak ada —
mendarat di halaman login dengan pesan yang tidak menjelaskan apa pun. Ini menutup Review
Focus nomor 5.

- [ ] **Step 4: Tambah pemetaan error reset**

Di `src/lib/auth-errors.ts`, tambahkan pemetaan untuk error kedaluwarsa/tidak sah dan untuk
kata sandi terlalu lemah, dalam bahasa Indonesia.

- [ ] **Step 5: Verifikasi yang bisa dilakukan tanpa email**

Buka `/reset-password` tanpa sesi. Expected: keadaan "Tautan tidak valid atau sudah
kedaluwarsa" muncul, bukan form kosong dan bukan error mentah. Buka
`/auth/callback?type=recovery&error=access_denied`. Expected: mendarat di
`/reset-password` dengan pesan kedaluwarsa, bukan di `/login`.

- [ ] **Step 6: Verifikasi yang butuh email sungguhan (butuh tangan pengguna)**

Minta pengguna menambahkan `<origin>/auth/callback` ke Redirect URLs dan memastikan template
email Recovery aktif, lalu minta satu email reset sungguhan. Buka tautannya di peramban yang
sama: form ganti sandi muncul, sandi baru tersimpan, dan login dengan sandi baru berhasil.
Buka tautan kedua di peramban berbeda: harus muncul keadaan kedaluwarsa, bukan lemparan diam
ke `/login`. Catat hasilnya; task ini belum selesai sebelum ini lulus.

- [ ] **Step 7: Commit**

```bash
git add src/components/auth/ResetPasswordForm.tsx "src/app/(auth)/reset-password/page.tsx" src/lib/auth-errors.ts src/app/auth/callback/route.ts
git commit -m "feat(auth): set a new password, and explain expired links"
```

---

## Fase C — Animasi

### Task 11: framer-motion, reduced motion, dan micro-interaction tekan

**Files:**
- Modify: `package.json`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/ui/Sheet.tsx`
- Modify: `src/components/ui/ConfirmDialog.tsx`
- Modify: `src/components/ui/Toast.tsx`
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/student/MenuCatalog.tsx`

**Interfaces:**
- Consumes: `Sheet`, `ConfirmDialog`, `Toast` dari Task 4 dan 5.
- Produces: `MotionConfig` di root layout; `Sheet`, `ConfirmDialog`, dan `Toast` beranimasi.

- [ ] **Step 1: Pasang dependensi dan ukur bundel sebelum**

Run: `npm run build`, catat ukuran First Load JS untuk `/kantin`, `/siswa/kantin`, dan `/login`.
Lalu `npm install framer-motion@^12`.
Expected: instalasi berhasil dengan React 19 dan Next 15. Bila peer-dependency bentrok,
ganti ke paket `motion` dan catat perubahan namanya di ringkasan commit.

- [ ] **Step 2: Pasang `MotionConfig` di root**

Di `src/app/layout.tsx`, bungkus isinya dengan `<MotionConfig reducedMotion="user">`. Satu
baris ini membuat seluruh animasi framer-motion menghormati setelan sistem, tanpa perlu
memeriksa preferensi di tiap komponen.

- [ ] **Step 3: Beri animasi masuk dan keluar pada Sheet, ConfirmDialog, dan Toast**

Bungkus isinya dengan `AnimatePresence` dan animasi fade + scale kecil. Ini satu-satunya
tempat framer-motion benar-benar mengalahkan CSS, karena butuh animasi keluar. Pastikan
fokus dan Escape yang sudah ada tetap berjalan — uji dengan Tab dan Escape.

- [ ] **Step 4: Tambah efek tekan**

`active:scale-95 transition-transform duration-150` pada tombol CTA di `Button`, tombol tambah
menu di `MenuCatalog`, dan pill filter. Tombol yang sedang `disabled` tidak boleh bergerak.

- [ ] **Step 5: Verifikasi reduced motion**

Di peramban, aktifkan emulasi `prefers-reduced-motion: reduce`. Expected: tidak ada
perpindahan skala atau gerak yang tersisa selain perubahan warna; Sheet dan Toast tetap
muncul dan hilang, hanya tanpa gerak.

- [ ] **Step 6: Ukur bundel sesudah dan putuskan**

Run: `npm run build`. Bandingkan dengan Step 1. Bila kenaikannya berarti pada `/login` atau
`/siswa/kantin`, muat dinamis komponen yang bukan kebutuhan layar pertama
(`next/dynamic`), lalu ukur ulang. Catat angkanya di ringkasan commit.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/app/layout.tsx src/components/ui src/components/student/MenuCatalog.tsx
git commit -m "feat(motion): respect reduced motion and add press feedback"
```

---

### Task 12: Stagger, shimmer, count-up, dan pulse badge

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/components/ui/Skeleton.tsx`
- Modify: `src/components/student/MenuCatalog.tsx`
- Modify: `src/app/(app)/siswa/page.tsx`
- Modify: `src/components/ui/Badge.tsx`
- Modify: `src/components/vendor/OrderBoard.tsx`
- Modify: `src/components/student/StudentOrderList.tsx`
- Create: `src/lib/use-count-up.ts`

**Interfaces:**
- Consumes: `MotionConfig` dan framer-motion dari Task 11; `ORDER_STATUS_META` dari Task 2.
- Produces:
  - `export function useCountUp(value: number, options?: { durationMs?: number }): number`
  - `Badge` bertambah prop opsional `pulse?: boolean`

- [ ] **Step 1: Tambah keyframe shimmer**

Di `tailwind.config.ts` tambahkan keyframe dan animation `shimmer` (gradien bergerak). Karena
ini mengubah `theme.extend`, **restart server dev** sebelum memeriksa hasilnya.

- [ ] **Step 2: Pakai shimmer di `Skeleton`**

Ganti denyut biasa dengan sapuan shimmer. Tetap inert saat `prefers-reduced-motion: reduce`.

- [ ] **Step 3: Masuk bertahap untuk daftar menu dan kartu statistik**

Beri kartu menu di `MenuCatalog` dan kartu statistik di dashboard siswa kemunculan bertahap
dengan framer-motion. **Jangan** memberi framer-motion pada elemen yang sudah memakai `.reveal`
yang scroll-driven — satu elemen tidak boleh punya dua animasi. `.reveal` tetap milik bagian
publik yang jauh di bawah garis lipatan.

- [ ] **Step 4: Tulis `useCountUp`**

Hook kecil di atas `animate()` dari framer-motion yang mengembalikan angka menuju nilai
target. Saat reduced motion aktif, langsung kembalikan nilai target tanpa animasi.

- [ ] **Step 5: Pakai count-up pada saldo poin**

Di dashboard siswa, angka saldo naik dari nilai lama ke nilai baru ketika poin baru
dikreditkan petugas. Nilainya harus tetap terbaca benar oleh pembaca layar: teks akhirnya
adalah angka sungguhan, bukan potongan animasi.

- [ ] **Step 6: Tambah pulse pada badge status**

Tambahkan prop `pulse?: boolean` pada `src/components/ui/Badge.tsx`, yang merender satu titik
kecil beranimasi di dalam badge. Lalu set prop itu dari `OrderBoard` dan `StudentOrderList`
untuk status `processing` dan `ready_for_pickup`. Pulse hanya pada **titik kecil di dalam**
badge, bukan seluruh badge: badge yang berdenyut penuh bersama teksnya sulit dibaca. Lembut,
lambat, dan berhenti untuk reduced-motion.

- [ ] **Step 7: Verifikasi**

`npx tsc --noEmit` keluar 0, `npm run build` berhasil, dan di peramban daftar menu masuk
bertahap sekali saja (bukan dua kali beruntun), shimmer halus, dan angka saldo berakhir tepat
di nilai sebenarnya.

- [ ] **Step 8: Commit**

```bash
git add tailwind.config.ts src/components/ui/Skeleton.tsx src/components/ui/Badge.tsx src/components/student/MenuCatalog.tsx src/components/student/StudentOrderList.tsx src/components/vendor/OrderBoard.tsx "src/app/(app)/siswa/page.tsx" src/lib/use-count-up.ts
git commit -m "feat(motion): stagger entries, shimmer skeletons, and count up balances"
```

---

## Verifikasi Akhir

Dijalankan setelah seluruh task selesai.

- [ ] `npx tsc --noEmit` keluar 0.
- [ ] `npm run build` berhasil dan seluruh rute terkompilasi.
- [ ] `node --experimental-strip-types scripts/check-preorder-rules.ts` keluar 0.
- [ ] Ketiga skrip SQL di `supabase/tests/` menghasilkan nol `GAGAL:`.
- [ ] Migrasi 002 dan 003 dijalankan dua kali tanpa error.
- [ ] E2E alur normal: pesan → Terima → Siap → Selesai, sebagai tiga peran berbeda.
- [ ] E2E alur penalti: tolak → poin kembali; pesan lagi → Tidak Diambil dua kali → poin
      hangus pada yang kedua, spanduk blokir muncul, tombol pesan hilang.
- [ ] Inspector anti-slop pada `/`, `/papan-skor`, `/login`, `/lupa-password`,
      `/reset-password`, `/siswa/kantin`, dan `/kantin`: 0 FAIL.
- [ ] Screenshot `/login` pada lebar 360px dan tinggi 560px.
- [ ] `git log` bersih, `.env.local` tidak pernah ikut ter-commit.

## Yang Butuh Tangan Pengguna

1. Tambahkan `<origin>/auth/callback` ke Supabase → Authentication → URL Configuration →
   Redirect URLs.
2. Pastikan Supabase → Authentication → Email Templates → Reset Password aktif.
3. Tempel skrip SQL ke SQL Editor (kecuali Anda memberi saya connection string), atau beri
   saya Session pooler connection string supaya saya bisa menjalankannya sendiri.
