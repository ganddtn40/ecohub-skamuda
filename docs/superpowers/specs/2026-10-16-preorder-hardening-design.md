# Pengerasan Pre-Order Kantin & Perbaikan Autentikasi — Desain

Tanggal: 2026-10-16
Status: disetujui untuk masuk tahap perencanaan
Ruang lingkup: `skamuda-ecohub` (Next.js App Router + TypeScript + Supabase)

---

## 1. Maksud

Siswa bisa membuat pesanan kantin fiktif: memesan pre-order lalu tidak pernah
mengambilnya, tanpa biaya apa pun. Penjual menanggung kerugian bahan, dan tidak
ada mekanisme yang membuat siswa menanggung komitmennya. Akibat turunannya:
penjual berhenti mempercayai fitur pre-order, dan siswa yang berniat baik ikut
dirugikan karena menunya sudah dimasak untuk orang yang tidak datang.

Keberhasilan diukur dari empat hal:

1. Seorang siswa **tidak bisa** memiliki lebih dari satu pesanan aktif, bahkan
   jika ia memanggil REST Supabase langsung dari konsol browser.
2. Penjual dapat **menolak** pesanan sebelum memasak, dan poin siswa yang sudah
   dipotong kembali utuh saat itu juga.
3. Siswa yang tidak mengambil pesanan menerima konsekuensi yang **bertingkat**:
   pelanggaran pertama dimaafkan, pelanggaran kedua baru berbiaya.
4. Halaman login rapi dan bisa dipakai di HP sempit, dan pengguna yang lupa
   kata sandi bisa memulihkannya sendiri tanpa menghubungi admin.

Pengguna: siswa SMKN 1 Murung Pudak, penjual kantin sekolah, dan petugas bank
sampah. Yang paling terdampak adalah penjual kantin.

## 2. Batasan

- Tidak ada data palsu. Semua yang tampil berasal dari database live.
- Gaya visual, palet, tipografi, dan token yang sudah ada dipertahankan
  (`solidarity` / Clean Emerald Eco-App, Plus Jakarta Sans, radius pill/control/card).
- 100% ikon Lucide. Tidak ada emoji sebagai pengganti ikon atau gambar.
- Aturan Anti-Slop diterapkan selama pengerjaan (mode DURING).
- `npx tsc --noEmit` adalah gerbang sebenarnya; ESLint diabaikan saat build.
- Semua fitur, rute, auth, API, skema, dan logika bisnis yang ada dipertahankan.

## 3. Keputusan yang sudah diambil

Dipisahkan antara yang Anda putuskan dan yang saya tetapkan, supaya bisa
dikoreksi.

**Keputusan Anda:**

| Topik | Keputusan |
|---|---|
| Tempat aturan bisnis | Di database, satu RPC per transisi (pendekatan A) |
| Perlakuan poin saat `unclaimed` | Bertingkat: pelanggaran 1 poin kembali penuh + peringatan; pelanggaran 2 poin hangus + blokir 3 hari |
| Bentuk blokir | Kolom waktu `preorder_blocked_until`; `unclaimed_orders_count` direset setelah blokir berakhir |
| Mesin animasi | CSS + framer-motion |
| Mode Anti-Slop | DURING |

**Keputusan saya (koreksi bila salah):**

| Topik | Keputusan | Alasan |
|---|---|---|
| Model bayar di checkout | Voucher parsial tetap ada, **ditambah** opsi bayar penuh dengan poin | Opsi poin penuh Anda minta eksplisit; menghapus voucher tidak pernah diminta, dan instruksi lama adalah mempertahankan fitur yang ada |
| Kurs poin | 1 poin = Rp10, memakai `menu_items.points_price` yang sudah terisi | Datanya sudah konsisten: Nasi Ayam Bakar Rp15.000 = 1.500 poin, dan voucher 500 P = Rp5.000 |
| "Uang Pas" | Bayar tunai pas di counter saat mengambil, tanpa kembalian | Pembacaan saya atas judul Opsi B; bukan pembayaran di muka |
| Nilai enum `pending` | Dipensiunkan (tetap ada di tipe, tidak dipakai lagi) | Postgres tidak bisa menghapus nilai enum tanpa membongkar tipe; risikonya tidak sebanding pada DB live |
| `unclaimed` dari mana | Hanya dari `ready_for_pickup` | Siswa tidak boleh dicap "tidak diambil" untuk makanan yang belum pernah dinyatakan siap oleh penjual |
| Lokasi lupa password | Halaman `/lupa-password`, bukan modal | Konsisten dengan shell auth yang ada dan bebas dari urusan fokus/escape modal |

