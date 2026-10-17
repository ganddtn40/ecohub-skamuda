# Checklist Deployment Produksi — SKAMUDA EcoHub

Dokumen ini untuk orang yang men-deploy aplikasi ini, bukan untuk yang menulis
kodenya. Isinya delapan langkah dan dua penghalang yang sudah diketahui beserta
bukti dan tindakan yang dibutuhkan. Tidak ada langkah di sini yang menuntut
membaca kode.

Ringkas: **dua hal menghalangi produksi dan keduanya bukan cacat kode** — email
reset tidak bisa terkirim karena domainnya tidak ada (bagian 2), dan peristiwa
`INSERT` realtime untuk `orders` tidak sampai ke klien (bagian 4). Sisanya
langkah biasa.

---

## 1. Menjalankan SQL di Supabase Dashboard

Berkasnya satu: `supabase/migrations/latest_update.sql`. Isinya tiga bagian
berlabel, dan bagiannya **sengaja dipisah**. Postgres menolak memakai nilai enum
di transaksi yang sama dengan saat nilai itu ditambahkan, dan satu tempelan di
SQL Editor berjalan sebagai satu transaksi. Karena itu: dua tempelan, bukan
satu. Ini sudah diuji dan gagalnya berbunyi `unsafe use of new value`, SQLSTATE
`55P04`.

Urutannya:

1. Buka **Supabase Dashboard → pilih proyek → SQL Editor → New query**.
2. Untuk database yang benar-benar baru, jalankan dulu
   `supabase/migrations/001_production_live.sql`, lalu `supabase/seed.sql`,
   baru `latest_update.sql`. Untuk database yang sudah berjalan, langsung ke
   langkah berikut.
3. Tempel **Bagian 1** saja: dari baris `-- BAGIAN 1` sampai tepat sebelum
   baris `-- BAGIAN 2`. Klik **Run**.
4. Tunggu sampai muncul **Success**. Bagian 1 tidak mengembalikan baris.
5. **New query** lagi. Tempel **Bagian 2**: dari baris `-- BAGIAN 2` sampai
   tepat sebelum baris `-- BAGIAN 3`. Klik **Run**.
6. Tunggu sampai muncul **Success**. Bagian 2 juga tidak mengembalikan baris.
7. **New query** lagi. Tempel **Bagian 3** saja. Klik **Run**.
8. Hasilnya sebuah tabel. Baris pertama berbunyi `RINGKASAN` dengan nilai
   **`SEMUA ADA (16/16)`**, dan enam belas baris di bawahnya semuanya `ADA`.
   Kalau ada satu saja yang berbunyi `HILANG`, jangan lanjut: jalankan ulang
   Bagian 1 dan Bagian 2 sebelum menyimpulkan ada yang salah.

Bagian 1 dan Bagian 2 idempoten; menjalankannya dua kali aman. Bagian 3 hanya
membaca.

Dari terminal, seluruh berkas sekaligus juga bisa, asalkan
`SUPABASE_DB_URL` sudah ada di `.env.local`:

```bash
node --env-file=.env.local scripts/db.mjs supabase/migrations/latest_update.sql
```

Yang harus terlihat: `OK` di akhir, tanpa satu baris `ERROR`.

### Kurs poin: satu langkah tambahan untuk database yang sudah terisi

`supabase/migrations/005_kurs_poin.sql` menurunkan kurs dari 1 poin = Rp10
menjadi **1 poin = Rp5**, supaya potongan voucher yang ditanggung penjual
kantin tidak sebesar sebelumnya. Isinya hanya dua `update` — ke `voucher_tiers`
dan `menu_items` — tanpa skema dan tanpa nilai enum, jadi aman ditempel utuh
sebagai satu transaksi. Berkas ini idempoten, dan di database yang di-seed
ulang setelah 18 Oktober 2026 ia tidak mengubah apa pun (`seed.sql` sudah
memakai kurs Rp5).

1. **New query**, tempel seluruh isi `005_kurs_poin.sql`, klik **Run**.
2. Baris terakhir berbunyi `RINGKASAN` dengan nilai **`SESUAI (kurs Rp5)`**.
   Dua baris pemeriksaan di atasnya harus berbunyi `"tidak_sesuai": 0`.

