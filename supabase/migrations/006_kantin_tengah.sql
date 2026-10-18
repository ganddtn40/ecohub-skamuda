-- =============================================================================
-- 006 — Stand "Kantin Tengah" + menu awalnya
-- =============================================================================
--
-- KENAPA ADA
-- ----------
-- Akun penjual `kantin.tengah@skamuda.sch.id`
-- (id cab08de1-1dab-463b-b09c-38c8b854f2b8) sudah dibuat, tetapi belum punya
-- baris di `canteen_stands`. Tanpa stand, penjual itu tidak punya papan pesanan
-- dan menunya tidak mungkin muncul di katalog siswa.
--
-- Berkas ini menambahkan stand itu beserta satu set menu pembuka: ayam crispy,
-- ayam goreng, nasi goreng, nasi ayam crispy, telur mie goreng, air mineral dua
-- ukuran, serta Milo dan Energen dalam tiga penyajian (es, anget, panas).
--
-- HARGA ADALAH PERKIRAAN
-- ---------------------
-- Harga rupiah di bawah adalah perkiraan yang wajar untuk kantin sekolah,
-- BUKAN harga yang diberikan penjualnya. Penjual menggantinya sendiri lewat
-- halaman **Kelola Menu** (`/kantin/menu`), dan halaman itu sudah bisa mengubah
-- nama, harga, harga poin, kategori, serta ketersediaan tiap item.
--
-- Pilihan topping (misalnya bihun, mie, tempe untuk Nasi Ayam Crispy) tidak
-- dibuat sebagai item terpisah: aplikasi ini tidak punya model varian, dan
-- siswa sudah bisa menuliskannya di catatan per item saat memesan. Penjual
-- tetap bebas memecahnya jadi beberapa item kalau lebih nyaman.
--
-- HARGA POIN
-- ----------
-- Harga poin dihitung dari kurs yang berlaku (lihat `005_kurs_poin.sql`):
-- `round(price_idr / 5)`. Menu ini sengaja ikut kurs itu supaya tidak ada dua
-- kebenaran tentang nilai poin.
--
-- SIFAT
-- -----
-- Idempoten: hanya menambah baris yang belum ada. Menjalankannya lagi tidak
-- menggandakan stand maupun menu, dan tidak menimpa harga yang sudah diubah
-- penjual.
--
-- MENJALANKAN
-- -----------
-- Supabase Dashboard -> SQL Editor: tempel seluruh berkas, klik Run, lalu
-- periksa tabel hasil di bagian 2 (baris RINGKASAN harus SESUAI).
--
-- Dari terminal:
--   node --env-file=.env.local scripts/db.mjs supabase/migrations/006_kantin_tengah.sql
-- =============================================================================

-- ############################################################################
-- BAGIAN 1 — DATA
-- ############################################################################

-- -----------------------------------------------------------------------------
-- 1. Stand untuk penjual Kantin Tengah
-- -----------------------------------------------------------------------------
-- Diperiksa lewat `vendor_id`, bukan `stand_name`: kalau penjual mengganti nama
-- standnya nanti, berkas ini tetap mengenali standnya dan tidak menambah yang
-- kedua.
insert into public.canteen_stands (vendor_id, stand_name, description, is_active)
select p.id, 'Kantin Tengah', 'Ayam crispy, nasi goreng, mie, dan aneka minuman.', true
from public.profiles p
where p.id = 'cab08de1-1dab-463b-b09c-38c8b854f2b8'::uuid
  and p.role = 'canteen_vendor'
  and not exists (
    select 1 from public.canteen_stands s where s.vendor_id = p.id
  );