## 4. Non-tujuan (YAGNI)

Sengaja tidak dikerjakan. Semuanya bisa ditambahkan nanti tanpa membongkar
desain ini:

- Tombol batal pesanan untuk siswa sendiri.
- Halaman admin untuk mengelola atau membebaskan penalti siswa.
- Notifikasi email atau push saat status pesanan berubah.
- Tabel ledger poin generik (yang ada dipakai sebagai ledger).
- Cron atau pg_cron untuk membersihkan blokir kedaluwarsa.
- Ekspor CSV riwayat penalti.

## 5. Desain

### 5.1 Skema dan mesin status

**Mesin transisi.** Semua perpindahan status divalidasi di database.

| Dari | Aksi | Ke | Efek samping |
|---|---|---|---|
| `awaiting_approval` | `accept` | `processing` | — |
| `awaiting_approval` | `reject` | `cancelled` | Poin kembali penuh, tanpa penalti |
| `processing` | `ready` | `ready_for_pickup` | — |
| `processing` | `complete` | `completed` | — |
| `ready_for_pickup` | `complete` | `completed` | — |
| `ready_for_pickup` | `unclaimed` | `unclaimed` | Pelanggaran 1: poin kembali penuh. Pelanggaran 2: poin hangus + blokir 3 hari |

Status terminal: `completed`, `cancelled`, `unclaimed`. Tidak ada jalan kembali.

**Enum.** Tambah `'awaiting_approval'` dan `'unclaimed'` ke `public.order_status`.
Nilai `'pending'` tetap ada di tipe karena Postgres tidak mengizinkan penghapusan
nilai enum tanpa membongkar tipe, tetapi tidak pernah dipakai lagi dan diberi
komentar mati.

**Kolom baru.**

| Tabel | Kolom | Tipe | Alasan |
|---|---|---|---|
| `profiles` | `unclaimed_orders_count` | `integer not null default 0` | Jumlah pelanggaran berjalan |
| `profiles` | `preorder_blocked_until` | `timestamptz` | Blokir kedaluwarsa sendiri tanpa cron |
| `orders` | `payment_mode` | `text not null default 'cash' check (payment_mode in ('cash','points'))` | Tiket perlu tahu lunas poin atau tunai |
| `orders` | `points_paid` | `integer not null default 0 check (points_paid >= 0)` | Jumlah poin yang didebit saat checkout |
| `orders` | `points_refunded` | `integer not null default 0 check (points_refunded >= 0)` | Jejak pengembalian |
| `vouchers` | `order_id` | `uuid references public.orders(id) on delete set null` | Voucher bisa ditelusuri ke pesanannya |
| `vouchers` | `refunded_at` | `timestamptz` | Voucher yang dikembalikan punya jejak |

`points_paid` berlaku seragam untuk kedua mode: pada mode `cash` ia berisi biaya
voucher yang dipotong, pada mode `points` ia berisi harga penuh dalam poin. Jadi
aturan pengembaliannya satu: kredit sebesar `points_paid`, kecuali pada
pelanggaran kedua.

Untuk pesanan mode `points`, `discount_applied` diisi sama dengan `total_price`
supaya invarian lama tetap berlaku di seluruh UI dan struk: **sisa tunai =
`total_price - discount_applied`** (jadi Rp0). Tidak ada percabangan baru di
komponen tiket.

