# Gerak Adaptif (GSAP + Framer Motion) & Kesiapan Rilis — Desain

Tanggal: 2026-10-17
Status: disetujui untuk masuk tahap perencanaan
Ruang lingkup: `skamuda-ecohub` (Next.js App Router + TypeScript + Supabase)

---

## 1. Maksud

Aplikasi ini sudah berjalan dan sudah beranimasi, tetapi geraknya masih satu
lapis: CSS untuk masuk, Framer Motion hanya untuk animasi keluar. Permintaannya
sekarang ada tiga sekaligus — menambah GSAP pada titik-titik yang disebut,
mengumpulkan seluruh perubahan skema jadi satu berkas SQL yang bisa ditempel ke
Supabase SQL Editor, dan menyiapkan cabang ini untuk di-push ke `origin`.

Yang paling mudah salah adalah menyimpulkan bahwa "lebih banyak librer animasi"
berarti "lebih halus". Kenyataannya tidak: librer animasi menambah JavaScript,
dan JavaScript yang lebih banyak berarti lebih banyak kerja bagi HP kelas bawah.
Karena itu keberhasilan diukur dari lima hal, dan nomor 3 sama pentingnya dengan
nomor 1:

1. Titik-titik yang diminta benar-benar memakai mesin yang diminta: GSAP untuk
   reveal berbasis scroll, penghitung angka, denyut badge, dan stagger daftar;
   Framer Motion untuk masuknya hero/header, hover/tap kartu, modal pegas, dan
   transisi antar halaman.
2. Gerak hanya menyentuh `transform` dan `opacity` — tidak ada satu pun animasi
   yang memicu perhitungan ulang tata letak atau pengecatan ulang tiap frame.
3. Di perangkat lemah, tidak ada JavaScript animasi yang diunduh sama sekali.
   GSAP masuk sebagai potongan berkas terpisah yang baru diambil setelah cat
   pertama, dan **tidak pernah diambil** bila perangkatnya tergolong `lite` atau
   pengguna meminta gerak seminimal mungkin.
4. Seluruh perubahan skema ada di satu berkas
   `supabase/migrations/latest_update.sql` dengan langkah tempel-jalankan yang
   bisa diikuti tanpa membaca kode SQL.
5. Cabang siap di-push: `tsc` keluar 0, `npm run build` berhasil, uji SQL lama
   tetap 36/36 lulus, dan tidak ada fitur yang rusak.

Pengguna: siswa SMKN 1 Murung Pudak (HP kelas bawah sampai menengah), penjual
kantin (laptop dan HP), petugas bank sampah, dan pengunjung halaman publik.
Yang paling dirugikan bila salah: siswa dengan HP kelas bawah, karena merekalah
yang paling terasa bila animasi membuat halaman tersendat.

## 2. Batasan

Seluruh batasan lama tetap berlaku, ditambah batasan baru khusus gerak.

**Dari milestone sebelumnya (tidak berubah):**

- Tidak ada data palsu. Semua yang tampil berasal dari database live.
- Gaya visual, palet, tipografi, dan token dipertahankan (`Clean Emerald
  Eco-App`, Plus Jakarta Sans, radius pill/control/card).
- 100% ikon Lucide. Tidak ada emoji sebagai pengganti ikon atau gambar.
- Aturan Anti-Slop diterapkan selama pengerjaan (mode DURING).
- `npx tsc --noEmit` dan `npm run build` adalah gerbang sebenarnya; tidak ada
  skrip ESLint di proyek ini.
- Teks tidak pernah di bawah 13px (`text-small`); angka memakai kelas `tnum`.
- Tidak ada garis tepi `border-*` kecuali pemisah `<tr>`, kolom form, dan
  interior `[data-ui]`.
- Semua fitur, rute, policy RLS, RPC, dan aturan bisnis dipertahankan apa
  adanya. Tidak ada perubahan skema baru di milestone ini.

**Baru, khusus gerak:**

- Hanya `transform` dan `opacity` yang dianimasikan. Dilarang menganimasikan
  `height`, `width`, `margin`, `padding`, `top`, `left`, `box-shadow`,
  `background-position`, dan `filter`.
