-- =============================================================================
-- SKAMUDA EcoHub - Seed Data
-- Jalankan SETELAH 001_production_live.sql.
--
-- Isi:
--   1. Roster kelas resmi (X, XI, XII x 6 jurusan)
--   2. Konfigurasi jenis sampah & tier voucher
--   3. 4 akun demo siap pakai (untuk pengujian juri) dengan email terkonfirmasi
--   4. Stand kantin + katalog menu contoh
--
-- Akun demo:
--   Siswa    : siswa.demo@skamuda.sch.id     / Skamuda2026!
--   Petugas  : petugas.demo@skamuda.sch.id   / Skamuda2026!
--   Kantin 1 : kantin.berkah@skamuda.sch.id  / Skamuda2026!
--   Kantin 2 : kantin.sehat@skamuda.sch.id   / Skamuda2026!
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ROSTER KELAS
--    Tingkat X & XI memiliki 2 rombel per jurusan, XII 1 kelas per jurusan. (30 kelas)
--    Ubah/tambah baris di sini kapan saja; dropdown pendaftaran & klasemen membacanya live.
-- -----------------------------------------------------------------------------
insert into public.classes (name, grade, jurusan, rombel)
select
  g.grade || ' ' || j.jurusan || case when g.grade = 'XII' then '' else ' ' || r.rombel end,
  g.grade,
  j.jurusan,
  r.rombel
from (values ('X'), ('XI'), ('XII')) as g(grade)
cross join (values ('TKJ'), ('TKR'), ('MAPER'), ('HOTEL'), ('ASKEP'), ('FARMASI')) as j(jurusan)
cross join (values (1), (2)) as r(rombel)
where not (g.grade = 'XII' and r.rombel = 2)
on conflict (name) do update
  set grade = excluded.grade, jurusan = excluded.jurusan, rombel = excluded.rombel;

-- -----------------------------------------------------------------------------
-- 2. KONFIGURASI
-- -----------------------------------------------------------------------------
insert into public.waste_item_types (code, label, unit_label, points_per_kg, is_active) values
  ('botol_plastik', 'Botol Plastik', 'botol', 2000, true),
  ('kaca',          'Kaca',          'kg',    1000, true),
  ('kardus',        'Kardus',        'kg',    1500, true),
  ('kaleng',        'Kaleng',        'kaleng',2500, true),
  ('kertas',        'Kertas / HVS',  'kg',    1200, true)
on conflict (code) do update
  set label = excluded.label, unit_label = excluded.unit_label,
      points_per_kg = excluded.points_per_kg, is_active = excluded.is_active;

insert into public.voucher_tiers (points_cost, discount_idr, label, is_active) values
  (500,  5000,  'Hemat',   true),
  (1200, 12000, 'Spesial', true),
  (2500, 25000, 'Pesta',   true)
on conflict (points_cost) do update
  set discount_idr = excluded.discount_idr, label = excluded.label, is_active = excluded.is_active;

-- -----------------------------------------------------------------------------
-- 3. AKUN DEMO
--    Membuat user di auth.users (email terkonfirmasi) + auth.identities + profile.
-- -----------------------------------------------------------------------------
create or replace function public.seed_demo_user(
  p_email      text,
  p_password   text,
  p_full_name  text,
  p_class_name text,
  p_role       public.user_role
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = p_email;

  if v_uid is null then
    v_uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_uid, 'authenticated', 'authenticated', p_email,
      crypt(p_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name, 'class_name', p_class_name),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', p_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;

  -- handle_new_user trigger sudah membuat profile 'student'; di sini kita rapikan.
  insert into public.profiles (id, full_name, class_name, role)
  values (v_uid, p_full_name, p_class_name, p_role)
  on conflict (id) do update
    set full_name = excluded.full_name,
        class_name = excluded.class_name,
        role = excluded.role;

  return v_uid;
end $$;

select public.seed_demo_user('siswa.demo@skamuda.sch.id',   'Skamuda2026!', 'Ananda Pratama',    'X TKJ 1', 'student');
select public.seed_demo_user('petugas.demo@skamuda.sch.id', 'Skamuda2026!', 'Rahmat Hidayat',    null,      'waste_officer');
select public.seed_demo_user('kantin.berkah@skamuda.sch.id','Skamuda2026!', 'Sari Wulandari',    null,      'canteen_vendor');
select public.seed_demo_user('kantin.sehat@skamuda.sch.id', 'Skamuda2026!', 'Budi Santoso',      null,      'canteen_vendor');

-- -----------------------------------------------------------------------------
-- 4. STAND KANTIN + MENU
-- -----------------------------------------------------------------------------
insert into public.canteen_stands (vendor_id, stand_name, description, is_active)
select p.id, 'Kantin Berkah', 'Masakan rumahan, lauk harian, dan aneka minuman.', true
from public.profiles p where p.id = (select id from auth.users where email = 'kantin.berkah@skamuda.sch.id')
  and not exists (select 1 from public.canteen_stands s where s.stand_name = 'Kantin Berkah');

insert into public.canteen_stands (vendor_id, stand_name, description, is_active)
select p.id, 'Kantin Sehat', 'Menu sehat, gorengan, dan jus buah segar.', true
from public.profiles p where p.id = (select id from auth.users where email = 'kantin.sehat@skamuda.sch.id')
  and not exists (select 1 from public.canteen_stands s where s.stand_name = 'Kantin Sehat');

-- Menu Kantin Berkah
insert into public.menu_items (stand_id, name, price_idr, points_price, category, is_available)
select s.id, v.name, v.price_idr, v.points_price, v.category, true
from public.canteen_stands s
cross join (values
  ('Nasi Ayam Bakar',      15000, 1500, 'Makanan'),
  ('Nasi Telur Balado',    10000, 1000, 'Makanan'),
  ('Mie Goreng Spesial',   12000, 1200, 'Makanan'),
  ('Tahu Tempe Penyet',     8000,  800, 'Makanan'),
  ('Es Teh Manis',          4000,  400, 'Minuman'),
  ('Air Mineral',           3000,  300, 'Minuman')
) as v(name, price_idr, points_price, category)
where s.stand_name = 'Kantin Berkah'
  and not exists (select 1 from public.menu_items m where m.stand_id = s.id and m.name = v.name);

-- Menu Kantin Sehat
insert into public.menu_items (stand_id, name, price_idr, points_price, category, is_available)
select s.id, v.name, v.price_idr, v.points_price, v.category, true
from public.canteen_stands s
cross join (values
  ('Salad Buah Segar',     12000, 1200, 'Sehat'),
  ('Nasi Ayam Kukus',      14000, 1400, 'Sehat'),
  ('Jus Alpukat',           9000,  900, 'Minuman'),
  ('Pisang Goreng Crispy',  6000,  600, 'Snack'),
  ('Roti Bakar Madu',       7000,  700, 'Snack')
) as v(name, price_idr, points_price, category)
where s.stand_name = 'Kantin Sehat'
  and not exists (select 1 from public.menu_items m where m.stand_id = s.id and m.name = v.name);

-- Bersihkan helper agar tidak diekspos ke API.
drop function if exists public.seed_demo_user(text, text, text, text, public.user_role);