**Batas satu pesanan aktif sebagai invarian.** Bukan pengecekan yang bisa
kalah balapan, melainkan index:

```sql
create unique index if not exists orders_one_active_per_student
  on public.orders (student_id)
  where status in ('awaiting_approval', 'processing', 'ready_for_pickup');
```

RPC tetap memeriksa lebih dulu supaya pesan errornya ramah (kode `PZ002`), tetapi
index inilah yang membuat aturannya benar di bawah konkurensi. Dua permintaan
checkout bersamaan tidak bisa lolos berdua.

`place_order` juga sudah mengunci baris profil (`select ... for update`), sehingga
dua permintaan dari siswa yang sama terserialisasi di titik itu.

**Index pendukung.** `orders (student_id, status)` untuk pemeriksaan cepat.

**Guard profil diperluas.** `prevent_profile_escalation` sekarang mengunci
`role`, `points_balance`, `total_recycled_kg`, dan `qr_code_token`. Dua kolom baru
ditambahkan ke daftar itu. Tanpa ini, siswa bisa menghapus penaltinya sendiri
lewat `profiles.update` — RLS mengizinkan pembaruan profil sendiri, dan kolom
baru tidak akan terjaga.

**RLS.** Policy `orders_vendor_update` **dicabut**. Setelah ini satu-satunya cara
mengubah status adalah `vendor_resolve_order`. Policy baca (`orders_student_read`,
`orders_vendor_read`, `order_items_read`) tidak berubah. Tidak pernah ada policy
insert untuk `orders` maupun `order_items`, jadi RPC tetap satu-satunya jalan
membuat pesanan.

**Dua berkas migrasi.** Postgres menolak memakai nilai enum di transaksi yang sama
dengan saat nilai itu ditambahkan, dan SQL Editor menjalankan satu tempelan sebagai
satu transaksi. Karena itu:

- `supabase/migrations/002_preorder_schema.sql` — nilai enum baru, kolom baru,
  perluasan guard, dan index biasa. Tidak ada yang memakai nilai enum baru.
- `supabase/migrations/003_preorder_logic.sql` — ubah default kolom `status`,
  index unik parsial, `place_order` baru, `vendor_resolve_order`,
  `get_preorder_status`, dan pencabutan policy.

Keduanya idempoten (`if not exists` / `create or replace` / `drop ... if exists`)
dan harus bisa dijalankan dua kali tanpa error.

### 5.2 Kontrak RPC

Setiap RPC adalah `security definer`, sehingga **melewati RLS**. Karena itu setiap
RPC memeriksa sendiri tiga hal: peran pemanggil, kepemilikan data, lalu
`set_config('app.allow_profile_system_update', 'on', true)` sebelum menyentuh
`profiles`. Tanpa ketiganya, RLS dan guard profil hanya jadi hiasan.

**`place_order(p_stand_id, p_slot, p_notes, p_items, p_voucher_points, p_payment_mode)`**

Parameter baru `p_payment_mode text default 'cash'` diletakkan terakhir supaya
pemanggil lama tetap valid. Urutan langkah:

1. Wajib login, peran `student` (sudah ada).
2. **Baru:** reset malas. Jika `preorder_blocked_until` sudah lewat, set hitungan
   ke 0 dan kosongkan kolomnya.
3. **Baru:** tolak jika masih diblokir → `PZ001`.
4. **Baru:** tolak jika masih punya pesanan aktif, sebutkan kode booking-nya → `PZ002`.
5. Validasi slot, stand aktif, dan item (sudah ada).
6. Hitung subtotal dari `price_idr` (sudah ada).
7. Cabang pembayaran:
   - `cash` — perilaku sekarang, voucher parsial opsional. `points_paid` = biaya
     voucher, `discount_applied` = potongan, `payment_mode` = `'cash'`.
   - `points` — semua item wajib punya `points_price` (jika tidak → `PZ004`), saldo
     wajib mencukupi `sum(points_price × qty)` (jika tidak → `PZ003`). Potong saldo,
     `points_paid` = `sum(...)`, `discount_applied` = `total_price`,
     `payment_mode` = `'points'`.
