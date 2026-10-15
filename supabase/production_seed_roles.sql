-- =============================================================================
-- SKAMUDA EcoHub - Production Role Provisioning
--
-- Petugas Bank Sampah (waste_officer) dan Penjual Kantin (canteen_vendor) TIDAK
-- dapat mendaftar dari halaman publik. Hanya siswa yang bisa mendaftar sendiri.
--
-- Alur menambah staf:
--   1. Buat user di Supabase Dashboard -> Authentication -> Users -> "Add user"
--      (centang "Auto Confirm User"). Password diatur di sana.
--   2. Jalankan salah satu query UPDATE di bawah di SQL Editor, ganti emailnya.
--   3. (Vendor) Jalankan INSERT canteen_stands agar stand-nya muncul ke siswa.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. Jadikan Petugas Bank Sampah
-- -----------------------------------------------------------------------------
update public.profiles
   set role = 'waste_officer'
 where id = (select id from auth.users where email = 'petugas@skamuda.sch.id');

-- -----------------------------------------------------------------------------
-- B. Jadikan Penjual Kantin
-- -----------------------------------------------------------------------------
update public.profiles
   set role = 'canteen_vendor'
 where id = (select id from auth.users where email = 'penjual@skamuda.sch.id');

-- -----------------------------------------------------------------------------
-- C. Daftarkan stand untuk penjual kantin
--    Ganti email & nama stand sesuai kebutuhan.
-- -----------------------------------------------------------------------------
insert into public.canteen_stands (vendor_id, stand_name, description, is_active)
select p.id, 'Stand FastFood TKR', 'Makanan cepat saji dan minuman dingin.', true
from public.profiles p
where p.id = (select id from auth.users where email = 'penjual@skamuda.sch.id')
  and not exists (select 1 from public.canteen_stands s where s.vendor_id = p.id and s.stand_name = 'Stand FastFood TKR');

-- -----------------------------------------------------------------------------
-- D. Kembalikan seorang user menjadi siswa (misal salah set role)
-- -----------------------------------------------------------------------------
update public.profiles
   set role = 'student'
 where id = (select id from auth.users where email = 'siswa@skamuda.sch.id');

-- -----------------------------------------------------------------------------
-- E. Cek hasil: daftar semua staf & perannya
-- -----------------------------------------------------------------------------
select u.email, p.full_name, p.role, p.class_name
from public.profiles p
join auth.users u on u.id = p.id
where p.role <> 'student'
order by p.role, u.email;