- `will-change` dipasang hanya selama animasi berjalan dan dilepas saat
  selesai; dilarang dipasang permanen lewat kelas Tailwind.
- `transform-gpu` hanya boleh dipasang pada elemen daun yang beranimasi.
  Dilarang pada elemen apa pun yang punya keturunan `position: fixed`.
- Satu elemen digerakkan oleh satu mesin. Dua mesin pada properti yang sama
  dilarang, karena hasilnya bukan dua kali lebih halus melainkan saling
  menimpa.
- Setiap efek inert saat `prefers-reduced-motion: reduce`, dan pada tingkat
  `lite` tidak ada JavaScript gerak yang diunduh.
- Satu-satunya dependensi baru: `gsap`. Tidak ada librer animasi lain, tidak
  ada plugin GSAP berbayar.
- Migrasi tetap idempoten dan aman dijalankan berulang.

## 3. Keputusan yang sudah diambil

Dipisahkan antara yang Anda putuskan dan yang saya tetapkan, supaya bisa
dikoreksi.

**Keputusan Anda:**

| Topik | Keputusan |
|---|---|
| Mesin gerak | GSAP di seluruh titik yang Anda sebut, Framer Motion untuk micro-interaction |
| Penyesuaian perangkat | Otomatis: tingkat perangkat + `prefers-reduced-motion` |
| Bentuk berkas SQL | Satu berkas `latest_update.sql`, dua bagian berlabel |
| Urutan rilis | Selesaikan gerak → verifikasi → push cabang → PR ke `main` |

**Keputusan saya (koreksi bila salah):**

| Topik | Keputusan | Alasan |
|---|---|---|
| Animasi ambient: `drift`, `slow-zoom`, `ring-sweep`, `animate-spin` | **Tetap CSS** | Ini animasi tak terbatas. Di GSAP artinya satu ticker `requestAnimationFrame` yang berjalan terus selama halaman terbuka — tepat beban yang ingin dihindari di HP kelas bawah. CSS menjalankannya tanpa JS sama sekali. Tidak ada satu pun yang Anda sebut. |
| Transisi halaman | **Hanya opasitas**, tanpa `translateY` | Framer meninggalkan `transform: translateY(0px)` setelah tween selesai — dan itu bukan `none`. Sebuah leluhur yang punya `transform` menjadi *containing block* bagi keturunannya yang `position: fixed`, sehingga bar keranjang di `MenuCatalog` dan `BottomNav` akan ikut tergulung bersama halaman. Opasitas tidak membuat containing block. |
| Cara GSAP masuk | `import("gsap")` dinamis di dalam efek, bukan impor statis | Impor statis menaruh GSAP di bundel awal setiap halaman. Impor dinamis menjadikannya potongan terpisah yang diambil setelah cat pertama, dan tidak diambil sama sekali di tingkat `lite`. |
| `TextPlugin` | **Tidak dipakai**, diganti tween objek proxy + tulis `textContent` | `TextPlugin` menulis teks apa adanya; ia tidak bisa menyisipkan pemisah ribuan gaya Indonesia. Tween objek proxy dengan `formatNumber()` di `onUpdate` memberi hasil yang sama, memakai fungsi format yang sudah dipakai seluruh aplikasi, dan menghemat satu impor. |
| Titik masuk di atas lipatan | **Framer Motion**, bukan GSAP | `initial` Framer dirender di HTML server, jadi elemen sudah dalam keadaan awalnya sebelum cat pertama — tidak ada kedipan. GSAP tidak punya padanan ini tanpa menyembunyikan elemen lewat CSS lebih dulu, dan menyembunyikan lewat CSS berarti konten tidak muncul bila skrip gagal. |
| Reveal di bawah lipatan | **GSAP ScrollTrigger dengan `from()`** | Elemen tetap terlihat penuh di HTML server dan saat JS gagal; GSAP hanya menambahkan gerak. Karena elemennya di bawah lipatan, GSAP sudah selesai dimuat jauh sebelum ia masuk layar. |
| Kartu menu & kartu statistik | **Pindah sepenuhnya ke Framer** (masuk + hover + tap) | Kelas masuknya sekarang memakai `animation-fill-mode: both`, yang mengunci `transform` pada keadaan akhir selama-lamanya. Selama itu berlaku, `whileHover={{ y: -4 }}` tidak akan terlihat. Satu mesin harus memiliki `transform` kartu itu. |
| Stagger daftar panjang | `ScrollTrigger.batch` dengan **batas 60 baris pertama** | `WasteHistoryTable` merender sampai 200 baris. Satu pemicu per baris berarti 200 pemicu yang dievaluasi tiap gulir. 60 baris pertama cukup untuk memberi kesan "muncul berurutan" pada apa yang benar-benar dilihat orang; sisanya statis. |
| Verifikasi di mesin ini | Bukti lewat CSSOM + patch `matchMedia` | Mesin ini melaporkan `prefers-reduced-motion: reduce`. Media query CSS tidak bisa dipalsukan dari JS, jadi gerak CSS hanya bisa dibuktikan lewat deklarasi di CSSOM; gerak GSAP/Framer dibuktikan dengan menambal `window.matchMedia` sebelum aplikasi dimuat. |