8. Sisip pesanan dengan status `'awaiting_approval'`.

Nilai balik ditambah `status`, `payment_mode`, dan `points_paid`. UI memakai nilai
balik ini, bukan menghitung ulang di klien.

**`vendor_resolve_order(p_order_id uuid, p_action text) returns jsonb`**

Menggantikan `orders.update({ status })` di `OrderBoard`.

1. Wajib login dan peran `canteen_vendor`.
2. Pesanan harus ada, dan `orders.stand_id` harus milik `auth.uid()`. Pemeriksaan
   ini wajib karena `security definer` melewati RLS.
3. Aksi harus legal menurut tabel transisi, jika tidak → `PZ005`.
4. Efek:
   - `accept`, `ready`, `complete` — hanya mengubah status.
   - `reject` — status `cancelled`, lalu kembalikan poin penuh.
   - `unclaimed` — status `unclaimed`, lalu:
     - hitungan pelanggaran **sebelum** bertambah adalah 0 → kembalikan poin penuh,
       hitungan jadi 1, tidak diblokir;
     - hitungan **sebelum** bertambah ≥ 1 → poin tidak dikembalikan, hitungan jadi 2,
       `preorder_blocked_until` = `now() + interval '3 days'`.
5. Pengembalian poin: kredit `profiles.points_balance` sebesar `orders.points_paid`,
   isi `orders.points_refunded`, dan jika pesanan memakai voucher isi
   `vouchers.refunded_at` pada baris voucher pesanan itu.
6. Selalu set `updated_at` lewat trigger `orders_touch` yang sudah ada.

Nilai balik: `{ order_id, status, points_refunded, unclaimed_count, blocked_until }`.

**`get_preorder_status() returns jsonb`**

Satu panggilan untuk halaman kantin siswa, sekaligus tempat reset malas dijalankan
sehingga siswa tidak melihat "2/2 pelanggaran" padahal blokirnya sudah lewat.
Mengembalikan `{ is_blocked, blocked_until, unclaimed_count, active_order_id,
active_order_status, active_booking_code }`. Bersifat `volatile` karena boleh
menulis (reset malas). Saldo poin sengaja **tidak** ikut dikembalikan di sini:
halamannya sudah memegang `profile.points_balance`, dan dua sumber untuk angka yang
sama hanya menambah jalan untuk berbeda.

### 5.3 Penanganan error

Kegagalan aturan bisnis bukan error tak terduga, jadi diberi kode SQLSTATE sendiri
sehingga klien bisa memetakannya ke judul dan kalimat Indonesia alih-alih
menampilkan pesan mentah Postgres:

| Kode | Arti | Pesan ke pengguna |
|---|---|---|
| `PZ001` | Masih diblokir | "Pre-Order Kantin diblokir sampai <waktu>." |
| `PZ002` | Sudah punya pesanan aktif | "Kamu masih punya pesanan aktif (<kode>). Selesaikan atau tunggu penjual menolaknya." |
| `PZ003` | Saldo poin kurang | "Saldo poinmu belum cukup untuk membayar pesanan ini." |
| `PZ004` | Menu tidak bisa dibayar poin | "Ada menu yang belum punya harga poin. Bayar tunai untuk pesanan ini." |
| `PZ005` | Transisi tidak legal | "Status pesanan ini sudah berubah. Muat ulang halamannya." |

Jaring terakhir: jika aturan tetap tertembus, index unik melaporkan `23505`, dan
UI menerjemahkannya sebagai `PZ002`.

### 5.4 Halaman kantin siswa

`/siswa/kantin` punya tiga keadaan yang saling meniadakan.

**1. Diblokir** — `preorder_blocked_until` belum lewat. Katalog tidak dirender.
Diganti satu blok `bg-danger-50` (terisi, tanpa garis tepi): ikon `Ban`, judul 17px
"Pre-Order Kantin diblokir sementara", satu kalimat penjelas, waktu aktif kembali
dalam angka tabular, dan asal blokirnya ("2 pesanan sebelumnya tidak diambil").
Tidak ada tombol pesan. Ini lapisan penjelasan, bukan penegak — database tetap
menolak pesanan itu.

