-- =============================================================================
-- SKAMUDA EcoHub - Production Live Schema
-- Ekosistem digital SMKN 1 Murung Pudak
--   Bank Sampah berbasis poin + Pre-Order Kantin Pintar
--
-- Jalankan di Supabase SQL Editor (atau `supabase db push`) SEBELUM seed.sql.
-- Berisi: enum, tabel, relasi, index, trigger, Row Level Security, dan RPC
-- atomik untuk setoran sampah & checkout kantin.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('student', 'waste_officer', 'canteen_vendor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'processing', 'ready_for_pickup', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 2. TABEL REFERENSI (roster kelas & konfigurasi) - agar UI tidak hardcode nilai
-- -----------------------------------------------------------------------------

-- Roster kelas resmi. Dapat diubah kapan saja lewat Supabase; UI membacanya live.
create table if not exists public.classes (
  name    text primary key,
  grade   text not null check (grade in ('X', 'XI', 'XII')),
  jurusan text not null check (jurusan in ('TKJ', 'TKR', 'MAPER', 'HOTEL', 'ASKEP', 'FARMASI')),
  rombel  smallint not null default 1
);

-- Jenis sampah + nilai poin per kg (sumber dropdown form petugas bank sampah).
create table if not exists public.waste_item_types (
  code          text primary key,
  label         text not null,
  unit_label    text not null default 'kg',
  points_per_kg integer not null check (points_per_kg >= 0),
  is_active     boolean not null default true
);

-- Tingkat penukaran poin -> potongan rupiah (sumber opsi voucher di checkout).
create table if not exists public.voucher_tiers (
  points_cost  integer primary key check (points_cost > 0),
  discount_idr integer not null check (discount_idr > 0),
  label        text not null,
  is_active    boolean not null default true
);

-- -----------------------------------------------------------------------------
-- 3. PROFILES  (1:1 dengan auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null,
  class_name        text references public.classes(name) on update cascade,
  role              public.user_role not null default 'student',
  points_balance    integer not null default 0 check (points_balance >= 0),
  total_recycled_kg numeric(10, 2) not null default 0 check (total_recycled_kg >= 0),
  qr_code_token     uuid not null default gen_random_uuid() unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists profiles_class_name_idx on public.profiles (class_name);
create index if not exists profiles_role_idx       on public.profiles (role);

-- -----------------------------------------------------------------------------
-- 4. CANTEEN STANDS & MENU
-- -----------------------------------------------------------------------------
create table if not exists public.canteen_stands (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references public.profiles(id) on delete cascade,
  stand_name  text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists canteen_stands_vendor_idx on public.canteen_stands (vendor_id);
create index if not exists canteen_stands_active_idx on public.canteen_stands (is_active);

create table if not exists public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  stand_id     uuid not null references public.canteen_stands(id) on delete cascade,
  name         text not null,
  price_idr    integer not null check (price_idr >= 0),
  points_price integer check (points_price >= 0),
  category     text not null default 'Makanan',
  image_url    text,
  is_available boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists menu_items_stand_idx on public.menu_items (stand_id, is_available);

-- -----------------------------------------------------------------------------
-- 5. WASTE DEPOSITS (ledger setoran sampah)
-- -----------------------------------------------------------------------------
create table if not exists public.waste_deposits (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  officer_id    uuid references public.profiles(id) on delete set null,
  item_type     text not null references public.waste_item_types(code),
  quantity      numeric(10, 2) not null default 1 check (quantity > 0),
  weight_kg     numeric(10, 2) not null check (weight_kg > 0),
  points_earned integer not null check (points_earned >= 0),
  created_at    timestamptz not null default now()
);
create index if not exists waste_deposits_student_idx on public.waste_deposits (student_id, created_at desc);
create index if not exists waste_deposits_created_idx on public.waste_deposits (created_at desc);

-- -----------------------------------------------------------------------------
-- 6. VOUCHERS (ledger penukaran poin)
-- -----------------------------------------------------------------------------
create table if not exists public.vouchers (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  discount_amount integer not null check (discount_amount > 0),
  points_spent    integer not null check (points_spent > 0),
  is_used         boolean not null default false,
  code            text not null unique,
  created_at      timestamptz not null default now(),
  used_at         timestamptz
);
create index if not exists vouchers_student_idx on public.vouchers (student_id);

-- -----------------------------------------------------------------------------
-- 7. ORDERS & ORDER ITEMS
--   total_price     = subtotal kotor item (IDR)
--   discount_applied = potongan dari voucher (IDR)
--   dibayar saat ambil = total_price - discount_applied
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.profiles(id) on delete cascade,
  stand_id         uuid not null references public.canteen_stands(id) on delete restrict,
  booking_code     text not null unique,
  pickup_time_slot text not null check (pickup_time_slot in ('Istirahat 1', 'Istirahat 2')),
  total_price      integer not null check (total_price >= 0),
  discount_applied integer not null default 0 check (discount_applied >= 0),
  status           public.order_status not null default 'pending',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_stand_status_idx on public.orders (stand_id, status);
create index if not exists orders_student_idx      on public.orders (student_id, created_at desc);
create index if not exists orders_booking_idx       on public.orders (booking_code);

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  quantity     integer not null check (quantity > 0),
  unit_price   integer not null check (unit_price >= 0),
  item_notes   text
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- -----------------------------------------------------------------------------
-- 8. HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Kode acak tanpa karakter ambigu (0/O, 1/I).
create or replace function public.random_code(p_len integer default 4)
returns text
language sql
volatile
as $$
  select coalesce(string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (random() * 32)::int + 1, 1), ''), '')
  from generate_series(1, p_len);
$$;

-- Role user yang sedang login (security definer: hindari rekursi RLS pada profiles).
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- 9. TRIGGERS
-- -----------------------------------------------------------------------------

-- updated_at otomatis.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Booking code otomatis: SKM-I1-XXXX (Istirahat 1) / SKM-I2-XXXX (Istirahat 2).
create or replace function public.set_booking_code()
returns trigger
language plpgsql
as $$
begin
  if new.booking_code is null or new.booking_code = '' then
    new.booking_code :=
      'SKM-' ||
      case new.pickup_time_slot when 'Istirahat 1' then 'I1' else 'I2' end ||
      '-' || public.random_code(4);
  end if;
  return new;
end $$;

drop trigger if exists orders_booking_code on public.orders;
create trigger orders_booking_code before insert on public.orders
  for each row execute function public.set_booking_code();

-- Buat profile otomatis saat user baru mendaftar.
-- Pendaftaran publik HANYA untuk siswa; role dari metadata diabaikan (selalu student).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, class_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'class_name', ''),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cegah user mengubah role / saldo / token miliknya sendiri.
-- RPC sistem (security definer) menandai transaksi dengan set_config agar lolos guard ini.
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
          or new.qr_code_token is distinct from old.qr_code_token) then
    raise exception 'Field role/saldo/token hanya dapat diubah oleh sistem.';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.prevent_profile_escalation();

