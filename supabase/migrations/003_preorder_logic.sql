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

-- -----------------------------------------------------------------------------
-- 4. vendor_resolve_order — satu-satunya jalan penjual mengubah status pesanan
-- -----------------------------------------------------------------------------
-- Sejak policy `orders_vendor_update` dicabut (bagian 6), penjual tidak bisa
-- lagi menulis langsung ke tabel. Semua perpindahan status lewat sini, dan di
-- sini pula aturannya ditegakkan: siapa yang boleh, transisi mana yang sah, dan
-- poin siapa yang kembali.
--
-- Kenapa aturannya di database, bukan di klien: anon key dibagikan ke peramban
-- dan siswa memegang token yang sah. Aturan yang hanya hidup di komponen React
-- atau di Server Action bisa dilewati siapa pun yang punya keduanya. Kalimat
-- yang sama berlaku untuk place_order di bagian 3.
create or replace function public.vendor_resolve_order(p_order_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_role    public.user_role;
  v_order   public.orders;
  v_owner   uuid;
  v_next    public.order_status;
  v_refund  integer := 0;
  v_count   integer := 0;
  v_blocked timestamptz;
begin
  if v_uid is null then
    raise exception 'Harus login terlebih dahulu.';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'canteen_vendor' then
    raise exception 'Hanya penjual kantin yang dapat mengelola pesanan.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  -- security definer melewati RLS, jadi kepemilikan wajib diperiksa di sini.
  -- Tanpa pemeriksaan ini, penjual mana pun bisa mengubah pesanan stand siapa
  -- pun — cukup menebak satu uuid.
  select s.vendor_id into v_owner
  from public.canteen_stands s
  where s.id = v_order.stand_id;

  if v_owner is null or v_owner <> v_uid then
    raise exception 'Pesanan ini bukan milik stand kamu.';
  end if;

  -- Transisi yang sah. Selain ini ditolak PZ005, termasuk mengulang aksi yang
  -- sama dua kali: menandai "tidak diambil" pada pesanan yang sudah ditandai
  -- tidak boleh menambah hitungan pelanggaran dua kali.
  if p_action = 'accept' then
    if v_order.status <> 'awaiting_approval' then
      raise exception 'Pesanan ini sudah tidak menunggu diterima.' using errcode = 'PZ005';
    end if;
    v_next := 'processing';

  elsif p_action = 'ready' then
    if v_order.status <> 'processing' then
      raise exception 'Pesanan ini belum masuk penyiapan.' using errcode = 'PZ005';
    end if;
    v_next := 'ready_for_pickup';

  elsif p_action = 'complete' then
    if v_order.status not in ('processing', 'ready_for_pickup') then
      raise exception 'Pesanan ini tidak bisa diselesaikan dari status sekarang.' using errcode = 'PZ005';
    end if;
    v_next := 'completed';

  elsif p_action = 'reject' then
    if v_order.status <> 'awaiting_approval' then
      raise exception 'Pesanan yang sudah diterima tidak bisa ditolak lagi.' using errcode = 'PZ005';
    end if;
    v_next := 'cancelled';

  elsif p_action = 'unclaimed' then
    if v_order.status <> 'ready_for_pickup' then
      raise exception 'Hanya pesanan yang siap diambil bisa ditandai tidak diambil.' using errcode = 'PZ005';
    end if;
    v_next := 'unclaimed';

  else
    raise exception 'Aksi tidak dikenal: %.', p_action;
  end if;

  update public.orders set status = v_next where id = v_order.id
  returning * into v_order;

  -- Poin kembali penuh saat penjual menolak, dan saat pelanggaran pertama.
  -- Pelanggaran kedua menghanguskan poin sekaligus memasang blokir 3 hari:
  -- pelanggaran pertama dimaafkan, pelanggaran kedua tidak.
  if v_next = 'cancelled' then
    v_refund := v_order.points_paid;

  elsif v_next = 'unclaimed' then
    select coalesce(p.unclaimed_orders_count, 0) into v_count
    from public.profiles p
    where p.id = v_order.student_id;

    if v_count = 0 then
      v_refund  := v_order.points_paid;
      v_count   := 1;
      v_blocked := null;
    else
      v_refund  := 0;
      v_count   := v_count + 1;
      v_blocked := now() + interval '3 days';
    end if;
  end if;

  if v_next in ('cancelled', 'unclaimed') then
    perform set_config('app.allow_profile_system_update', 'on', true);

    if v_next = 'unclaimed' then
      update public.profiles
         set points_balance = points_balance + v_refund,
             unclaimed_orders_count = v_count,
             preorder_blocked_until = v_blocked
       where id = v_order.student_id;
    else
      update public.profiles
         set points_balance = points_balance + v_refund
       where id = v_order.student_id;
    end if;
  end if;

  if v_refund > 0 then
    update public.orders
       set points_refunded = points_refunded + v_refund
     where id = v_order.id
    returning * into v_order;

    -- Jejak voucher: yang dikembalikan tidak boleh menghilang tanpa catatan.
    update public.vouchers
       set refunded_at = now()
     where order_id = v_order.id and refunded_at is null;
  end if;

  -- Dibaca ulang setelah semua perubahan supaya balikannya mencerminkan keadaan
  -- sesudah, bukan sebelum.
  select coalesce(p.unclaimed_orders_count, 0), p.preorder_blocked_until
    into v_count, v_blocked
  from public.profiles p
  where p.id = v_order.student_id;

  return jsonb_build_object(
    'order_id', v_order.id,
    'status', v_order.status,
    'points_refunded', v_order.points_refunded,
    'unclaimed_count', v_count,
    'blocked_until', v_blocked
  );
end $$;

-- -----------------------------------------------------------------------------
-- 5. get_preorder_status — keadaan pre-order siswa yang sedang login
-- -----------------------------------------------------------------------------
-- Dipakai halaman kantin siswa untuk memutuskan mana dari tiga tampilan yang
-- harus muncul: blokir, ada pesanan aktif, atau bebas memesan. Sengaja TIDAK
-- mengembalikan points_balance: saldo sudah dibaca dari tabel profil, dan dua
-- sumber untuk satu angka cepat atau lambat akan berbeda.
create or replace function public.get_preorder_status()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profiles;
  v_active  public.orders;
begin
  if v_uid is null then
    raise exception 'Harus login terlebih dahulu.';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'Profil tidak ditemukan.';
  end if;

  -- Reset malas, sama seperti di place_order: satu-satunya dua tempat yang
  -- boleh menyimpulkan blokir sudah lewat. Tanpa cron, dan tanpa kolom yang
  -- perlu dirapikan orang lain — hitungannya dirapikan saat ada yang melihat.
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

  select * into v_active
  from public.orders
  where student_id = v_uid
    and status in ('awaiting_approval', 'processing', 'ready_for_pickup')
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'is_blocked', v_profile.preorder_blocked_until is not null,
    'blocked_until', v_profile.preorder_blocked_until,
    'unclaimed_count', v_profile.unclaimed_orders_count,
    'active_order_id', v_active.id,
    'active_order_status', v_active.status,
    'active_booking_code', v_active.booking_code
  );
end $$;

-- -----------------------------------------------------------------------------
-- 6. Cabut jalan lama
-- -----------------------------------------------------------------------------
-- Policy ini dulu memberi penjual hak `update` langsung ke tabel orders, tanpa
-- aturan transisi apa pun: dari 'pending' bisa langsung ke 'completed', atau
-- ke 'cancelled' dengan poin yang tidak pernah kembali. Setelah pengelolaan
-- pindah ke vendor_resolve_order, policy ini dicabut supaya tidak ada jalan
-- belakang yang melewati aturannya.
--
-- Penjual tetap bisa MEMBACA pesanannya lewat orders_vendor_read; yang dicabut
-- hanya kemampuan menulis langsung.
drop policy if exists orders_vendor_update on public.orders;

-- Fungsi security definer: cukup untuk peran yang sudah login.
revoke execute on function public.vendor_resolve_order(uuid, text) from public, anon;
grant execute on function public.vendor_resolve_order(uuid, text) to authenticated;
revoke execute on function public.get_preorder_status() from public, anon;
grant execute on function public.get_preorder_status() to authenticated;