-- -----------------------------------------------------------------------------
-- 2. Menu pembuka
-- -----------------------------------------------------------------------------
-- Harga poin diturunkan dari harga rupiah dengan kurs Rp5, bukan ditulis dua
-- kali, supaya keduanya tidak bisa saling menyimpang.
insert into public.menu_items (stand_id, name, price_idr, points_price, category, is_available)
select s.id, v.name, v.price_idr, round(v.price_idr / 5.0)::integer, v.category, true
from public.canteen_stands s
cross join (values
  ('Ayam Crispy',              5000, 'Makanan'),
  ('Ayam Goreng',              5000, 'Makanan'),
  ('Telur Mie Goreng',         9000, 'Makanan'),
  ('Nasi Goreng',             10000, 'Makanan'),
  ('Nasi Ayam Crispy',        13000, 'Makanan'),
  ('Nasi Goreng Ayam Crispy', 14000, 'Makanan'),
  ('Air Mineral Medium',       3000, 'Minuman'),
  ('Air Mineral Large',        5000, 'Minuman'),
  ('Milo Es',                  6000, 'Minuman'),
  ('Milo Anget',               5000, 'Minuman'),
  ('Milo Panas',               5000, 'Minuman'),
  ('Energen Es',               5000, 'Minuman'),
  ('Energen Anget',            4000, 'Minuman'),
  ('Energen Panas',            4000, 'Minuman')
) as v(name, price_idr, category)
where s.vendor_id = 'cab08de1-1dab-463b-b09c-38c8b854f2b8'::uuid
  and not exists (
    select 1 from public.menu_items m where m.stand_id = s.id and m.name = v.name
  );

-- ############################################################################
-- BAGIAN 2 — PEMERIKSAAN (baca saja, tidak mengubah apa pun)
-- ############################################################################

-- -----------------------------------------------------------------------------
-- 1. Penjual dan standnya
-- -----------------------------------------------------------------------------
select json_build_object(
         'objek',        'penjual Kantin Tengah',
         'akun_ada',     (select count(*) from public.profiles
                           where id = 'cab08de1-1dab-463b-b09c-38c8b854f2b8'::uuid),
         'stand_ada',    (select count(*) from public.canteen_stands
                           where vendor_id = 'cab08de1-1dab-463b-b09c-38c8b854f2b8'::uuid),
         'nama_stand',   (select coalesce(string_agg(stand_name, ', '), '-')
                            from public.canteen_stands
                           where vendor_id = 'cab08de1-1dab-463b-b09c-38c8b854f2b8'::uuid)
       ) as hasil;

-- -----------------------------------------------------------------------------
-- 2. Menu stand itu
-- -----------------------------------------------------------------------------
select json_build_object(
         'objek',        'menu Kantin Tengah',
         'baris',        count(*),
         'tidak_sesuai', count(*) filter (
                           where points_price is null
                              or abs(points_price - price_idr / 5.0) > 0.5
                         ),
         'kurs',         'Rp5 per poin'
       ) as hasil
from public.menu_items m
where m.stand_id in (
  select id from public.canteen_stands
  where vendor_id = 'cab08de1-1dab-463b-b09c-38c8b854f2b8'::uuid
);

-- -----------------------------------------------------------------------------
-- 3. Daftarnya (untuk dilihat manusia)
-- -----------------------------------------------------------------------------
select m.category   as kategori,
       m.name       as menu,
       m.price_idr  as harga_rupiah,
       m.points_price as harga_poin,
       m.is_available as tersedia
from public.menu_items m
where m.stand_id in (
  select id from public.canteen_stands
  where vendor_id = 'cab08de1-1dab-463b-b09c-38c8b854f2b8'::uuid
)
order by m.category, m.price_idr desc, m.name;

-- -----------------------------------------------------------------------------
-- 4. Ringkasan
-- -----------------------------------------------------------------------------
select json_build_object(
         'objek', 'RINGKASAN',
         'hasil', case
           when (select count(*) from public.profiles
                  where id = 'cab08de1-1dab-463b-b09c-38c8b854f2b8'::uuid
                    and role = 'canteen_vendor') = 1
            and (select count(*) from public.canteen_stands
                  where vendor_id = 'cab08de1-1dab-463b-b09c-38c8b854f2b8'::uuid) = 1
            and (select count(*) from public.menu_items
                  where stand_id in (
                    select id from public.canteen_stands
                    where vendor_id = 'cab08de1-1dab-463b-b09c-38c8b854f2b8'::uuid
                  )) > 0
            and (select count(*) from public.menu_items
                  where stand_id in (
                    select id from public.canteen_stands
                    where vendor_id = 'cab08de1-1dab-463b-b09c-38c8b854f2b8'::uuid
                  )
                    and (points_price is null
                         or abs(points_price - price_idr / 5.0) > 0.5)) = 0
           then 'SESUAI (stand ada, harga poin ikut kurs Rp5)'
           else 'BELUM SESUAI'
         end
       ) as ringkasan;