Perkiraan hasilnya: Nasi Ayam Bakar Rp15.000 = 3.000 poin (dulu 1.500 poin),
dan voucher 500 P = potongan Rp2.500 (dulu Rp5.000). Imbalan menyetor sampah
per kg sengaja tidak diubah — penurunannya sudah otomatis terasa di nilai
rupiahnya.

Jangan jalankan berkas ini berkali-kali dengan harapan hasilnya bertambah;
kursnya sudah pasti, dan menjalankannya lagi hanya menulis angka yang sama.

---

## 2. Email reset kata sandi tidak bisa terkirim (penghalang produksi)

**Gejala.** Halaman "Lupa password" selalu gagal dengan pesan umum, dan tidak
ada email yang sampai.

**Bukti.** Permintaan untuk akun yang **ada** dijawab Supabase dengan
`400 {"error_code":"email_address_invalid"}`, karena domain `skamuda.sch.id`
tidak punya catatan DNS sama sekali (NXDOMAIN). Setelah percobaan berulang,
SMTP bawaan Supabase menjawab `429 over_email_send_rate_limit`. Jadi
kegagalannya di pengiriman email, bukan di alur reset aplikasinya.

**Yang sering disalahpahami.** Menambahkan URL callback (bagian 3) **tidak**
memperbaiki pengiriman email. URL callback hanya menentukan ke mana pengguna
diarahkan *setelah* mengeklik tautan di dalam email; selama alamatnya belum bisa
menerima surat, Supabase menolaknya lebih dulu dan tidak ada email yang dibuat
sama sekali. Dicek ulang 17 Okt 2026: `skamuda.sch.id` masih
`DNS name does not exist`, jadi akun `@skamuda.sch.id` - termasuk seluruh akun
demo - belum bisa menerima email reset, apa pun setelan SMTP-nya.

**Akibat yang lebih luas.** Bila **Authentication → Sign In / Providers →
Email → Confirm email** menyala, pendaftaran dengan alamat `@skamuda.sch.id`
juga tidak akan pernah tuntas, karena surat konfirmasinya pun tidak bisa
terkirim. Periksa setelan itu bersamaan dengan SMTP.

**Yang sudah terbukti benar.** Alurnya sendiri (token sekali pakai sampai
`/reset-password`) sudah diuji dengan tautan yang dibuat admin, dan berhasil.
Tidak ada yang perlu diubah di kode sebelum email bisa keluar.

**Tindakan yang dibutuhkan.**

1. Punya domain sungguhan dengan catatan MX, atau akun SMTP kustom (Resend,
   SendGrid, dan sejenisnya), lalu isikan di **Supabase → Project Settings →
   Auth → SMTP Settings**.
2. Pastikan templat email **Recovery** aktif di **Authentication → Email
   Templates**.
3. Ulangi uji lupa password dengan alamat yang benar-benar menerima email.

---

## 3. URL callback

Tambahkan alamat callback ke daftar yang diizinkan Supabase, untuk **setiap**
origin yang dipakai:

- **Supabase → Authentication → URL Configuration → Redirect URLs**:
  - `http://localhost:3000/auth/callback` untuk pengembangan,
  - `https://<domain-produksi>/auth/callback` untuk produksi.
- **Site URL** di halaman yang sama diisi origin produksi.

Kalau langkah ini terlewat, tautan konfirmasi dan tautan reset akan ditolak
Supabase atau mendarat di halaman yang salah.

Per 17 Okt 2026, `https://ecohub-skamuda.vercel.app/auth/callback` dan Site URL
produksi sudah ditambahkan. Yang belum: callback `http://localhost:3000` bila
Anda mengembangkan di mesin sendiri.

---

## 4. Bug realtime: `INSERT` pada `orders` tidak sampai ke klien (penghalang produksi)

**Gejala.** Pesanan baru tidak muncul di papan penjual dan di daftar pesanan
siswa tanpa penyegaran manual. Perubahan status (`UPDATE`) dan penghapusan
(`DELETE`) justru sampai normal.