**2. Ada pesanan aktif** — katalog diganti kartu pesanan aktif: kode booking besar,
badge status, slot, stand, item, total, dan selama `awaiting_approval` kalimat
"Menunggu penjual menerima pesanan ini" plus "Kamu bisa memesan lagi setelah
pesanan ini selesai atau ditolak". Kartunya menaut ke `/siswa/pesanan` untuk tiket
QR. Ini muka terlihat dari aturan satu pesanan aktif.

**3. Bebas** — katalog yang sekarang.

**Peringatan pelanggaran pertama** — jika `unclaimed_orders_count = 1` dan belum
diblokir: satu blok `bg-gold-50` di atas katalog, "Satu pesanan sebelumnya tidak
diambil. Kalau terulang, poin hangus dan Pre-Order diblokir 3 hari." Satu kalimat.

**Pemilih pembayaran** di dalam sheet checkout, di atas blok "Tukar poin":
"Bayar tunai di kantin" dan "Bayar penuh dengan poin — <n> P". Opsi poin nonaktif
jika ada item tanpa `points_price` atau saldo kurang, dengan alasan tertulis, bukan
tombol mati tanpa keterangan. Memilih poin menyembunyikan tier voucher (kalau tidak,
poin terpotong dua kali) dan ringkasannya menjadi Subtotal, "Dibayar dengan poin
−<n> P", "Sisa tunai Rp0".

**Dua perbaikan yang terbawa.** `MenuCatalog` sekarang menulis `status: "pending"`
secara hard-code di tiket lokal dan menghitung ulang subtotal di klien. Nilai
tiketnya diambil dari hasil RPC supaya tidak bisa berbeda dari isi database.

**Berkas:** `src/app/(app)/siswa/kantin/page.tsx`,
`src/components/student/MenuCatalog.tsx`,
`src/components/student/BookingTicket.tsx`, komponen baru
`src/components/student/PreorderGate.tsx`.

### 5.5 Papan penjual

**Tombol mengikuti tabel transisi**, bukan satu rantai "berikutnya".
`NEXT_ACTION` dan `activeStatuses` di `OrderBoard` sekarang menulis `pending`
secara hard-code, jadi keduanya diganti:

| Status | Aksi primer | Aksi sekunder |
|---|---|---|
| `awaiting_approval` | Terima Pesanan | Tolak |
| `processing` | Siap Diambil | — |
| `ready_for_pickup` | Selesai Diambil | Tidak Diambil |

"Ditolak" dan "Tidak Diambil" lewat dialog konfirmasi, karena salah ketuk pada
"Tidak Diambil" menghanguskan poin siswa dan menambah pelanggaran. Semua aksi
memanggil `vendor_resolve_order` dan memetakan `PZ0xx` menjadi kalimat Indonesia.

**Kedatangan pesanan baru.** `RealtimeRefresher` sudah menyegarkan papan saat ada
baris baru. Ia diperluas supaya juga memunculkan toast "Pesanan baru · <n> item ·
<slot>" dengan aksi "Lihat" yang menyaring papan ke `awaiting_approval`. Papan
diberi penghitung "Menunggu diterima: <n>" dan filter bawaan mengarah ke sana,
karena sekarang semua status bercampur dalam satu daftar.

**Berkas:** `src/app/(app)/kantin/page.tsx`, `src/components/vendor/OrderBoard.tsx`,
`src/components/realtime/RealtimeRefresher.tsx`, komponen baru
`src/components/ui/Toast.tsx` dan `src/components/ui/ConfirmDialog.tsx`.

**Perapian kecil yang ditemukan sambil membaca:** pill filter di `MenuCatalog` dan
`OrderBoard` membawa `border-eco-600` yang tidak berefek apa pun (Tailwind
mematikan lebar border secara default), dan kartu papan penjual menyisakan `pt-3`
dari garis pemisah yang dulu dihapus.