-- -----------------------------------------------------------------------------
-- 10. RPC ATOMIC
-- -----------------------------------------------------------------------------

-- Lookup siswa dari QR token (dipakai petugas sebelum memproses setoran).
create or replace function public.lookup_student_by_token(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v public.profiles;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'waste_officer') then
    raise exception 'Hanya petugas bank sampah yang dapat memindai.';
  end if;

  select * into v from public.profiles where qr_code_token = p_token and role = 'student';
  if not found then
    raise exception 'QR tidak dikenali atau bukan milik siswa.';
  end if;

  return jsonb_build_object(
    'id', v.id,
    'full_name', v.full_name,
    'class_name', v.class_name,
    'points_balance', v.points_balance,
    'total_recycled_kg', v.total_recycled_kg
  );
end $$;

-- Proses satu setoran: hitung poin, catat ledger, kredit saldo + kg, secara atomik.
create or replace function public.process_waste_deposit(
  p_qr_token  uuid,
  p_item_type text,
  p_quantity  numeric,
  p_weight_kg numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.profiles;
  v_rate    integer;
  v_label   text;
  v_points  integer;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'waste_officer') then
    raise exception 'Hanya petugas bank sampah yang dapat memproses setoran.';
  end if;

  if p_weight_kg is null or p_weight_kg <= 0 then
    raise exception 'Berat harus lebih dari 0 kg.';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    p_quantity := 1;
  end if;

  select label, points_per_kg into v_label, v_rate
  from public.waste_item_types where code = p_item_type and is_active;
  if v_rate is null then
    raise exception 'Jenis sampah tidak valid.';
  end if;

  -- Kunci baris siswa supaya dua petugas tidak mengkredit bersamaan.
  select * into v_student from public.profiles
  where qr_code_token = p_qr_token and role = 'student'
  for update;
  if not found then
    raise exception 'QR tidak dikenali atau bukan milik siswa.';
  end if;

  v_points := floor(v_rate * p_weight_kg)::integer;
  if v_points < 0 then v_points := 0; end if;

  insert into public.waste_deposits (student_id, officer_id, item_type, quantity, weight_kg, points_earned)
  values (v_student.id, auth.uid(), p_item_type, p_quantity, p_weight_kg, v_points);

  -- Tandai sebagai update sistem agar lolos guard profil.
  perform set_config('app.allow_profile_system_update', 'on', true);

  update public.profiles
     set points_balance    = points_balance + v_points,
         total_recycled_kg = total_recycled_kg + p_weight_kg
   where id = v_student.id
  returning * into v_student;

  return jsonb_build_object(
    'student_id', v_student.id,
    'full_name', v_student.full_name,
    'class_name', v_student.class_name,
    'item_label', v_label,
    'points_earned', v_points,
    'points_balance', v_student.points_balance,
    'total_recycled_kg', v_student.total_recycled_kg
  );