**Yang sudah diperiksa dan bukan penyebabnya:** keanggotaan tabel di publication
realtime, `wal_level = logical`, flag publication untuk insert/update/delete,
`REPLICA IDENTITY FULL`, dan keterbacaan baris di bawah RLS. Semuanya benar;
peristiwa `INSERT` untuk `orders` tetap tidak pernah muncul di klien, sementara
`UPDATE` dan `DELETE` untuk tabel yang sama muncul.

**Keadaan sekarang.** Aplikasinya sudah mengakalinya: perubahan yang datang
lewat realtime dibandingkan dengan hasil query, dan daftar disegarkan berkala
setiap 30 detik. Fitur berjalan dan tidak ada data yang salah; yang belum ada
adalah perbaikan akar masalahnya.

**Tindakan yang dibutuhkan.** Laporkan ke Supabase Support dengan bukti:
publication untuk `orders` sudah berisi tabel itu, `wal_level = logical`, dan
`INSERT` manual ke `orders` dari SQL Editor tidak sampai ke langganan klien
sementara `UPDATE` ke baris yang sama sampai.

---

## 5. Kata sandi database

Kredensial database pernah terbaca di transkrip sesi pengembangan. Ganti
sebelum produksi:

1. **Supabase → Project Settings → Database → Reset database password.**
2. Perbarui `SUPABASE_DB_URL` di `.env.local` dengan URI Session pooler yang
   baru.
3. Pastikan `.env.local` tetap ada di `.gitignore` (sudah ada) dan tidak pernah
   ikut ter-commit.

---

## 6. Perangkat dan gerak (animasi)

Aplikasi ini menyesuaikan animasinya dengan kemampuan perangkat, lewat atribut
`data-tier` pada elemen `<html>`. Mesin yang melaporkan
`prefers-reduced-motion: reduce` masuk ke tier `lite`; di sana GSAP tidak pernah
diunduh sama sekali.

Cara memeriksanya, di konsol browser:

```js
document.documentElement.dataset.tier   // "lite" atau "full"
matchMedia("(prefers-reduced-motion: reduce)").matches
```

Untuk **melihat** animasinya di mesin yang melaporkan `reduce`, ada dua jalan:

- Matikan "reduce motion" di pengaturan sistem (Windows: Settings →
  Accessibility → Visual effects → Animation effects), lalu muat ulang; atau
- Paksa tier-nya untuk sesi itu saja, lalu berpindah halaman lewat tautan
  internal (kunci `data-tier` disetel sebelum cat pertama; memuat ulang penuh
  mengembalikannya ke nilai sebenarnya):
  ```js
  document.documentElement.setAttribute("data-tier", "full");
  ```
  setelah itu klik salah satu tautan navigasi di halaman — bukan muat ulang.

Yang diharapkan terlihat: kartu menu dan kartu statistik terangkat saat
disentuh dan mengecil saat ditekan, angka saldo poin dan total kilogram
berhitung naik, lencana status pesanan berdenyut, panel keranjang dan dialog
masuk dengan pegas, dan perpindahan halaman memudar masuk.

---

## 7. Setelah deploy, yang perlu dicek tangan

1. Daftar akun siswa baru, konfirmasi email, lalu masuk.
2. Setor sampah dengan akun petugas: poin siswa bertambah.
3. Pesan di kantin: pesanan masuk sebagai **menunggu diterima**, penjual
   menerimanya, tandai siap diambil, lalu selesaikan.
4. Papan skor publik terbuka tanpa login dan menampilkan peringkat kelas.
5. Halaman QR siswa menampilkan kode yang bisa dipindai petugas.

---

## 8. Yang sudah terbukti sebelum dokumen ini ditulis

- Uji SQL: 36 asersi di `supabase/tests/` semuanya lulus (13 + 10 + 13), 0
  gagal, dan idempotensinya diuji dengan menjalankan ulang tiap berkas.
- `latest_update.sql` dijalankan tujuh kali terhadap database live (seluruh
  berkas dua kali, Bagian 1 dua kali, Bagian 2 dua kali, Bagian 3 sekali):
  semuanya `OK`, tanpa baris `ERROR`, dan pemeriksaan Bagian 3 melaporkan
  `SEMUA ADA (16/16)`.
- `tsc` bersih dan `npm run build` berhasil pada setiap tugas.
- Kontras teks memenuhi WCAG AA (terendah 4,67:1) dan tidak ada emoji di
  antarmuka.