## 4. Non-tujuan (YAGNI)

Sengaja tidak dikerjakan. Semuanya bisa ditambahkan nanti tanpa membongkar
desain ini:

- **Animasi keluar pada transisi halaman.** App Router tidak menyediakan titik
  yang sah untuk menahan halaman lama sampai animasinya selesai tanpa
  mengakali router. Yang dikerjakan hanya pudar masuk.
- **View Transitions API.** Belum ada di semua peramban yang dipakai siswa, dan
  dukungan Next.js-nya masih bereksperimen. Opasitas Framer sudah memenuhi
  "fade-in antar halaman yang mulus".
- **Menambah animasi pada data realtime selain angka poin/total kg.** Denyut
  badge status sudah cukup menandakan "sedang berjalan"; menyalakan animasi
  setiap kali baris pesanan berubah membuat halaman kantin berkedip saat
  pembeli sibuk.
- **Menggeser `animate-fade-up` yang ada di form auth.** Itu entry di atas
  lipatan; memindahkannya ke Framer berarti menambah ~26 kB ke halaman login
  tanpa perubahan yang bisa dilihat.
- **Perubahan skema apa pun.** Migrasi baru tidak dibuat; yang ada hanya
  konsolidasi.
- **`gsap` pada halaman `/siswa/qr`, `/kantin/scan`, dan `/petugas`.** Tidak
  ada satu pun titik yang Anda sebut di sana. Kalau nanti ada, pemuatnya sudah
  siap dipakai.
- **LazyMotion.** Sudah dipertimbangkan dan ditolak: `MotionConfig` yang ada
  sekarang dipakai untuk `reducedMotion="user"`, dan mengganti ke `LazyMotion`
  menuntut seluruh komponen pindah ke `m.*`. Risikonya lebih besar dari
  penghematan 15 kB, dan Framer di halaman ber-aplikasi sudah termuat lewat
  `ToastProvider`.

## 5. Arsitektur

### 5.1 Tiga mesin, satu pemilik tiap elemen

| Permukaan | Mesin | Berkas utama |
|---|---|---|
| Ambient: `drift`, `slow-zoom`, `ring-sweep`, spinner, motf loop | CSS | `tailwind.config.ts`, `globals.css`, `LoopMotif.tsx` |
| Masuknya konten di atas lipatan, hover/tap kartu, modal pegas, transisi halaman, stagger hero/header | Framer Motion | `src/components/motion/*`, `src/components/ui/{Sheet,ConfirmDialog}.tsx`, `src/app/(app)/template.tsx` |
| Reveal saat digulir, stagger daftar, angka berjalan, denyut badge | GSAP (dinamis) | `src/components/motion/RevealScope.tsx`, `src/components/ui/{CountUp,PulseDot}.tsx` |
| Efek tekan tombol, sapuan kerangka | CSS | `Button.tsx`, `Skeleton.tsx` |

### 5.2 Tingkat perangkat

