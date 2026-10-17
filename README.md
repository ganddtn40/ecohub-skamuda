# SKAMUDA EcoHub

Ekosistem digital **SMKN 1 Murung Pudak**: Bank Sampah berbasis poin + Pre-Order Kantin Pintar dalam satu aplikasi web.

Aplikasi ini menghubungkan tiga peran dalam satu alur:

- **Siswa** menyetor sampah, mengumpulkan poin, lalu menukarnya jadi potongan harga makanan di kantin lewat pre-order.
- **Petugas Bank Sampah** memindai QR siswa, mencatat setoran, dan mengonversinya jadi poin secara otomatis.
- **Penjual Kantin** mengelola menu, menerima pesanan real-time per jam istirahat, dan memverifikasi tiket saat pengambilan.

Semua data hidup di Supabase (Auth + Postgres + RLS + Realtime). Tidak ada data mock atau fallback `localStorage`.

---

## Fitur

### Siswa
- **Kartu QR pribadi** (`/siswa/qr`): token QR unik per akun untuk dipindai petugas.
- **Dashboard** (`/siswa`): saldo poin, total sampah didaur ulang, progres target harian.
- **Kantin** (`/siswa/kantin`): filter per stand, keranjang, catatan khusus per item & per pesanan, tukar poin, checkout.
- **Pesanan** (`/siswa/pesanan`): tiket booking dengan kode `SKM-I1-XXXX` + QR pengambilan, lacak status real-time.
- **Riwayat** (`/siswa/riwayat`): riwayat setoran sampah dan pemakaian poin.

### Petugas Bank Sampah
- **Panel setoran** (`/petugas`): pemindai kamera langsung (QR siswa) + input token manual sebagai cadangan, form jenis & berat sampah, konversi poin otomatis.
- **Riwayat** (`/petugas/riwayat`): tabel riwayat setoran + ekspor CSV.

### Penjual Kantin
- **Papan pesanan** (`/kantin`): papan real-time dikelompokkan per slot jam istirahat, menampilkan catatan siswa, ubah status (menunggu → disiapkan → siap diambil → selesai).
- **Verifikator tiket** (`/kantin/scan`): pindai QR tiket pesanan, verifikasi keaslian & statusnya.
- **Kelola menu** (`/kantin/menu`): tambah/ubah/hapus item menu per stand.

### Publik
- **Landing** (`/`): penjelasan singkat + ajakan daftar.
- **Papan skor** (`/papan-skor`): papan peringkat kelas + statistik dampak lingkungan (estimasi CO2e), tanpa login.

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
| Font | Plus Jakarta Sans / Inter |

Desain **Clean Emerald Eco-App**: header emerald `#0A7A44` dengan sudut bawah membulat, latar `#F4F7F5`, kartu putih berbingkai tipis, mobile-first, target kontras WCAG AA.

---

## Struktur Proyek

```
skamuda-ecohub/
├─ supabase/
│  ├─ migrations/001_production_live.sql   # skema, RLS, trigger, RPC (jalankan PERTAMA)
│  ├─ migrations/latest_update.sql         # pembaruan pre-order, tiga bagian berlabel
│  ├─ migrations/00{2,3,4}_*.sql           # riwayat: isi latest_update.sql, dipecah
│  ├─ seed.sql                             # data awal: kelas, config, akun demo (jalankan KEDUA)
│  └─ production_seed_roles.sql            # query provisioning peran admin/petugas/kantin
├─ src/
│  ├─ app/
│  │  ├─ (auth)/         # login, register, cek-email
│  │  ├─ (app)/          # halaman terproteksi (siswa, petugas, kantin)
│  │  ├─ auth/callback/  # handler konfirmasi email Supabase
│  │  ├─ papan-skor/     # papan peringkat publik
│  │  └─ page.tsx        # landing publik
│  ├─ components/        # UI, siswa, petugas, kantin, qr, layout
│  ├─ lib/               # supabase client/server/middleware, auth, csv, format, constants
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
```

### 4. Buat skema database
Buka **Supabase Dashboard → SQL Editor**, lalu jalankan berurutan:
1. `supabase/migrations/001_production_live.sql`: tabel, enum, indeks, trigger, RPC, dan seluruh kebijakan RLS.
2. `supabase/seed.sql`: 30 kelas resmi, jenis sampah, tier voucher, 2 stand kantin + contoh menu, dan 4 akun demo.
3. `supabase/migrations/latest_update.sql`: pembaruan pre-order (nilai status baru, penalti siswa, mode bayar poin, dan aturan satu pesanan aktif). Berkas ini **tiga bagian berlabel dan harus ditempel dua kali** — Bagian 1, lalu Bagian 2, lalu Bagian 3 untuk memastikan. Alasannya ada di kepala berkasnya.

