-- =============================================================================
-- 003 — Aturan pre-order
-- =============================================================================
-- Isinya tiga hal:
--   1. Status awal pesanan baru berubah dari 'pending' ke 'awaiting_approval'.
--      Pesanan baru harus diterima penjual lebih dulu.
--   2. Index unik parsial: maksimal satu pesanan aktif per siswa.
--   3. place_order v2: menolak siswa terblokir, menolak pesanan aktif kedua,
--      dan bisa melunasi pesanan penuh dengan poin.
--
-- Berkas ini AMAN memakai nilai enum baru karena 002 sudah menambahkannya di
-- transaksi terpisah. Jangan gabungkan 002 dan 003 jadi satu tempelan: Postgres
-- menolak memakai nilai enum di transaksi yang sama dengan saat nilai itu
-- ditambahkan.
--
-- Idempoten: aman dijalankan berulang kali.

-- -----------------------------------------------------------------------------
-- 1. Status awal pesanan baru
-- -----------------------------------------------------------------------------
alter table public.orders alter column status set default 'awaiting_approval';

-- -----------------------------------------------------------------------------
-- 2. Maksimal satu pesanan aktif per siswa
-- -----------------------------------------------------------------------------
-- Invarian ini SENGAJA ditegakkan database, bukan oleh pengecekan di dalam RPC.
-- Pengecekan `select ... where status in (...)` bisa kalah balapan: dua
-- permintaan checkout yang datang bersamaan sama-sama membaca "belum ada
-- pesanan aktif", lalu keduanya menyisipkan. Index unik parsial membuat yang
-- kedua ditolak database, apa pun yang dilakukan klien dan RPC-nya.
--
-- Pesanan yang sudah selesai/ditolak/tidak diambil tidak masuk index, jadi
-- siswa bisa memesan lagi setelah pesanan sebelumnya usai.
create unique index if not exists orders_one_active_per_student
  on public.orders (student_id)
  where status in ('awaiting_approval', 'processing', 'ready_for_pickup');

-- -----------------------------------------------------------------------------
-- 3. place_order v2
-- -----------------------------------------------------------------------------
-- Overload lama (lima argumen) dibuang lebih dulu. Tanpa ini, versi lima dan
-- enam argumen hidup berdampingan, dan pemanggilan dengan lima argumen jadi
-- ambigu — PostgREST akan menolaknya dengan "function is not unique".
drop function if exists public.place_order(uuid, text, text, jsonb, integer);
drop function if exists public.place_order(uuid, text, text, jsonb, integer, text);

