# SKAMUDA EcoHub

Ekosistem digital **SMKN 1 Murung Pudak**: Bank Sampah berbasis poin + Pre-Order Kantin Pintar dalam satu aplikasi web.

Aplikasi ini menghubungkan tiga peran dalam satu alur:

- **Siswa** menyetor sampah, mengumpulkan poin, lalu memakainya sebagai potongan harga atau untuk melunasi pesanan kantin penuh dengan poin.
- **Petugas Bank Sampah** memindai QR siswa, mencatat setoran, dan mengonversinya jadi poin secara otomatis.
- **Penjual Kantin** mengelola menu, menerima pesanan real-time per jam istirahat, memverifikasi tiket saat pengambilan, dan menandai pesanan yang tidak diambil.

Semua data hidup di Supabase (Auth + Postgres + RLS + Realtime). Tidak ada data mock atau fallback `localStorage`.

---

## Fitur

### Siswa
- **Kartu QR pribadi** (`/siswa/qr`): token QR unik per akun untuk dipindai petugas.
- **Dashboard** (`/siswa`): saldo poin, total sampah didaur ulang, progres target harian.
- **Kantin** (`/siswa/kantin`): filter per stand, keranjang, catatan khusus per item & per pesanan, dua cara bayar (tunai dengan potongan voucher poin, atau lunas penuh dengan poin), checkout.
- **Pesanan** (`/siswa/pesanan`): tiket booking dengan kode `SKM-I1-XXXX` + QR pengambilan, lacak status real-time, rincian sisa bayar setelah potongan.
- **Riwayat** (`/siswa/riwayat`): riwayat setoran sampah dan pemakaian poin.
- **Konsekuensi tidak mengambil pesanan**: pelanggaran pertama poin kembali penuh disertai peringatan, pelanggaran kedua poin hangus dan pre-order diblokir 3 hari. Sisa waktu blokir terlihat di halaman kantin.

### Petugas Bank Sampah
- **Panel setoran** (`/petugas`): pemindai kamera langsung (QR siswa) + input token manual sebagai cadangan, form jenis & berat sampah, konversi poin otomatis.
- **Riwayat** (`/petugas/riwayat`): tabel riwayat setoran + ekspor CSV.

### Penjual Kantin
- **Papan pesanan** (`/kantin`): papan real-time dikelompokkan per slot jam istirahat, menampilkan catatan siswa, dan aksi per status — `Terima Pesanan`, `Tolak`, `Siap Diambil`, `Selesai Diambil`, `Tidak Diambil`. Menolak pesanan mengembalikan poin siswa saat itu juga.
- **Verifikator tiket** (`/kantin/scan`): pindai QR tiket pesanan, verifikasi keaslian & statusnya.
- **Kelola menu** (`/kantin/menu`): tambah/ubah/hapus item menu per stand, termasuk harga poin tiap item.

### Publik
- **Landing** (`/`): penjelasan singkat + ajakan daftar.
- **Papan skor** (`/papan-skor`): papan peringkat kelas + statistik dampak lingkungan (estimasi CO2e), tanpa login.

### Akun & autentikasi
- **Daftar** (`/register`): khusus siswa, kelas dipilih dari daftar resmi, konfirmasi email lewat alur asli Supabase.
- **Masuk** (`/login`) dan **cek email** (`/cek-email`).
- **Lupa kata sandi** (`/lupa-password`): meminta tautan reset, lalu **atur kata sandi baru** (`/reset-password`). Tautannya sekali pakai dan hanya berlaku di peramban yang memintanya.
- **Halaman auth sadar HP**: kolom isian 16px supaya iOS Safari tidak memperbesar halaman saat kolom difokuskan, dan tombol kirim tidak tertutup papan ketik.

---

## Teknologi

| Lapisan | Pilihan |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 |
| Bahasa | TypeScript (strict) |
| Styling | Tailwind CSS 3 |
| Backend | Supabase (Auth, Postgres, RLS, Realtime) |
| Ikon | `lucide-react` (100% ikon, tanpa emoji) |
| QR code | `qrcode.react` (generate) + `html5-qrcode` (kamera) |
| Animasi | CSS + `framer-motion`; `gsap` hanya dimuat di perangkat kuat |
| Font | Plus Jakarta Sans / Inter |

Desain **Clean Emerald Eco-App**: header emerald `#0A7A44` dengan sudut bawah membulat, latar `#F4F7F5`, kartu putih berbingkai tipis, mobile-first, target kontras WCAG AA.