### 5.6 Autentikasi: mobile dan lupa password

**Layout mobile.** `<main>` di `src/app/(auth)/layout.tsx` sekarang memakai
`page-x` dan `-mt-7` tanpa pemusatan vertikal. Bentuk yang diminta
(`min-h-screen` + `items-center justify-center`) membawa jebakan: pada flex column
dengan `justify-center`, begitu isi lebih tinggi dari wadahnya, bagian **atas**
terpotong dan tidak terjangkau scroll — tepat gejala yang ingin dihilangkan.

Solusinya bentuk aman: wadah `min-h-dvh overflow-y-auto`, pemusatan lewat `my-auto`
pada kartu (auto-margin runtuh jadi nol saat tidak ada ruang kosong), padding
`px-4 py-6` di bawah `sm`. Tampilannya sama, tidak ada elemen yang bisa hilang.
`dvh` dipakai, bukan `vh`, supaya viewport ikut menyusut saat keyboard terbuka;
halaman tetap scrollable; dan kolom input diberi jarak scroll bawah supaya field
yang difokus berada di atas keyboard.

**Lupa password.**

- Tautan "Lupa password?" tepat di bawah kolom kata sandi, `text-[15px]`,
  mengarah ke `/lupa-password`.
- `/lupa-password` — satu kolom email. Memanggil
  `supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/auth/callback?next=/reset-password })`.
  Pesan suksesnya sengaja tidak membocorkan apakah email terdaftar: "Kalau email
  itu terdaftar, tautan reset sudah dikirim." Email yang tidak ada mendapat halaman
  dan pesan yang sama.
- `/reset-password` — dua kolom sandi (baru + ulangi) →
  `supabase.auth.updateUser({ password })` → `signOut({ scope: 'others' })` supaya
  sesi lama di perangkat lain ikut berakhir → arahkan ke dashboard sesuai peran.
  Tanpa sesi recovery, halaman menampilkan "Tautan tidak valid atau sudah
  kedaluwarsa" dengan jalan kembali ke `/lupa-password`, bukan error mentah.
- `/auth/callback` **sudah** menangani `type=recovery` dan sudah meneruskan `next`,
  jadi tidak diubah.
- `ROUTE` dan `PUBLIC_PATHS` di `src/lib/constants.ts` bertambah dua entri.
  `/reset-password` harus **tetap di luar** cabang "sudah login → tendang ke
  dashboard" di `src/lib/supabase/middleware.ts`. Cabang itu sekarang cocok persis
  untuk `/login` dan `/register`; kalau `/reset-password` ikut masuk, pengguna yang
  baru mengeklik tautan reset akan dilempar ke dashboard sebelum sempat mengganti
  sandinya.

**Berkas:** `src/app/(auth)/layout.tsx`, `src/components/auth/LoginForm.tsx`,
`src/lib/auth-errors.ts`, `src/lib/constants.ts`, `src/lib/supabase/middleware.ts`,
`src/lib/auth.ts` (kolom profil baru ikut di `PROFILE_COLUMNS`), halaman baru
`src/app/(auth)/lupa-password/page.tsx` dan
`src/app/(auth)/reset-password/page.tsx`, komponen baru
`src/components/auth/ForgotPasswordForm.tsx` dan
`src/components/auth/ResetPasswordForm.tsx`.

### 5.7 Animasi

Prinsip: framer-motion untuk yang butuh keadaan masuk/keluar, CSS untuk sisanya.

- **Reduced motion sekali pasang.** `<MotionConfig reducedMotion="user">` di root,
  jadi seluruh animasi framer-motion menghormati setelan sistem. Media query CSS
  yang sudah ada tetap dipertahankan.
- **Press.** `active:scale-95 transition-transform duration-150` pada CTA, tombol
  tambah menu, dan pill filter.