Sebuah skrip kecil disisipkan di `<head>` sebelum cat pertama dan menulis satu
atribut pada `<html>`: `data-tier="full"` atau `data-tier="lite"`.

| Sinyal | Sumber | Menjadi `lite` bila |
|---|---|---|
| Gerak dikurangi | `matchMedia("(prefers-reduced-motion: reduce)")` | cocok |
| Penghemat data | `navigator.connection.saveData` | `true` |
| Memori perangkat | `navigator.deviceMemory` | `< 4` |
| Inti CPU | `navigator.hardwareConcurrency` | `<= 2` |
| Sisanya | — | `full` |

Ambangnya sengaja konservatif: HP kelas menengah melaporkan memori 4 GB, jadi
mereka tetap dapat `full`. Yang menjadi `lite` hanya perangkat dengan 2 GB,
prosesor dua inti, mode hemat data, atau permintaan gerak minimal.

Atribut ini dipasang sebelum cat pertama, jadi tidak ada kedipan "beranimasi
lalu mendadak mati". Konsekuensinya di CSS: seluruh animasi ambient mati, dan
di JavaScript: `useGsap()` mengembalikan `null` tanpa pernah memanggil
`import()`, sehingga berkas GSAP tidak masuk daftar unduhan.

Skrip ini memakai ambang yang sama dengan `src/lib/device-tier.ts` karena
string-nya **dibangun dari konstanta itu**, bukan diketik ulang. Dua tempat
dengan angka yang sama adalah dua tempat yang cepat atau lambat berbeda.

### 5.3 Pemuat GSAP

```ts
// src/lib/use-gsap.ts
export function useGsap(): Gsap | null;        // null selama memuat, dan selamanya di tier lite
export function loadGsap(): Promise<Gsap>;     // memoized; mendaftarkan ScrollTrigger sekali
```

`useGsap` mengembalikan `null` pada render pertama dan mengisi dirinya lewat
`setState` setelah modulnya tiba. Konsekuensi yang penting dan disengaja:
**tidak ada animasi yang berjalan saat server merender**, dan komponen selalu
merender keadaan akhirnya lebih dulu — sehingga `gsap.from()` selalu punya
titik akhir yang benar, dan konten tetap utuh bila GSAP tidak pernah tiba.

### 5.4 Reveal saat digulir

`RevealScope` adalah satu pulau klien yang dipasang sekali per halaman. Ia
mencari `[data-reveal]` di dalam wadahnya, lalu menganimasikannya dengan
`ScrollTrigger.batch`:

```tsx
<RevealScope>          {/* server children tetap dirender server */}
  <section data-reveal>…</section>
</RevealScope>
```

Aturan yang wajib dipatuhi implementasinya:

- Satu `RevealScope` per halaman, bukan satu per bagian. Sepuluh pemicu scroll
  untuk sepuluh bagian halaman adalah sepuluh kali kerja yang sama.
- Animasi memakai `from()`, tidak pernah `fromTo()` dengan keadaan awal
  disembunyikan lewat CSS, dan tidak pernah `gsap.set(opacity: 0)` sebelum
  elemennya terlihat.
- `stagger` antar elemen dalam satu batch: 0,06 detik.
- Hanya elemen yang berada **di bawah lipatan** yang diberi `data-reveal`.
  Elemen pertama yang sudah terlihat saat halaman dibuka memakai masuknya
  Framer, supaya tidak ada kedipan "terlihat lalu menghilang lalu muncul".

### 5.5 Aturan properti dan `will-change`

GSAP dipanggil dengan `transformOrigin` dan properti yang eksplisit, dan
`will-change` dipasang di awal tween lalu dilepas di `onComplete`:

```ts
gsap.from(el, {
  y: 18, opacity: 0, duration: 0.5, ease: "power2.out",
  onStart: () => { el.style.willChange = "transform, opacity"; },
  onComplete: () => { el.style.willChange = ""; },
});
```

Alasan melepasnya: `will-change` memaksa peramban membuat lapisan komposit
tersendiri. Dibiarkan menyala pada puluhan elemen sekaligus, lapisannya
memakan memori GPU — persis sumber patah-patah di HP kelas bawah.