**Gerak (animasi).** Ada dua tingkat, ditentukan sekali di `<html data-tier>` sebelum React hidup: `full` untuk perangkat kuat, `lite` untuk perangkat hemat atau saat pengguna meminta gerak minimum (`prefers-reduced-motion`). `gsap` tidak pernah masuk bundel awal — ia hanya di-`import()` saat tingkat `full` benar-benar dipakai. Seluruh animasi hanya memakai `transform` dan `opacity`.

---

## Struktur Proyek

```
skamuda-ecohub/
├─ supabase/
│  ├─ migrations/001_production_live.sql  # skema, RLS, trigger, RPC (jalankan PERTAMA)
│  ├─ migrations/latest_update.sql        # pembaruan pre-order, tiga bagian berlabel
│  ├─ migrations/005_kurs_poin.sql        # kurs poin Rp10 -> Rp5, untuk DB yang sudah terisi
│  ├─ migrations/00{2,3,4}_*.sql          # riwayat: isi latest_update.sql, dipecah
│  ├─ seed.sql                            # data awal: kelas, config, menu, akun demo (KEDUA)
│  ├─ tests/                              # 36 asersi SQL untuk aturan pre-order
│  └─ production_seed_roles.sql           # query provisioning peran admin/petugas/kantin
├─ scripts/                               # gerbang verifikasi + runner SQL dari terminal
│  ├─ check-types                         # tsc --noEmit
│  ├─ check-sql.mjs                       # menjalankan supabase/tests/*.sql
│  ├─ check-preorder-rules.ts             # aturan bayar poin (murni, tanpa impor)
│  ├─ check-motion-tiers.ts               # ambang tingkat gerak (murni, tanpa impor)
│  └─ db.mjs                              # menjalankan satu berkas SQL
├─ docs/
│  ├─ DEPLOY-CHECKLIST.md                 # langkah deploy + penghalang yang diketahui
│  └─ superpowers/                        # catatan desain & rencana yang sudah dijalankan
├─ src/
│  ├─ app/
│  │  ├─ (auth)/         # login, register, cek-email, lupa-password, reset-password
│  │  ├─ (app)/          # halaman terproteksi (siswa, petugas, kantin)
│  │  ├─ auth/callback/  # handler konfirmasi & reset dari Supabase
│  │  ├─ papan-skor/     # papan peringkat publik
│  │  └─ page.tsx        # landing publik
│  ├─ components/        # UI, motion, siswa, petugas, kantin, qr, layout
│  ├─ lib/               # supabase client/server/middleware, format, device-tier, preorder
│  └─ types/database.ts  # tipe tabel & enum
├─ middleware.ts         # guard rute + refresh sesi
└─ .env.example
```

---

## Menjalankan Secara Lokal

### 1. Prasyarat
- Node.js 18.18+ (disarankan 20+)
- Sebuah project Supabase (gratisan cukup)

### 2. Install dependensi
```bash
npm install
```

### 3. Siapkan environment
Salin `.env.example` menjadi `.env.local`, lalu isi dari **Supabase Dashboard → Project Settings → API**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # opsional, hanya untuk tugas admin/seed
SUPABASE_DB_URL=postgresql://...               # hanya untuk skrip terminal (Session pooler)
```

### 4. Buat skema database
Buka **Supabase Dashboard → SQL Editor**, lalu jalankan berurutan:
1. `supabase/migrations/001_production_live.sql`: tabel, enum, indeks, trigger, RPC, dan seluruh kebijakan RLS.
2. `supabase/seed.sql`: 30 kelas resmi, jenis sampah, tier voucher, 2 stand kantin + contoh menu, dan 4 akun demo.
3. `supabase/migrations/latest_update.sql`: pembaruan pre-order (nilai status baru, penalti siswa, mode bayar poin, dan aturan satu pesanan aktif). Berkas ini **tiga bagian berlabel**: tempel Bagian 1 → Run, Bagian 2 → Run, lalu Bagian 3 yang hanya memeriksa. Baris `RINGKASAN` harus berbunyi `SEMUA ADA (16/16)`.
4. `supabase/migrations/005_kurs_poin.sql`: **hanya perlu** untuk database yang sudah terlanjur di-seed dengan kurs lama (1 poin = Rp10). `seed.sql` sekarang sudah memakai kurs Rp5. Jalankan, lalu pastikan `RINGKASAN` berbunyi `SESUAI`.

> Jalankan migrasi dulu, baru seed.

> Dari terminal, satu berkas SQL bisa dijalankan dengan `node --env-file=.env.local scripts/db.mjs <berkas.sql>`.

Langkah lengkap untuk deploy ke produksi, termasuk penghalang yang sudah diketahui (pengiriman email reset dan realtime), ada di [`docs/DEPLOY-CHECKLIST.md`](docs/DEPLOY-CHECKLIST.md). Berkas `00{2,3,4}_*.sql` di folder migrations adalah riwayat yang tidak perlu dijalankan lagi; isinya sudah ada di `latest_update.sql`.

### 5. (Opsional) Aktifkan konfirmasi email
Di **Authentication → Providers → Email**, pastikan email confirmation aktif. Arahkan **Site URL**/**Redirect URLs** ke `http://localhost:3000/auth/callback` (dan domain produksi setelah deploy). Alur lupa kata sandi memakai callback yang sama.

