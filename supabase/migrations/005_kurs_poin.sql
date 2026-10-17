-- =============================================================================
-- 005 — Kurs poin: 1 poin = Rp5 (dari Rp10)
-- =============================================================================
--
-- KENAPA BERUBAH
-- --------------
-- Potongan voucher ditanggung penjual kantin. Aplikasi ini tidak punya
-- mekanisme penggantian, jadi setiap potongan Rp5.000 dari voucher 500 P
-- berarti penjual menerima Rp5.000 lebih sedikit dari harga menunya. Di mode
-- bayar penuh dengan poin, siswa tidak membayar tunai sama sekali.
--
-- Dengan kurs Rp10, satu porsi Nasi Ayam Bakar Rp15.000 setara 1.500 poin,
-- sementara 1.500 poin itu datang dari sekitar 0,75 kg botol plastik. Kurs
-- diturunkan menjadi Rp5 supaya nilai rupiah satu poin separuh dari
-- sebelumnya: harga poin setiap menu naik, dan potongan voucher untuk jumlah
-- poin yang sama mengecil. Imbalan menyetor sampah (`waste_item_types
-- .points_per_kg`) sengaja TIDAK diubah - penurunan itu sudah otomatis terasa
-- di nilai rupiahnya.
--
-- Keputusan pemilik proyek, 18 Oktober 2026.
--
-- SIFAT
-- -----
-- Idempoten: boleh dijalankan berkali-kali dengan hasil sama. Hanya menyentuh
-- data (dua tabel), bukan skema, dan tanpa nilai enum baru.
--
-- Database yang di-seed ulang setelah 18 Oktober 2026 sudah berisi kurs ini
-- (lihat `seed.sql`), jadi menjalankan berkas ini di sana tidak mengubah apa
-- pun. Ia ada untuk database yang sudah terlanjur terisi kurs lama.
--
-- MENJALANKAN
-- -----------
-- Supabase Dashboard -> SQL Editor:
--   1. New query.
--   2. Tempel seluruh berkas ini.
--   3. Klik Run. Hasilnya beberapa tabel pemeriksaan; baris RINGKASAN harus
--      berbunyi SESUAI.
--
-- Dari terminal:
--   node --env-file=.env.local scripts/db.mjs supabase/migrations/005_kurs_poin.sql
-- =============================================================================

-- ############################################################################
-- BAGIAN 1 — DATA
-- ############################################################################

-- -----------------------------------------------------------------------------
-- 1. Tier voucher: potongan = points_cost x Rp5
-- -----------------------------------------------------------------------------
-- Semua baris diperbarui, aktif maupun tidak: kurs adalah satu kebijakan,
-- bukan setelan per tier. `label` dan `is_active` tidak diubah.
update public.voucher_tiers
   set discount_idr = points_cost * 5;

-- -----------------------------------------------------------------------------
-- 2. Harga poin setiap menu: price_idr / Rp5
-- -----------------------------------------------------------------------------
-- Hanya menu yang memang menerima pembayaran poin (`points_price > 0`) yang
-- dihitung ulang. Menu ber-`points_price` NULL dibiarkan NULL: artinya menu itu
-- tidak bisa dibayar dengan poin, dan mengarang harga poin untuknya justru
-- membuka celah yang ditutup aturan PZ004 di `place_order`.
--
-- `round` dipakai supaya harga yang tidak bulat dibagi 5 pun tetap menghasilkan
-- bilangan bulat, dan tidak pernah menyentuh 0 (nol berarti gratis).
update public.menu_items
   set points_price = round(price_idr / 5.0)
 where points_price is not null
   and points_price > 0;

-- ############################################################################
-- BAGIAN 2 — PEMERIKSAAN (baca saja, tidak mengubah apa pun)
-- ############################################################################

-- -----------------------------------------------------------------------------
-- 1. Tier voucher
-- -----------------------------------------------------------------------------
select json_build_object(
         'objek',        'tier voucher',
         'baris',        count(*),
         'tidak_sesuai', count(*) filter (where discount_idr <> points_cost * 5),
         'kurs',         'Rp5 per poin'
       ) as hasil
from public.voucher_tiers;

-- -----------------------------------------------------------------------------
-- 2. Harga poin menu
-- -----------------------------------------------------------------------------
select json_build_object(
         'objek',           'harga poin menu',
         'baris',           count(*),
         'tanpa_harga_poin', count(*) filter (where points_price is null),
         'tidak_sesuai',    count(*) filter (
                              where points_price is not null
                                and abs(points_price - price_idr / 5.0) > 0.5
                            )
       ) as hasil
from public.menu_items;

-- -----------------------------------------------------------------------------
-- 3. Daftar menu (untuk dilihat manusia)
-- -----------------------------------------------------------------------------
select mi.name                  as menu,
       mi.price_idr             as harga_rupiah,
       mi.points_price          as harga_poin,
       round(mi.price_idr / 5.0) as seharusnya,
       case
         when mi.points_price is null or mi.points_price = 0 then null
         else round(mi.price_idr::numeric / mi.points_price, 1)
       end                      as rupiah_per_poin
from public.menu_items mi
order by mi.price_idr desc, mi.name;

-- -----------------------------------------------------------------------------
-- 4. Ringkasan
-- -----------------------------------------------------------------------------
select json_build_object(
         'objek', 'RINGKASAN',
         'hasil', case
           when (select count(*) from public.voucher_tiers
                  where discount_idr <> points_cost * 5) = 0
            and (select count(*) from public.menu_items
                  where points_price is not null
                    and abs(points_price - price_idr / 5.0) > 0.5) = 0
           then 'SESUAI (kurs Rp5)'
           else 'ADA YANG TIDAK SESUAI'
         end
       ) as ringkasan;