> Jalankan migrasi dulu, baru seed.

> Dari terminal, seluruh berkas sekaligus bisa: `node --env-file=.env.local scripts/db.mjs supabase/migrations/latest_update.sql`.

Langkah lengkap untuk deploy ke produksi, termasuk dua penghalang yang sudah diketahui (email reset dan realtime), ada di [`docs/DEPLOY-CHECKLIST.md`](docs/DEPLOY-CHECKLIST.md). Berkas `00{2,3,4}_*.sql` di folder migrations adalah riwayat yang tidak perlu dijalankan lagi; isinya sudah ada di `latest_update.sql`.

### 5. (Opsional) Aktifkan konfirmasi email
Di **Authentication → Providers → Email**, pastikan email confirmation aktif. Arahkan **Site URL**/**Redirect URLs** ke `http://localhost:3000/auth/callback` (dan domain produksi setelah deploy).

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
| `profiles` | Profil pengguna: `role`, `points_balance`, `total_recycled_kg`, `qr_code_token` (uuid unik), kelas. |
| `classes` | Daftar kelas resmi (dapat diedit admin). |
| `waste_item_types` | Jenis sampah + `points_per_kg`. |
| `voucher_tiers` | Tier tukar poin (500 → Rp5.000, 1.200 → Rp12.000, 2.500 → Rp25.000). |
| `canteen_stands` | Stand kantin. |
| `menu_items` | Menu per stand, harga, status ketersediaan. |
| `waste_deposits` | Catatan setoran sampah (petugas). |
| `vouchers` | Voucher hasil tukar poin. |
| `orders` | Pesanan: `booking_code` (`SKM-I1-XXXX`), `slot` (Istirahat 1 / 2), status, `notes`, `total_price`, `discount_applied`. |
| `order_items` | Item per pesanan, dengan `item_notes`. |

### RPC atomik (SECURITY DEFINER)
- `lookup_student_by_token(p_qr_token)`: validasi QR siswa oleh petugas.
- `process_waste_deposit(p_qr_token, p_item_type, p_quantity, p_weight_kg)`: catat setoran + tambah poin (`floor(points_per_kg × weight_kg)`).
- `place_order(p_stand_id, p_slot, p_notes, p_items jsonb, p_voucher_points)`: buat pesanan + item + potong poin secara atomik (semua item harus dari satu stand).
- `get_class_leaderboard()`: peringkat kelas untuk papan skor publik.
- `get_impact_stats()`: statistik dampak (total kg, estimasi CO2e).

### Catatan perhitungan
- `total_price` = harga bruto; `discount_applied` = potongan voucher; yang dibayar = `total_price − discount_applied`.
- Estimasi dampak memakai faktor **2,5 kg CO2e per kg** material campuran (angka konservatif yang didokumentasikan, bukan klaim pengukuran presisi).

---

## Keamanan (RLS)

- Siswa hanya bisa membaca/mengubah barisnya sendiri; staf (petugas/kantin) dapat membaca data yang relevan.
- Pendaftaran publik dibatasi hanya peran siswa lewat trigger, dan ada trigger `prevent_profile_escalation` untuk mencegah siswa menaikkan perannya atau memanipulasi saldo poin. RPC internal menandai bypass terkontrol (`app.allow_profile_system_update`) saat memang perlu mengubah profil.
- Seluruh perubahan saldo poin terjadi di dalam RPC `SECURITY DEFINER`, bukan dari klien.

---

## Deploy (Vercel / Netlify)

1. Push repo ini ke Git.
2. Impor project di Vercel/Netlify.
3. Tambahkan environment variables yang sama seperti `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; tambahkan `SUPABASE_SERVICE_ROLE_KEY` bila dipakai server-side).
4. Setelah deploy, perbarui **Site URL** dan **Redirect URLs** di Supabase Auth ke `https://<domain-kamu>/auth/callback`.
5. Build command: `npm run build`, output standar Next.js.

---

## Verifikasi Cepat (smoke test)

```bash
npm run dev
```
- `/`, `/login`, `/register`, `/cek-email`, `/papan-skor` → **200** (halaman publik).
- `/siswa`, `/petugas`, `/kantin` tanpa login → **redirect ke `/login`**.

Untuk uji penuh: login demo → buka QR siswa → pindai di panel petugas → lihat poin bertambah → pesan di kantin (isi catatan + tukar voucher) → cek papan pesanan vendor real-time → verifikasi tiket → ekspor CSV riwayat → cek `/papan-skor` ikut ter-update.

---

## Lisensi

Proyek internal untuk lingkungan SMKN 1 Murung Pudak.