## 6. Rincian per permukaan

**Halaman publik `/` dan `/papan-skor`.** Bagian pertama adalah hero: teksnya
masuk dengan Framer `staggerChildren` (0,08 detik antar anak). Seluruh bagian
berikutnya diberi `data-reveal` dan digerakkan satu `RevealScope`. Blok CSS
`.reveal` beserta `@keyframes reveal-rise` di `globals.css` **dihapus**, karena
elemen yang sama tidak boleh punya dua mesin.

**Header aplikasi (`AppHeader`) dan header auth.** Bilah judul masuk dengan
`staggerChildren` versi Framer yang lebih pendek (0,05 detik), satu kali saja.

**Kartu menu kantin (`MenuCatalog`) dan kartu statistik (`StatTile`).**
Pemilik `transform` pindah ke Framer: masuk berurutan, `whileHover={{ y: -4 }}`,
`whileTap={{ scale: 0.97 }}`, pegas ringan. Aturan "masuk sekali saja" dari
Task 12 tetap berlaku dan harus dibuktikan ulang: berpindah kategori tidak
memutar ulang animasi masuknya.

**Angka berjalan (`CountUp`).** Nilai pertama tetap dirender server apa adanya —
HTML dari server harus tetap memuat saldo yang benar. Yang berjalan hanya ketika
nilainya **berubah**. Saat `prefers-reduced-motion: reduce` atau tier `lite`,
nilai target ditulis seketika. `src/lib/use-count-up.ts` dihapus.

**Denyut badge status (`PulseDot`).** Satu timeline GSAP `yoyo`, `repeat: -1`,
1,1 detik per ayunan, pada titik 6px di dalam `Badge`. Hanya status
`processing` dan `ready_for_pickup` yang berdenyut. Badge di `PreorderGate` dan
`BookingTicket` tetap tanpa denyut, sesuai keputusan Task 12.

**Riwayat petugas dan papan peringkat.** `ScrollTrigger.batch` dengan batas 60
baris. Baris ke-61 dan seterusnya dirender statis.

**Modal (`Sheet`, `ConfirmDialog`).** Transisi panel menjadi
`{ type: "spring", stiffness: 300, damping: 25 }`. Latar belakang tetap pudar
0,16 detik. `MotionConfig reducedMotion="user"` yang sudah ada memastikan
pegasnya tidak berpindah tempat saat gerak dikurangi.

**Transisi halaman.** `template.tsx` baru di `(app)` dan `(auth)`, berisi
`PageFade` — `motion.div` dengan opasitas 0→1 selama 0,22 detik. Tidak ada
`transform`. Alasan lengkapnya di tabel keputusan.

Pemuatan pertama dikecualikan, dan itu disengaja: keadaan `initial` milik Framer
dirender ke dalam HTML server sebagai `opacity: 0`, sehingga tanpa pengecualian
ini halaman akan kosong sampai hidrasi selesai — dan tetap kosong selamanya bila
hidrasinya gagal. Karena itu pudarnya baru berlaku setelah penanda tingkat modul
menyatakan bahwa satu kali pemuatan sudah lewat.

## 7. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| GSAP justru membuat halaman lebih berat | Diukur, bukan dikira: `npm run build` mencatat First Load JS tiap halaman sebelum dan sesudah; angkanya dilaporkan apa adanya di catatan rencana |
| Reveal berkedip (terlihat → menghilang → muncul) pada elemen yang sudah di layar | Hanya elemen di bawah lipatan yang diberi `data-reveal`; elemen pertama memakai Framer yang keadaan awalnya sudah ada di HTML server |
| Bar keranjang yang `fixed` ikut tergulung | Tidak ada `transform` pada leluhurnya; transisi halaman hanya opasitas; dibuktikan dengan mengukur `getBoundingClientRect()` bar itu sebelum dan sesudah navigasi |
| Hover/tap kartu tidak terlihat di HP | `whileHover` tidak dipakai sebagai satu-satunya umpan balik: `whileTap` yang bekerja pada sentuhan tetap ada, dan warna latar CSS tetap berubah |
| Dua mesin bertengkar di satu elemen | Kelas masuk CSS dihapus dari elemen yang pindah ke Framer; setiap tugas menyebut kelas mana yang dihapus |
| 200 baris tabel membuat gulir tersendat | Batas 60 baris + `batch`; diukur dengan `PerformanceObserver` long task saat menggulir |
| Skrip tingkat perangkat bentrok dengan hidrasi | Skrip hanya menulis `data-tier` pada `<html>`; React tidak merender atribut itu, dan peringatan hidrasi diperiksa sekali di konsol |
| Animasi tetap memutar saat gerak dikurangi | Setiap tugas menyebut buktinya; mesin ini melaporkan `reduce`, jadi jalur reduce diuji langsung di sini dan jalur gerak diuji dengan `matchMedia` yang ditambal |