end $$;

-- Checkout kantin: validasi menu, potong poin voucher, buat order + item, atomik.
create or replace function public.place_order(
  p_stand_id       uuid,
  p_slot           text,
  p_notes          text,
  p_items          jsonb,
  p_voucher_points integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_profile   public.profiles;
  v_subtotal  integer := 0;
  v_discount  integer := 0;
  v_tier      public.voucher_tiers;
  v_order     public.orders;
  v_requested integer;
  v_valid     integer;
begin
  if v_uid is null then
    raise exception 'Harus login terlebih dahulu.';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'Profil tidak ditemukan.';
  end if;
  if v_profile.role <> 'student' then
    raise exception 'Hanya siswa yang dapat membuat pesanan.';
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

  if p_voucher_points is not null and p_voucher_points > 0 then
    select * into v_tier from public.voucher_tiers
    where points_cost = p_voucher_points and is_active;
    if not found then
      raise exception 'Tier voucher tidak valid.';
    end if;
    if v_profile.points_balance < p_voucher_points then
      raise exception 'Saldo poin tidak cukup untuk voucher ini.';
    end if;

    v_discount := least(v_tier.discount_idr, v_subtotal);

    insert into public.vouchers (student_id, discount_amount, points_spent, is_used, code, used_at)
    values (v_uid, v_discount, p_voucher_points, true, 'VCR-' || public.random_code(6), now());

    -- Tandai sebagai update sistem agar lolos guard profil.
    perform set_config('app.allow_profile_system_update', 'on', true);

    update public.profiles
       set points_balance = points_balance - p_voucher_points
     where id = v_uid
    returning * into v_profile;
  end if;

  insert into public.orders (student_id, stand_id, pickup_time_slot, total_price, discount_applied, notes, status)
  values (v_uid, p_stand_id, p_slot, v_subtotal, v_discount, nullif(trim(coalesce(p_notes, '')), ''), 'pending')
  returning * into v_order;

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
    'points_left', v_profile.points_balance
  );
end $$;

-- -----------------------------------------------------------------------------
-- 11. READ RPC (untuk leaderboard & statistik publik)
-- -----------------------------------------------------------------------------

-- Klasemen kelas: agregat nyata per kelas dari profiles (role = student).
create or replace function public.get_class_leaderboard()
returns table (
  class_name   text,
  grade        text,
  jurusan      text,
  students     bigint,
  total_kg     numeric,
  total_points bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select c.name,
         c.grade,
         c.jurusan,
         count(p.id) filter (where p.role = 'student')                              as students,
         coalesce(sum(p.total_recycled_kg) filter (where p.role = 'student'), 0)     as total_kg,
         coalesce(sum(p.points_balance) filter (where p.role = 'student'), 0)::bigint as total_points
  from public.classes c
  left join public.profiles p on p.class_name = c.name
  group by c.name, c.grade, c.jurusan
  order by total_kg desc, total_points desc, c.name asc;
$$;

-- Statistik dampak lingkungan.
-- CATATAN: CO2e memakai faktor estimasi 2.5 kg CO2e per kg material campuran yang
-- didaur ulang. Angka ini estimasi dan dapat disesuaikan dengan faktor resmi sekolah.
create or replace function public.get_impact_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select coalesce(sum(total_recycled_kg), 0) as kg,
           coalesce(sum(points_balance), 0)    as pts,
           count(*)                            as students
    from public.profiles where role = 'student'
  )
  select jsonb_build_object(
    'total_kg',     s.kg,
    'total_points', s.pts,
    'students',     s.students,
    'deposits',     (select count(*) from public.waste_deposits),
    'co2e_kg',      s.kg * 2.5
  ) from s;