### 6. Jalankan
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000).

---

## Akun Demo (dari `seed.sql`)

| Peran | Email | Password |
| --- | --- | --- |
| Siswa | `siswa.demo@skamuda.sch.id` | `Skamuda2026!` |
| Petugas Bank Sampah | `petugas.demo@skamuda.sch.id` | `Skamuda2026!` |
| Penjual Kantin (Berkah) | `kantin.berkah@skamuda.sch.id` | `Skamuda2026!` |
| Penjual Kantin (Sehat) | `kantin.sehat@skamuda.sch.id` | `Skamuda2026!` |

> Ganti password dan hapus akun demo sebelum dipakai di produksi nyata.

---

## Alur Pendaftaran & Peran

- **Siswa mendaftar sendiri** di `/register`. Formulir hanya untuk siswa (tanpa pilihan peran), dan **kelas dipilih dari daftar resmi** (X/XI/XII × TKJ, TKR, MAPER, HOTEL, ASKEP, FARMASI), tanpa input manual. Konfirmasi email memakai alur asli Supabase.
- **Petugas Bank Sampah** dan **Penjual Kantin tidak bisa mendaftar sendiri.** Akunnya dibuat oleh admin, lalu perannya diubah lewat query di `supabase/production_seed_roles.sql`.
- Peran disimpan di kolom `profiles.role` dan dipakai baik oleh RLS maupun middleware rute, bukan sekadar di sisi klien.

---

## Model Data

Tabel inti (semua di `public`):

| Tabel | Fungsi |
| --- | --- |
| `profiles` | Profil pengguna: `role`, `points_balance`, `total_recycled_kg`, `qr_code_token` (uuid unik), kelas, serta penalti `unclaimed_orders_count` dan `preorder_blocked_until`. |
| `classes` | Daftar kelas resmi (dapat diedit admin). |
| `waste_item_types` | Jenis sampah + `points_per_kg` (per satuan untuk botol/kaleng, per kg untuk sisanya). |
| `voucher_tiers` | Tier tukar poin: 500 → Rp2.500, 1.200 → Rp6.000, 2.500 → Rp12.500. |
| `canteen_stands` | Stand kantin. |
| `menu_items` | Menu per stand: `price_idr`, `points_price` (`null` berarti tidak bisa dibayar poin), kategori, ketersediaan. |
| `waste_deposits` | Catatan setoran sampah (petugas). |
| `vouchers` | Voucher hasil tukar poin; menyimpan `order_id` dan `refunded_at` bila poinnya dikembalikan. |
| `orders` | Pesanan: `booking_code` (`SKM-I1-XXXX`), `pickup_time_slot`, `status`, `notes`, `total_price`, `discount_applied`, `payment_mode` (`cash`/`points`), `points_paid`, `points_refunded`. |
| `order_items` | Item per pesanan, dengan `item_notes`. |

Status pesanan: `awaiting_approval` → `processing` → `ready_for_pickup` → `completed`, ditambah `cancelled` (ditolak penjual) dan `unclaimed` (tidak diambil). Nilai lama `pending` dipensiunkan dan tidak pernah dipakai lagi.

### RPC atomik (SECURITY DEFINER)
- `lookup_student_by_token(p_qr_token)`: validasi QR siswa oleh petugas.
- `process_waste_deposit(p_qr_token, p_item_type, p_quantity, p_weight_kg)`: catat setoran + tambah poin (`floor(points_per_kg × weight_kg)`).
- `place_order(p_stand_id, p_slot, p_notes, p_items jsonb, p_voucher_points default 0, p_payment_mode default 'cash')`: buat pesanan + item + potong poin secara atomik. Menegakkan satu pesanan aktif per siswa, semua item dari satu stand, dan menolak mode `points` bila ada item tanpa harga poin (`PZ004`).
- `vendor_resolve_order(p_order_id, p_action)`: `Terima Pesanan`, `Tolak`, `Siap Diambil`, `Selesai Diambil`, `Tidak Diambil`. Penolakan mengembalikan poin siswa dan menandai vouchernya dikembalikan.
- `get_preorder_status()`: apakah siswa sedang diblokir dan sampai kapan.
- `get_class_leaderboard()`: peringkat kelas untuk papan skor publik.
- `get_impact_stats()`: statistik dampak (total kg, estimasi CO2e).

