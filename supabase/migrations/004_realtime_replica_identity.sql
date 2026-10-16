-- -----------------------------------------------------------------------------
-- 004 — Identitas replika untuk realtime
-- -----------------------------------------------------------------------------
-- Supabase menganjurkan `replica identity full` untuk tabel yang dipantau lewat
-- `postgres_changes` di bawah RLS. Tanpa itu, peristiwa UPDATE dan DELETE hanya
-- membawa kunci utama, sehingga baris lama tidak bisa dinilai terhadap policy.
--
-- Berkas ini lahir dari penyelidikan Task 5. Saat itu peristiwa INSERT untuk
-- `orders` memang tidak pernah sampai ke klien — dan `replica identity full`
-- ternyata bukan penyebabnya. Setelannya tetap dipasang supaya basis data yang
-- berjalan dan berkas migrasi di repo tidak berbeda; perbedaan seperti itu adalah
-- utang yang baru terasa saat orang lain membangun ulang dari nol.
--
-- Idempoten: aman dijalankan berulang.

alter table public.orders replica identity full;
alter table public.order_items replica identity full;