$$;

-- -----------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.classes          enable row level security;
alter table public.canteen_stands   enable row level security;
alter table public.menu_items       enable row level security;
alter table public.waste_item_types enable row level security;
alter table public.voucher_tiers    enable row level security;
alter table public.waste_deposits   enable row level security;
alter table public.vouchers         enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;

-- profiles: baca diri sendiri; staf (petugas/kantin) baca semua untuk operasional.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_staff_read on public.profiles;
create policy profiles_staff_read on public.profiles
  for select to authenticated
  using (public.current_user_role() in ('waste_officer', 'canteen_vendor'));

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- classes: dibaca publik (untuk dropdown pendaftaran & klasemen).
drop policy if exists classes_public_read on public.classes;
create policy classes_public_read on public.classes
  for select to anon, authenticated using (true);

-- canteen_stands: publik baca (filter stand); vendor mengelola miliknya.
drop policy if exists stands_public_read on public.canteen_stands;
create policy stands_public_read on public.canteen_stands
  for select to anon, authenticated using (true);

drop policy if exists stands_vendor_write on public.canteen_stands;
create policy stands_vendor_write on public.canteen_stands
  for all to authenticated
  using (vendor_id = auth.uid()) with check (vendor_id = auth.uid());

-- menu_items: publik baca katalog; vendor mengelola menu stand miliknya.
drop policy if exists menu_public_read on public.menu_items;
create policy menu_public_read on public.menu_items
  for select to anon, authenticated using (true);

drop policy if exists menu_vendor_write on public.menu_items;
create policy menu_vendor_write on public.menu_items
  for all to authenticated
  using (exists (select 1 from public.canteen_stands s where s.id = menu_items.stand_id and s.vendor_id = auth.uid()))
  with check (exists (select 1 from public.canteen_stands s where s.id = menu_items.stand_id and s.vendor_id = auth.uid()));

-- konfigurasi: publik baca.
drop policy if exists waste_types_read on public.waste_item_types;
create policy waste_types_read on public.waste_item_types
  for select to anon, authenticated using (true);

drop policy if exists voucher_tiers_read on public.voucher_tiers;
create policy voucher_tiers_read on public.voucher_tiers
  for select to anon, authenticated using (true);

-- waste_deposits: siswa baca miliknya; petugas baca semua.
drop policy if exists deposits_student_read on public.waste_deposits;
create policy deposits_student_read on public.waste_deposits
  for select to authenticated using (student_id = auth.uid());

drop policy if exists deposits_officer_read on public.waste_deposits;
create policy deposits_officer_read on public.waste_deposits
  for select to authenticated using (public.current_user_role() = 'waste_officer');

-- vouchers: siswa baca miliknya.
drop policy if exists vouchers_self_read on public.vouchers;
create policy vouchers_self_read on public.vouchers
  for select to authenticated using (student_id = auth.uid());

-- orders: siswa baca miliknya; vendor baca & ubah status pesanan stand miliknya.
drop policy if exists orders_student_read on public.orders;
create policy orders_student_read on public.orders
  for select to authenticated using (student_id = auth.uid());

drop policy if exists orders_vendor_read on public.orders;
create policy orders_vendor_read on public.orders
  for select to authenticated
  using (exists (select 1 from public.canteen_stands s where s.id = orders.stand_id and s.vendor_id = auth.uid()));

drop policy if exists orders_vendor_update on public.orders;
create policy orders_vendor_update on public.orders
  for update to authenticated
  using (exists (select 1 from public.canteen_stands s where s.id = orders.stand_id and s.vendor_id = auth.uid()))
  with check (exists (select 1 from public.canteen_stands s where s.id = orders.stand_id and s.vendor_id = auth.uid()));

-- order_items: dibaca oleh pemilik pesanan & vendor stand terkait.
drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.student_id = auth.uid()
           or exists (select 1 from public.canteen_stands s where s.id = o.stand_id and s.vendor_id = auth.uid()))
  ));

-- -----------------------------------------------------------------------------
-- 13. GRANTS
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant select on public.classes, public.canteen_stands, public.menu_items,
                public.waste_item_types, public.voucher_tiers to anon;
grant execute on function public.get_class_leaderboard() to anon, authenticated;
grant execute on function public.get_impact_stats() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 14. REALTIME (agar dashboard kantin & siswa ter-update tanpa refresh)
-- -----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.orders;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.order_items;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.waste_deposits;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.profiles;
    exception when duplicate_object then null; end;
  end if;
end $$;