### Catatan perhitungan
- `total_price` = harga bruto; `discount_applied` = potongan; yang dibayar = `total_price − discount_applied`. Di mode `points`, `discount_applied` = seluruh subtotal dan `points_paid` = harga poin penuh.
- Poin yang sudah didebit selalu dikembalikan lewat satu jalur: `points_paid`. Karena itu penolakan pesanan mengembalikan penuh, sedangkan pelanggaran kedua menghanguskan.
- **Kurs poin: 1 poin = Rp5.** Potongan voucher ditanggung penjual kantin — aplikasi ini tidak punya mekanisme penggantian — jadi kursnya sengaja tidak 1:1 dengan rupiah. Contoh: Nasi Ayam Bakar Rp15.000 = 3.000 poin, dan voucher 500 P = potongan Rp2.500. Kurs hidup di data (`seed.sql`, `005_kurs_poin.sql`), bukan di kode aplikasi, jadi mengubahnya tidak perlu build ulang.
- Estimasi dampak memakai faktor **2,5 kg CO2e per kg** material campuran (angka konservatif yang didokumentasikan, bukan klaim pengukuran presisi).

---

## Keamanan (RLS)

- Siswa hanya bisa membaca/mengubah barisnya sendiri; staf (petugas/kantin) dapat membaca data yang relevan.
- Pendaftaran publik dibatasi hanya peran siswa lewat trigger, dan ada trigger `prevent_profile_escalation` untuk mencegah siswa menaikkan perannya atau memanipulasi saldo poin, jumlah pelanggaran, dan masa blokir. RPC internal menandai bypass terkontrol (`app.allow_profile_system_update`) saat memang perlu mengubah profil.
- Seluruh perubahan saldo poin terjadi di dalam RPC `SECURITY DEFINER`, bukan dari klien.
- Aturan **satu pesanan aktif per siswa** ditegakkan index unik parsial di database, bukan hanya di klien — memanggil REST Supabase langsung pun tetap ditolak (`PZ002`).

---

## Gerbang Verifikasi

```bash
bash scripts/check-types                       # tsc: 0 error
npm run build                                  # build produksi
node --experimental-strip-types scripts/check-motion-tiers.ts     # ambang tingkat gerak
node --experimental-strip-types scripts/check-preorder-rules.ts   # aturan bayar poin
node --env-file=.env.local scripts/check-sql.mjs \
  supabase/tests/001_schema_probe.sql \
  supabase/tests/002_preorder_rules.sql \
  supabase/tests/003_preorder_resolution.sql   # 36 asersi ke database
```

Tidak ada ESLint di proyek ini; `tsc` dan `npm run build` adalah gerbang statisnya.

---

## Deploy (Vercel)

1. Push repo ini ke Git.
2. Impor project di Vercel.
3. Tambahkan environment variables yang sama seperti `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; tambahkan `SUPABASE_SERVICE_ROLE_KEY` bila dipakai server-side). `SUPABASE_DB_URL` tidak diperlukan di Vercel.
4. Setelah deploy, perbarui **Site URL** dan **Redirect URLs** di **Supabase → Authentication → URL Configuration** ke `https://<domain-kamu>/auth/callback`.
5. Build command: `npm run build`, output standar Next.js.
6. Jalankan migrasi yang belum dijalankan di database produksi, lalu telusuri [`docs/DEPLOY-CHECKLIST.md`](docs/DEPLOY-CHECKLIST.md).

---

## Verifikasi Cepat (smoke test)

```bash
npm run dev
```
- `/`, `/login`, `/register`, `/cek-email`, `/lupa-password`, `/papan-skor` → **200** (halaman publik). `/reset-password` hanya berguna dengan tautan dari email.
- `/siswa`, `/petugas`, `/kantin` tanpa login → **redirect ke `/login`**.

Untuk uji penuh: login demo → buka QR siswa → pindai di panel petugas → lihat poin bertambah → pesan di kantin (isi catatan + tukar voucher, atau bayar penuh dengan poin) → cek papan pesanan vendor real-time → ubah status sampai selesai → uji `Tidak Diambil` → verifikasi tiket → ekspor CSV riwayat → cek `/papan-skor` ikut ter-update.

---

## Lisensi

Proyek internal untuk lingkungan SMKN 1 Murung Pudak.