- **Toast, Sheet, ConfirmDialog.** `AnimatePresence` dengan fade/scale masuk dan
  keluar. Ini satu-satunya tempat framer-motion benar-benar mengalahkan CSS, karena
  butuh animasi keluar.
- **Stagger entri.** Kartu menu dan kartu statistik dashboard masuk bertahap. Satu
  elemen tidak boleh dianimasikan dua kali: `.reveal` yang scroll-driven tetap milik
  bagian publik yang jauh di bawah, framer-motion mengambil alih konten layar
  pertama.
- **Shimmer skeleton.** CSS murni (gradien bergerak). Paling murah dan tidak
  menambah kerja klien.
- **Count-up poin.** Hook kecil di atas `animate()` dari framer-motion. Saat poin
  baru dikreditkan petugas, saldo naik dari nilai lama ke nilai baru. Saat
  reduced-motion aktif, langsung ke nilai akhir.
- **Pulse badge.** Dibatasi ke titik kecil **di dalam** badge, bukan seluruh badge.
  Badge yang berdenyut penuh bersama teksnya sulit dibaca dan terasa berisik.
  Denyutnya lembut, lambat, dan berhenti untuk reduced-motion.
- **Berat.** framer-motion masuk ke halaman kantin yang dipakai di HP sekolah.
  Ukuran bundle diukur sebelum dan sesudah. Jika `ConfirmDialog` dan host toast
  bukan kebutuhan layar pertama, keduanya di-`dynamic import`.

### 5.8 Ringkasan berkas

Baru:

- `supabase/migrations/002_preorder_schema.sql`
- `supabase/migrations/003_preorder_logic.sql`
- `supabase/tests/002_preorder_rules.sql`
- `src/components/student/PreorderGate.tsx`
- `src/components/ui/Toast.tsx`
- `src/components/ui/ConfirmDialog.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- `src/app/(auth)/lupa-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`

Diubah:

- `src/types/database.ts` — nilai `OrderStatus` baru, kolom `orders` dan `profiles` baru
- `src/lib/constants.ts` — `ORDER_STATUS_META`, `STATUS_TONE`, `ORDER_STATUS_FLOW`,
  `ROUTE`, `PUBLIC_PATHS`
- `src/lib/auth.ts` — `PROFILE_COLUMNS`
- `src/lib/auth-errors.ts` — pemetaan error reset
- `src/lib/supabase/middleware.ts` — pengecualian rute reset
- `src/app/(auth)/layout.tsx` — perbaikan mobile
- `src/components/auth/LoginForm.tsx` — tautan lupa password
- `src/app/(app)/siswa/kantin/page.tsx` — data status pre-order
- `src/app/(app)/siswa/page.tsx` — count-up pada saldo poin
- `src/components/student/MenuCatalog.tsx` — tiga keadaan, pemilih bayar
- `src/components/student/BookingTicket.tsx` — status dan mode bayar baru
- `src/components/student/StudentOrderList.tsx` — status baru dan jejak pengembalian poin
- `src/app/(app)/kantin/page.tsx` — filter bawaan, penghitung
- `src/components/vendor/OrderBoard.tsx` — tombol per transisi, konfirmasi, RPC
- `src/components/realtime/RealtimeRefresher.tsx` — toast pesanan baru
- `src/components/ui/Skeleton.tsx` — shimmer
- `src/app/layout.tsx` — `MotionConfig`
- `tailwind.config.ts` — keyframes shimmer

### 5.9 Urutan pengerjaan

Spec ini mencakup tiga alur kerja yang sebenarnya berdiri sendiri, dan hanya satu
yang saling mengunci:

1. **Pengerasan pre-order** (5.1–5.5) — skema, RPC, halaman siswa, papan penjual.
   Inti permintaan; mengunci komponen yang dipakai bersama.
2. **Autentikasi** (5.6) — layout mobile, lupa password, reset. Tidak menyentuh
   database sama sekali dan bisa dikerjakan kapan saja, bahkan lebih dulu.
3. **Animasi** (5.7) — menyentuh komponen dari kedua alur di atas, jadi dikerjakan
   terakhir supaya tidak ada yang dianimasikan dua kali.

Rencana implementasi akan mengurutkannya 1 → 2 → 3, tetapi 2 bisa ditukar ke depan
tanpa mengubah apa pun.

## 6. Verifikasi

**Uji aturan di database.** `supabase/tests/002_preorder_rules.sql` dibungkus
`begin; … rollback;`, menyamar sebagai siswa lewat
`set local request.jwt.claims` (begitulah `auth.uid()` dibaca Postgres). Urutan
pengujian:

1. Pesanan kedua saat masih ada yang aktif → `PZ002`.
2. Siswa yang diblokir → `PZ001`.
3. Saldo kurang untuk mode poin → `PZ003`.
4. Item tanpa `points_price` pada mode poin → `PZ004`.
5. Pelanggaran pertama saat `unclaimed` → poin kembali penuh, hitungan jadi 1.
6. Pelanggaran kedua → poin hangus, hitungan jadi 2, `preorder_blocked_until` terisi.
7. Setelah blokir lewat, `get_preorder_status()` mengembalikan hitungan 0 dan
   `is_blocked = false`.

**Uji bahwa klien tidak bisa menyimpang.** Memakai anon key siswa:

- `update` pada `orders.status` harus gagal setelah `orders_vendor_update` dicabut.
- `insert` langsung ke `orders` harus gagal.
- `update` pada `profiles.unclaimed_orders_count` milik sendiri harus ditolak guard.

Jika salah satu lolos, pendekatan A gagal dan desainnya harus ditinjau ulang.

**E2E klik-nyata di DB live**, dua skenario:

- Normal: pesan → papan penjual menampilkan `awaiting_approval` → Terima → Siap →
  Selesai; siswa menerima notifikasi status.
- Penalti: tolak pesanan → poin kembali; lalu pesan lagi dan tandai tidak diambil
  dua kali → poin hangus pada yang kedua, banner blokir muncul, tombol pesan hilang.

**Gerbang mekanis:**

- `npx tsc --noEmit` keluar 0.
- `npm run build` berhasil.
- Inspector anti-slop pada `/login`, `/lupa-password`, `/reset-password`,
  `/siswa/kantin`, dan `/kantin`: 0 FAIL.
- Screenshot di lebar 360px untuk halaman login.
- Migrasi dijalankan dua kali untuk membuktikan idempotensinya.

## 7. Tindakan yang dibutuhkan pengguna

Di dashboard Supabase, sama seperti waktu konfirmasi email dulu:

1. Authentication → URL Configuration → tambahkan `<origin>/auth/callback` ke
   Redirect URLs.
2. Authentication → Email Templates → pastikan template **Reset Password** aktif.

Tanpa keduanya, tautan reset tidak akan sampai ke halaman yang benar dan alur lupa
password tidak bisa diuji end-to-end dari mesin ini.

## 8. Risiko dan catatan

- **`security definer` melewati RLS.** Setiap RPC wajib memeriksa peran dan
  kepemilikan sendiri, lalu menyalakan flag guard profil sebelum menyentuh
  `profiles`. Ini titik paling mudah salah di seluruh desain ini.
- **Refund mengubah saldo tanpa bukti visual kalau UI lupa menampilkannya.**
  `orders.points_refunded` dan `vouchers.refunded_at` ada supaya riwayat siswa bisa
  menjelaskan perubahan saldo. Riwayat pesanan siswa ikut menampilkan pengembalian.
- **Migrasi enum tidak bisa dibatalkan dengan rapi.** Karena itu nilainya hanya
  ditambah, tidak pernah diubah atau dihapus.
- **framer-motion menambah berat bundel.** Diukur, dan komponen yang tidak dipakai
  di layar pertama dimuat dinamis bila perlu.
- **Nol pesanan di database live saat ini** berarti perubahan skema tidak punya
  data lama untuk dimigrasikan, tetapi juga berarti alur penalti hanya bisa diuji
  lewat skenario buatan.