create function public.place_order(
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
as $$
declare
  v_uid         uuid := auth.uid();
  v_profile     public.profiles;
  v_subtotal    integer := 0;
  v_discount    integer := 0;
  v_tier        public.voucher_tiers;
  v_order       public.orders;
  v_active      public.orders;
  v_requested   integer;
  v_valid       integer;
  v_missing     integer;
  v_points_cost integer := 0;
  v_points_paid integer := 0;
  v_mode        text;
  v_constraint  text;
begin
  if v_uid is null then
    raise exception 'Harus login terlebih dahulu.';
  end if;

  -- Kunci baris profil. Inilah yang membuat dua checkout bersamaan dari siswa
  -- yang sama berjalan berurutan, bukan bersamaan.
  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'Profil tidak ditemukan.';
  end if;
  if v_profile.role <> 'student' then
    raise exception 'Hanya siswa yang dapat membuat pesanan.';
  end if;

  -- Reset malas: blokir yang sudah lewat dibersihkan saat barisnya disentuh.
  -- Tanpa cron, dan tanpa kolom yang perlu dirapikan orang lain.
  if v_profile.preorder_blocked_until is not null
     and v_profile.preorder_blocked_until <= now() then
    perform set_config('app.allow_profile_system_update', 'on', true);
    update public.profiles
       set unclaimed_orders_count = 0,
           preorder_blocked_until = null
     where id = v_uid
    returning * into v_profile;
    perform set_config('app.allow_profile_system_update', 'off', true);
  end if;

  if v_profile.preorder_blocked_until is not null then
    raise exception 'Pre-Order Kantin kamu diblokir sampai %.',
      to_char(v_profile.preorder_blocked_until, 'DD-MM-YYYY HH24:MI')
      using errcode = 'PZ001';
  end if;

  select * into v_active
  from public.orders
  where student_id = v_uid
    and status in ('awaiting_approval', 'processing', 'ready_for_pickup')
  limit 1;
  if found then
    raise exception 'Masih ada pesanan yang belum selesai (%).', v_active.booking_code
      using errcode = 'PZ002';
  end if;

  if p_slot not in ('Istirahat 1', 'Istirahat 2') then
    raise exception 'Slot pengambilan tidak valid.';
  end if;

  if not exists (select 1 from public.canteen_stands where id = p_stand_id and is_active) then
    raise exception 'Stand kantin tidak aktif.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang masih kosong.';
  end if;

  -- Semua item harus milik stand ini dan tersedia.
  select count(*) into v_requested
  from jsonb_array_elements(p_items) e;

  select count(*) into v_valid
  from jsonb_array_elements(p_items) e
  join public.menu_items mi on mi.id = (e ->> 'menu_item_id')::uuid
  where mi.stand_id = p_stand_id and mi.is_available;

  if v_requested <> v_valid then
    raise exception 'Ada menu yang tidak tersedia di stand ini.';
  end if;

  select coalesce(sum(mi.price_idr * greatest((e ->> 'quantity')::int, 0)), 0)
    into v_subtotal
  from jsonb_array_elements(p_items) e
  join public.menu_items mi on mi.id = (e ->> 'menu_item_id')::uuid;

  if v_subtotal <= 0 then
    raise exception 'Total pesanan tidak valid.';
  end if;

  -- --------------------------------------------------------------- mode bayar
  if p_payment_mode = 'cash' then
    -- Perilaku voucher lama, tidak berubah: bayar tunai di kantin, poin
    -- dipakai sebagai potongan harga.
    if p_voucher_points is not null and p_voucher_points > 0 then
      select * into v_tier from public.voucher_tiers
      where points_cost = p_voucher_points and is_active;
      if not found then
        raise exception 'Tier voucher tidak valid.';
      end if;
      if v_profile.points_balance < p_voucher_points then
        raise exception 'Saldo poin tidak cukup untuk voucher ini.' using errcode = 'PZ003';
      end if;
      v_discount := least(v_tier.discount_idr, v_subtotal);
    end if;
    v_mode := 'cash';
    v_points_paid := coalesce(p_voucher_points, 0);

  elsif p_payment_mode = 'points' then
    -- Setiap baris wajib punya harga poin yang positif. Tanpa syarat ini, menu
    -- berharga poin NULL atau 0 ikut terhitung nol dan pesanannya jadi gratis —
    -- persis celah yang fitur ini tutup.
    select count(*) into v_missing
    from jsonb_array_elements(p_items) e
    join public.menu_items mi on mi.id = (e ->> 'menu_item_id')::uuid
    where mi.points_price is null or mi.points_price <= 0;

    if v_missing > 0 then
      raise exception 'Ada menu yang belum punya harga poin.' using errcode = 'PZ004';
    end if;

    select coalesce(sum(mi.points_price * greatest((e ->> 'quantity')::int, 0)), 0)
      into v_points_cost
    from jsonb_array_elements(p_items) e
    join public.menu_items mi on mi.id = (e ->> 'menu_item_id')::uuid;

    if v_points_cost <= 0 then
      raise exception 'Total poin pesanan tidak valid.' using errcode = 'PZ004';
    end if;

    if v_profile.points_balance < v_points_cost then
      raise exception 'Saldo poin tidak cukup untuk pesanan ini.' using errcode = 'PZ003';
    end if;

    -- Lunas: tidak ada sisa yang dibayar di kantin.
    v_discount := v_subtotal;
    v_mode := 'points';
    v_points_paid := v_points_cost;

  else
    -- Hanya terjangkau kalau kliennya salah. Sengaja tanpa kode PZ: ini bukan
    -- kesalahan yang bisa diperbaiki siswa, dan memakai PZ004 akan
    -- menampilkan pesan "menu tanpa harga poin" yang menyesatkan.
    raise exception 'Mode pembayaran tidak dikenal: %.', p_payment_mode;
  end if;

  -- ------------------------------------------------------------------ pesanan
  begin
    insert into public.orders (student_id, stand_id, pickup_time_slot, total_price,
                               discount_applied, notes, status, payment_mode, points_paid)
    values (v_uid, p_stand_id, p_slot, v_subtotal, v_discount,
            nullif(trim(coalesce(p_notes, '')), ''), 'awaiting_approval',
            v_mode, v_points_paid)
    returning * into v_order;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'orders_one_active_per_student' then
      -- Balapan yang lolos dari pemeriksaan di atas, ditangkap di sini supaya
      -- kliennya tetap menerima kode yang sama dengan jalur biasa.
      raise exception 'Masih ada pesanan yang belum selesai.' using errcode = 'PZ002';
    end if;
    -- Tabrakan booking_code: bukan urusan aturan ini, biarkan naik apa adanya.
    raise;
  end;

  -- Poin dipotong setelah pesanan ada, supaya jejaknya bisa dicatat sekalian.
  if v_points_paid > 0 then
    perform set_config('app.allow_profile_system_update', 'on', true);
    update public.profiles
       set points_balance = points_balance - v_points_paid
     where id = v_uid
    returning * into v_profile;

    -- Voucher hanya dicatat kalau memang ada voucher. Melunasi penuh dengan
    -- poin bukan pemakaian voucher, jadi tidak dibuatkan barisnya.
    if v_mode = 'cash' then
      insert into public.vouchers (student_id, discount_amount, points_spent, is_used,
                                   code, used_at, order_id)
      values (v_uid, v_discount, v_points_paid, true,
              'VCR-' || public.random_code(6), now(), v_order.id);
    end if;
  end if;

  insert into public.order_items (order_id, menu_item_id, quantity, unit_price, item_notes)
  select v_order.id,
         mi.id,
         greatest((e ->> 'quantity')::int, 1),
         mi.price_idr,
         nullif(trim(coalesce(e ->> 'item_notes', '')), '')
  from jsonb_array_elements(p_items) e
  join public.menu_items mi on mi.id = (e ->> 'menu_item_id')::uuid;

  return jsonb_build_object(
    'order_id', v_order.id,
    'booking_code', v_order.booking_code,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'net_total', v_subtotal - v_discount,
    'points_left', v_profile.points_balance,
    'status', v_order.status,
    'payment_mode', v_order.payment_mode,
    'points_paid', v_order.points_paid
  );
end $$;

-- Fungsi security definer: cukup untuk peran yang sudah login.
revoke execute on function public.place_order(uuid, text, text, jsonb, integer, text) from public, anon;
grant execute on function public.place_order(uuid, text, text, jsonb, integer, text) to authenticated;