## 8. Bukti yang harus ada sebelum disebut selesai

1. `node --env-file=.env.local scripts/check-sql.mjs supabase/tests/001_schema_probe.sql supabase/tests/002_preorder_rules.sql supabase/tests/003_preorder_resolution.sql` → 36 lulus, 0 gagal.
2. `bash scripts/check-types` keluar 0; `npm run build` berhasil.
3. `node --experimental-strip-types scripts/check-motion-tiers.ts` → seluruh asersi lulus.
4. First Load JS setiap halaman dicatat sebelum dan sesudah; tidak ada halaman
   yang naik tanpa penjelasan tertulis.
5. Di browser: angka poin berjalan dan mendarat tepat di nilai target; stagger
   daftar terukur jedanya; badge berdenyut hanya pada dua status; bar keranjang
   tidak bergerak saat halaman berpindah.
6. Jalur `reduce`: angka berhenti seketika, tidak ada timeline yang berjalan,
   GSAP tidak diunduh.
7. Jalur `lite`: `data-tier="lite"` ada di `<html>`, animasi ambient mati, dan
   tidak ada permintaan jaringan ke berkas GSAP.
8. Anti-Slop: 0 emoji, tidak ada teks di bawah 13px, semua angka memakai
   `tnum`, dan satu-satunya `bg-gradient-*` tetap pita shimmer.
9. Fitur lama utuh: pesanan normal dan jalur penalti masih bisa ditelusuri di
   browser seperti pada putaran verifikasi sebelumnya.

## 9. Rilis

**`supabase/migrations/latest_update.sql`.** Satu berkas, idempoten, dibagi dua
bagian berlabel dengan alasan yang sama seperti asalnya:

- **Bagian 1** — nilai enum baru, kolom baru, index biasa, guard profil.
  Setara isi `002_preorder_schema.sql`.
- **Bagian 2** — default status, index unik parsial, `place_order`,
  `vendor_resolve_order`, `get_preorder_status`, pencabutan policy, dan
  `replica identity`. Setara isi `003_preorder_logic.sql` +
  `004_realtime_replica_identity.sql`.

Postgres menolak memakai nilai enum di transaksi yang sama dengan saat nilai itu
ditambahkan, dan SQL Editor menjalankan satu tempelan sebagai satu transaksi.
Karena itu berkasnya berakhir dengan instruksi dua kali tempel-jalankan, bukan
satu. Bagian 3 berisi kueri pemeriksaan yang hanya membaca, untuk memastikan
hasilnya sebelum aplikasi dijalankan.

**Checklist deployment** ditulis ke `docs/DEPLOY-CHECKLIST.md`, memuat: urutan
menjalankan SQL, tiga penghalang yang butuh tindakan Anda (domain + SMTP untuk
email reset, penambahan URL callback di Supabase, dan bug realtime `orders`
INSERT yang sudah diakali tapi belum diperbaiki Supabase), serta anjuran
mengganti kata sandi database yang sempat terbaca di transkrip sesi.

**Push.** Cabang `feat/preorder-hardening` di-push ke `origin` dan sebuah PR
dibuka ke `main`. Commit dokumen desain dan rencana mendahului commit kode,
supaya riwayatnya bisa dibaca berurutan.
