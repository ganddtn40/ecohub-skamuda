# Gerak Adaptif (GSAP + Framer Motion) & Kesiapan Rilis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan GSAP pada reveal-scroll, penghitung angka, denyut badge status, dan stagger daftar; menambah Framer Motion pada masuknya hero/header, hover/tap kartu, modal pegas, dan transisi halaman — tanpa membuat aplikasi lebih berat di HP kelas bawah; lalu mengumpulkan seluruh perubahan skema ke satu berkas `supabase/migrations/latest_update.sql` dan menyiapkan cabang untuk di-push dan di-PR-kan.

**Architecture:** Tiga mesin gerak dengan kepemilikan yang tegas: CSS untuk ambient dan efek tekan, Framer Motion untuk masuknya elemen di atas lipatan serta micro-interaction, GSAP untuk apa pun yang bergantung pada posisi gulir, angka berjalan, dan denyut status. GSAP tidak pernah diimpor secara statis: `useGsap()` memanggil `import("gsap")` setelah cat pertama dan mengembalikan `null` selama memuat, sehingga tidak ada animasi yang berjalan saat server merender, dan berkasnya tidak pernah diunduh di perangkat yang tergolong `lite`. Tingkat perangkat dihitung sekali oleh skrip kecil di `<head>` yang menulis `data-tier` pada `<html>` sebelum cat pertama.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.7, Tailwind 3.4, Supabase (Postgres + Auth + RLS + Realtime), Lucide React, framer-motion 12 (sudah ada), gsap 3.15 (baru).

**Spec:** `docs/superpowers/specs/2026-10-17-motion-and-release-design.md`

## Global Constraints

- 100% ikon Lucide. Tidak ada emoji di kode, salinan, atau sebagai pengganti gambar.
- Salinan yang dilihat pengguna berbahasa Indonesia; komentar kode berbahasa Indonesia mengikuti gaya berkas sekitarnya.
- Semua rute, policy RLS, RPC, dan aturan bisnis yang tidak disebut rencana ini dipertahankan apa adanya. Tidak ada perubahan skema baru.
- Hanya `transform` dan `opacity` yang dianimasikan. Dilarang `height`, `width`, `margin`, `padding`, `top`, `left`, `box-shadow`, `background-position`, `filter`.
- `will-change` hanya selama animasi berjalan, dilepas di `onComplete`. `transform-gpu` hanya pada elemen daun yang beranimasi, tidak pernah pada leluhur elemen `position: fixed`.
- Satu elemen digerakkan satu mesin. Kelas masuk CSS dihapus dari setiap elemen yang pindah ke Framer atau GSAP.
- Setiap efek inert saat `prefers-reduced-motion: reduce`; pada `data-tier="lite"` tidak ada JavaScript gerak yang diunduh.
- `npx tsc --noEmit` (lewat `bash scripts/check-types`) harus keluar 0 dan `npm run build` harus berhasil. Tidak ada skrip ESLint di proyek ini.
- Tipografi: `text-body` (17px) adalah dasar, `text-small` (13px) adalah lantai. Angka memakai kelas `tnum`.
- Tidak ada garis tepi `border-*` kecuali pemisah `<tr>` sungguhan, kolom form, dan interior `[data-ui]`.
- Satu-satunya dependensi baru: `gsap`. Tidak ada plugin GSAP berbayar, tidak ada librer animasi lain.
- `SUPABASE_SERVICE_ROLE_KEY` dan `SUPABASE_DB_URL` tidak pernah dicetak dan tidak pernah di-commit.
- Ambang tingkat perangkat: `lite` bila reduce-motion, atau `saveData`, atau `deviceMemory < 4`, atau `hardwareConcurrency <= 2`. Selain itu `full`.
- Batas animasi daftar panjang: 60 baris. Batas stagger puncak: 6 anak pertama.

## Review Focus

Lima kelas masukan yang spec tidak sebutkan tetapi paling mungkin menggigit pemakai perangkat lunak ini. Masing-masing punya ujinya sendiri di task yang memiliki kodenya.

1. **Pengguna dengan `prefers-reduced-motion: reduce` atau perangkat 2 GB membuka halaman.** Harusnya tidak ada satu pun permintaan jaringan ke berkas GSAP, tidak ada timeline yang berjalan, dan halaman tetap utuh dan terbaca. (Task 1, 3, 4, 5.)
2. **Pengguna menekan tautan navigasi sebelum GSAP selesai dimuat.** Harusnya tidak ada elemen yang tertinggal tak terlihat, dan tidak ada yang tertinggal dalam keadaan setengah tergulir. (Task 2, 9.)
3. **Saldo poin bertambah dari realtime saat angka sebelumnya masih berjalan.** Harusnya angka mendarat tepat di nilai terbaru, bukan tersangkut di angka perantara. (Task 3.)
4. **Bar keranjang yang `fixed` di halaman kantin, setelah berpindah halaman lewat BottomNav.** Harusnya tetap menempel di bawah layar, tidak ikut tergulung bersama halaman. (Task 9.)
5. **Tabel riwayat 200 baris digulir cepat.** Harusnya tidak tersendat, dan baris ke-61 dan seterusnya tetap muncul. (Task 5.)

## Prasyarat Eksekusi

**Dependensi baru.** `npm install gsap` (registry terjangkau; `gsap@3.15.0`).

**Server dev.** `npm run dev` di `skamuda-ecohub`. Setiap perubahan
`tailwind.config.ts` wajib disertai restart server, karena server basi diam-diam
membuang token `theme.extend` baru.

**Akun demo** (kata sandi `Skamuda2026!`): `siswa.demo@skamuda.sch.id`,
`petugas.demo@skamuda.sch.id`, `kantin.berkah@skamuda.sch.id` (Kantin Pakde,
stand `42004e0b-cf1a-41cf-834d-f24737ac9258`), `kantin.sehat@skamuda.sch.id`
(Kantin Tengah).

**Cara menguji gerak di mesin ini.** Mesin pengembangan melaporkan
`prefers-reduced-motion: reduce`, jadi animasi CSS inert di sini secara desain.
Jalur GSAP/Framer diuji dengan menambal `window.matchMedia` sebelum aplikasi
dimuat; jalur CSS hanya bisa dibuktikan lewat deklarasi di CSSOM. Untuk melihat
geraknya dengan mata, buka DevTools → Rendering → *Emulate CSS media feature
prefers-reduced-motion* → `no-preference` lalu muat ulang.

**Menjalankan SQL.** Semua SQL dijalankan lewat
`node --env-file=.env.local scripts/db.mjs <berkas>`; berkas dijalankan sebagai
satu simple query, sama seperti SQL Editor.

---

## Fase A — Fondasi dan GSAP

### Task 1: Tingkat perangkat, pemuat GSAP, dan gerbang CSS `lite`

**Files:**
- Create: `src/lib/device-tier.ts`
- Create: `src/lib/use-gsap.ts`
- Create: `scripts/check-motion-tiers.ts`
- Modify: `src/app/layout.tsx:27-35` (sisipkan skrip sebelum cat pertama)
- Modify: `src/app/globals.css:113-125` (tambahkan gerbang `[data-tier="lite"]`)
- Modify: `package.json` (dependensi `gsap`)

**Interfaces:**
- Consumes: tidak ada.
- Produces (dipakai Task 2–5):
  - `type Tier = "lite" | "full"`
  - `TIER_ATTR = "data-tier"`, `LITE_MEMORY_GB = 4`, `LITE_CORES = 2`
  - `type TierSignals = { reduceMotion: boolean; saveData: boolean; deviceMemory: number | null; hardwareConcurrency: number | null }`
  - `decideTier(signals: TierSignals): Tier`
  - `readTierSignals(): TierSignals` dan `readTier(): Tier` (khusus browser)
  - `TIER_BOOTSTRAP: string` — skrip mentah yang dibangun dari konstanta di atas
  - `useGsap(): Gsap | null` dan `loadGsap(): Promise<Gsap>`, dengan `type Gsap = typeof import("gsap").gsap`

- [ ] **Step 1: Pasang dependensi**

```bash
cd skamuda-ecohub
npm install gsap
```

- [ ] **Step 2: Tulis uji yang gagal**

`scripts/check-motion-tiers.ts` — tujuh asersi, memakai `node:assert/strict` dan
mencetak `LULUS: n` di akhir, mengikuti gaya `scripts/check-preorder-rules.ts`:

```ts
import assert from "node:assert/strict";
import { decideTier, LITE_CORES, LITE_MEMORY_GB, TIER_BOOTSTRAP } from "../src/lib/device-tier.ts";
```

```ts
const tinggi = { reduceMotion: false, saveData: false, deviceMemory: 8, hardwareConcurrency: 8 };
assert.equal(decideTier(tinggi), "full");
assert.equal(decideTier({ ...tinggi, reduceMotion: true }), "lite");
assert.equal(decideTier({ ...tinggi, saveData: true }), "lite");
assert.equal(decideTier({ ...tinggi, deviceMemory: 2 }), "lite");
assert.equal(decideTier({ ...tinggi, deviceMemory: 4 }), "full");   // 4 GB bukan perangkat lemah
assert.equal(decideTier({ ...tinggi, hardwareConcurrency: 2 }), "lite");
assert.equal(decideTier({ reduceMotion: false, saveData: false, deviceMemory: null, hardwareConcurrency: null }), "full");
// Ambang di skrip bootstrap tidak boleh berbeda dari konstanta:
assert.ok(TIER_BOOTSTRAP.includes("deviceMemory<" + LITE_MEMORY_GB));
assert.ok(TIER_BOOTSTRAP.includes("hardwareConcurrency<=" + LITE_CORES));
console.log("LULUS: 9");
```

- [ ] **Step 3: Jalankan uji, pastikan gagal**

Run: `node --experimental-strip-types scripts/check-motion-tiers.ts`
Expected: gagal, `Cannot find module '../src/lib/device-tier.ts'`.

- [ ] **Step 4: Tulis `src/lib/device-tier.ts`**

Tanpa `"use client"` (dipakai juga oleh layout server). Fungsi `decideTier` murni,
tanpa akses DOM. `readTierSignals()` membaca `matchMedia`, `navigator.connection?.saveData`,
`navigator.deviceMemory`, `navigator.hardwareConcurrency` dengan penjaga
`typeof window === "undefined"` dan cast bertipe lokal (properti ini tidak ada di lib DOM).

`TIER_BOOTSTRAP` dibangun dengan template literal dari konstanta, bukan diketik
ulang; skripnya membungkus semuanya dengan `try/catch` dan menetapkan
`document.documentElement.setAttribute(TIER_ATTR, tier)`. Gagal apa pun berarti
atribut tidak dipasang, dan `readTier()` yang gagal mengembalikan `"full"` agar
tidak ada perangkat yang salah dihukum.

- [ ] **Step 5: Tulis `src/lib/use-gsap.ts`**

```ts
"use client";
export type Gsap = typeof import("gsap").gsap;
export function loadGsap(): Promise<Gsap>;   // memoized; gsap.registerPlugin(ScrollTrigger) sekali
export function useGsap(): Gsap | null;      // null saat memuat; null selamanya bila readTier() === "lite"
```

`useGsap` memanggil `readTier()` di dalam efek dan **tidak pernah** memanggil
`loadGsap()` bila hasilnya `lite`. Efeknya punya penjaga `hidup` agar `setState`
tidak terjadi setelah unmount.

- [ ] **Step 6: Sisipkan skrip tingkat perangkat di root layout**

`src/app/layout.tsx`: anak pertama `<body>` menjadi
`<script dangerouslySetInnerHTML={{ __html: TIER_BOOTSTRAP }} />`. Alasan
komentar: App Router tidak menyediakan `<head>` yang bisa dikendalikan, dan
skrip ini harus berjalan sebelum cat pertama — sebagai anak pertama `<body>`,
parser belum melihat satu pun konten saat skripnya dieksekusi.

- [ ] **Step 7: Gerbang CSS `lite`**

`src/app/globals.css`, di dalam `@media (prefers-reduced-motion: no-preference)`, tambahkan:

```css
[data-tier="lite"] .animate-shimmer,
[data-tier="lite"] .animate-drift,
[data-tier="lite"] .animate-slow-zoom,
[data-tier="lite"] .animate-ring-sweep { animation: none !important; }
```

Alasannya: sapuan kerangka dan motif melayang adalah hiasan; di perangkat lemah
hiasan pertama yang dilepas. `animate-fade-up` sengaja tidak dimasukkan — ia
pendek, dan menghapusnya membuat kartu berkedip.

- [ ] **Step 8: Jalankan uji, pastikan lulus**

Run: `node --experimental-strip-types scripts/check-motion-tiers.ts`
Expected: `LULUS: 9`, keluar 0.

- [ ] **Step 9: Gerbang tipe dan build**

Run: `bash scripts/check-types` → keluar 0.
Run: `npm run build` → berhasil. Catat tabel First Load JS tiap halaman ke
`C:\Users\galih\AppData\Local\Temp\opencode\bundle-sebelum.txt` (sebelum) dan
`bundle-task1.txt` (sesudah) untuk dibandingkan di Task 12.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/lib/device-tier.ts src/lib/use-gsap.ts scripts/check-motion-tiers.ts src/app/layout.tsx src/app/globals.css
git commit -m "feat(motion): detect device tier and load GSAP off the critical path"
```

---

### Task 2: Reveal saat digulir menggantikan blok CSS `.reveal`

**Files:**
- Create: `src/components/motion/RevealScope.tsx`
- Modify: `src/app/page.tsx` (bungkus konten halaman; `className="reveal"` → `data-reveal`, `data-i` dihapus)
- Modify: `src/app/papan-skor/page.tsx` (sama)
- Modify: `src/components/public/PublicFooter.tsx:63,67,82` (sama)
- Modify: `src/app/globals.css:77-111` (hapus `@keyframes reveal-rise` dan seluruh aturan `.reveal`)

**Interfaces:**
- Consumes: `useGsap()` dari Task 1.
- Produces: `RevealScope({ children, className }: { children: React.ReactNode; className?: string })` — merender `<div className={className}>` dan menganimasikan seluruh `[data-reveal]` di dalamnya. Dipakai Task 5? Tidak — Task 5 punya hook sendiri.

- [ ] **Step 1: Tulis `RevealScope`**

```tsx
"use client";
export function RevealScope({ children, className }: { children: React.ReactNode; className?: string });
```

Perilaku: setelah `useGsap()` mengembalikan mesinnya, ambil
`scope.current.querySelectorAll("[data-reveal]")` lalu
`ScrollTrigger.batch(nodes, { start: "top 88%", once: true, onEnter: (batch) => gsap.from(batch, { y: 18, opacity: 0, duration: 0.5, ease: "power2.out", stagger: 0.06, onStart/onComplete untuk will-change }) })`.
Kembalikan fungsi pembersih yang mematikan tiap pemicu. Wajib memakai `from()`,
bukan `set()` lalu `to()`: dengan `from()`, HTML server sudah memuat elemennya
dalam keadaan akhir, jadi konten tetap terbaca bila skrip gagal.

- [ ] **Step 2: Pindahkan halaman publik ke `RevealScope`**

`src/app/page.tsx`: `<div className="min-h-dvh bg-mint">` menjadi
`<RevealScope className="min-h-dvh bg-mint">`. Setiap `className="reveal"`,
`"reveal mt-8"`, `"reveal mt-12"` di berkas itu menjadi `data-reveal`; setiap
`data-i={...}` dihapus (stagger sekarang milik GSAP). Elemen pertama di lipatan
tidak diberi `data-reveal`: bagian hero memakai masuknya CSS/Framer, sesuai
batasan "hanya elemen di bawah lipatan".

Sama untuk `src/app/papan-skor/page.tsx` dan `src/components/public/PublicFooter.tsx`.

- [ ] **Step 3: Hapus blok CSS yang sudah tidak dipakai**

`src/app/globals.css`: hapus `@keyframes reveal-rise` dan seluruh `@media
(prefers-reduced-motion: no-preference) { @supports (animation-timeline: view()) { .reveal … } }`.
Tinggalkan blok `@media (prefers-reduced-motion: reduce)`. Verifikasi tidak ada
sisa rujukan: `grep -rn "reveal" src/ --include=*.tsx --include=*.ts` hanya boleh
menemukan `data-reveal`, `RevealScope`, dan nama berkasnya.

- [ ] **Step 4: Gerbang**

Run: `bash scripts/check-types` → 0.
Run: `npm run build` → berhasil.
Di browser dengan `no-preference`: gulir `/` dan `/papan-skor` seluruhnya; tiap
elemen ber-`data-reveal` mendarat di `opacity: 1` dan `transform: none`. Dengan
`reduce`: tidak ada tween yang dibuat (`ScrollTrigger.getAll().length === 0`),
dan semua elemen terlihat penuh.

- [ ] **Step 5: Commit**

```bash
git add src/components/motion/RevealScope.tsx src/app/page.tsx src/app/papan-skor/page.tsx src/components/public/PublicFooter.tsx src/app/globals.css
git commit -m "feat(motion): drive scroll reveals with GSAP ScrollTrigger"
```

---

### Task 3: Angka berjalan di atas GSAP

**Files:**
- Modify: `src/components/ui/CountUp.tsx` (tulis ulang isinya)
- Delete: `src/lib/use-count-up.ts`
- Modify: `src/app/(app)/siswa/page.tsx:74,84` (tidak berubah pemakaiannya; hanya dipastikan)

**Interfaces:**
- Consumes: `useGsap()` dari Task 1.
- Produces: `CountUp({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string })`.

- [ ] **Step 1: Tulis ulang `CountUp`**

Komponen merender `<span className={className}>{formatNumber(value, decimals)}</span>`
— nilai target, dirender server. Nilai itu juga yang menjadi keadaan akhir tween,
sehingga HTML server tetap memuat angka yang benar (invarian Task 12 lama).

Efeknya memakai `useLayoutEffect`, bukan `useEffect`: tween dimulai **sebelum
cat**, jadi angka tidak pernah terlihat melompat ke target lalu mundur ke titik
awal. `useLayoutEffect` tidak boleh dipanggil saat server merender, jadi berkas
ini memakai pola yang lazim untuk itu:

```ts
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
```

Di server `useEffect` yang dipakai (dan tidak ada yang dijalankan, karena
mesinnya `null`); di peramban `useLayoutEffect` yang dipakai. Di dalamnya:

- `dari = ref.current`; ref dimulai dari `value`.
- Bila mesinnya `null`, atau `dari === value`, atau `durasi <= 0`: tulis target, perbarui ref, selesai. Inilah jalur reduce dan jalur `lite`.
- Selain itu: tween objek proxy `{ n: dari }` menuju `{ n: value }`, `duration: 0.7`, `ease: "power4.out"` (setara `1-(1-t)^5` yang dipakai hook lama), `snap: { n: 1 }` untuk 0 desimal, dan `onUpdate: () => { el.textContent = formatNumber(t.n, decimals); ref.current = t.n; }`.

- [ ] **Step 2: Hapus hook lama**

`git rm src/lib/use-count-up.ts`. Verifikasi: `grep -rn "use-count-up\|useCountUp" src/` kosong.

- [ ] **Step 3: Gerbang dan bukti angka**

Run: `bash scripts/check-types` → 0; `npm run build` → berhasil.
Di browser, sebagai petugas, kreditkan poin ke siswa demo sementara halaman
`/siswa` siswa itu terbuka: rekam `textContent` tiap frame lewat `MutationObserver`
— jumlah langkah ≥ 20, jarak antar langkah ≈ 16,7 ms, dan nilai terakhir tepat
sama dengan saldo di database (bukan pembulatan). Dengan `reduce`: nilai berubah
dalam satu frame.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/CountUp.tsx src/app/\(app\)/siswa/page.tsx
git rm src/lib/use-count-up.ts
git commit -m "feat(motion): tween the point balance with GSAP"
```

---

### Task 4: Denyut badge status di atas GSAP

**Files:**
- Create: `src/components/ui/PulseDot.tsx`
- Modify: `src/components/ui/Badge.tsx:43-46`
- Modify: `tailwind.config.ts:115-123,134` (hapus keyframes dan animasi `pulse-dot`)

**Interfaces:**
- Consumes: `useGsap()` dari Task 1.
- Produces: `PulseDot({ className }: { className?: string })` — `<span>` berukuran 6px yang berdenyut bila mesinnya ada, dan diam dalam keadaan penuh bila tidak.

- [ ] **Step 1: Tulis `PulseDot`**

Timeline: `gsap.set(el, { scale: 0.8, opacity: 0.45 })` lalu
`gsap.to(el, { scale: 1, opacity: 1, duration: 1.1, repeat: -1, yoyo: true, ease: "sine.inOut" })`.
Kembalikan pembersih yang mematikan timeline. Bila mesinnya `null`, tidak ada yang
dijalankan dan titiknya tetap `opacity: 1` — terlihat, hanya tidak berdenyut.

- [ ] **Step 2: Pakai di `Badge`, hapus keyframe CSS**

`Badge.tsx`: `<span className="… motion-safe:animate-pulse-dot" />` menjadi
`<PulseDot className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />`.
`tailwind.config.ts`: hapus `keyframes["pulse-dot"]` dan `animation["pulse-dot"]`
(hanya keduanya; `shimmer` tetap). Restart server dev setelahnya.

- [ ] **Step 3: Gerbang dan bukti**

Run: `bash scripts/check-types` → 0; `npm run build` → berhasil.
Di browser: badge `processing` dan `ready_for_pickup` berdenyut (opacity
berayun antara 0.45 dan 1); badge `awaiting_approval`, `completed`,
`cancelled`, `unclaimed` tidak punya titik berdenyut; `PreorderGate` dan
`BookingTicket` tetap tanpa denyut. Dengan `reduce`: tidak ada timeline
(`gsap.globalTimeline.getChildren().length === 0`) dan titiknya `opacity: 1`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/PulseDot.tsx src/components/ui/Badge.tsx tailwind.config.ts
git commit -m "feat(motion): pulse order badges with a GSAP timeline"
```

---

### Task 5: Stagger daftar panjang saat digulir

**Files:**
- Create: `src/lib/use-scroll-stagger.ts`
- Modify: `src/components/officer/WasteHistoryTable.tsx:69` (tandai baris, pasang hook)
- Modify: `src/components/leaderboard/ClassLeaderboard.tsx:65` (sama)

**Interfaces:**
- Consumes: `useGsap()` dari Task 1.
- Produces: `useScrollStagger(scope: React.RefObject<HTMLElement | null>, options?: { max?: number }): void` — menganimasikan elemen `[data-stagger]` di dalam `scope`, dibatasi `max` (bawaan 60), sekali jalan.

- [ ] **Step 1: Tulis hook**

`ScrollTrigger.batch(nodes, { start: "top 92%", once: true, onEnter: (batch) => gsap.from(batch, { opacity: 0, y: 10, duration: 0.38, ease: "power2.out", stagger: 0.05, onStart/onComplete will-change }) })`,
dengan `nodes = Array.from(scope.current.querySelectorAll("[data-stagger]")).slice(0, max)`.
Pembersih mematikan tiap pemicu.

- [ ] **Step 2: Pakai di dua komponen**

`WasteHistoryTable.tsx`: setiap `<tr>` di dalam `.map()` baris (baris 69) diberi
`data-stagger`; `<div>` pembungkus tabel (baris 55) menjadi `ref` hook. Karena
`transform` pada elemen `display: table-row` tidak didukung merata di semua mesin
peramban, animasi baris tabel memakai **opacity saja** — argumen `y` hanya dipakai
di papan peringkat.

`ClassLeaderboard.tsx`: setiap baris di dalam `.map()` baris 65 diberi
`data-stagger`; `<div>` akarnya (baris 28) menjadi `ref` hook.

- [ ] **Step 3: Gerbang dan bukti**

Run: `bash scripts/check-types` → 0; `npm run build` → berhasil.
Di browser, sebagai petugas, dengan riwayat panjang: gulir cepat dari atas ke
bawah sambil merekam long task lewat `PerformanceObserver`. Tidak boleh ada long
task > 50 ms yang berasal dari halaman ini. Baris ke-61 dan seterusnya terlihat
(statis). Dengan `reduce`: tidak ada `ScrollTrigger` yang dibuat.

- [ ] **Step 4: Commit**

```bash
git add src/lib/use-scroll-stagger.ts src/components/officer/WasteHistoryTable.tsx src/components/leaderboard/ClassLeaderboard.tsx
git commit -m "feat(motion): stagger the history table and the class board on scroll"
```

---

## Fase B — Framer Motion

### Task 6: Stagger hero dan header

**Files:**
- Create: `src/components/motion/StaggerGroup.tsx`
- Modify: `src/app/page.tsx:92-135` (hero)
- Modify: `src/components/layout/AppHeader.tsx:28-60`
- Modify: `src/app/(auth)/layout.tsx:96-113`
- Modify: `src/app/layout.tsx` (jaring `<noscript>`)

**Interfaces:**
- Consumes: tidak ada.
- Produces (dipakai Task 7):
  - `STAGGER_ITEM: Variants` — `hidden: { opacity: 0, y: 14 }`, `show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }`
  - `StaggerGroup({ children, className, stagger = 0.08, animateOnMount = true })`
  - `StaggerItem({ children, className, as = "div", hover = false })`

- [ ] **Step 1: Tulis `StaggerGroup` dan `StaggerItem`**

```tsx
"use client";
export const STAGGER_ITEM: Variants;
export function StaggerGroup(props: {
  children: React.ReactNode; className?: string; stagger?: number; animateOnMount?: boolean;
}): React.ReactElement;
export function StaggerItem(props: {
  children: React.ReactNode; className?: string; as?: "div" | "li"; hover?: boolean;
}): React.ReactElement;
```

`StaggerGroup` merender `motion.div` dengan
`initial={animateOnMount ? "hidden" : false}` dan
`variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}`
serta `animate="show"`. Dua properti itu cukup: tidak perlu `whileInView`,
karena grupnya memang dirender bersama halamannya.

`StaggerItem` merender `motion.div` (atau `motion.li` bila `as="li"`), memasang
`variants={STAGGER_ITEM}` dan `data-stagger-item`, serta menambahkan
`whileHover={{ y: -4 }}` dan `whileTap={{ scale: 0.97 }}` dengan
`transition={{ type: "spring", stiffness: 300, damping: 25 }}` bila `hover`
bernilai `true`.

**Anak yang wajib CSS, bukan Framer:** elemen pertama yang terlihat saat halaman
dibuka. `motion` merender `initial` ke dalam HTML server sebagai `opacity: 0`,
jadi memakai Framer di situ berarti teks hero tidak ada sampai hidrasi selesai —
di HP lambat itu berarti hero kosong selama hidrasi. Karena itu `PublicNav` dan
`<h1>` tetap memakai `animate-fade-up` yang sudah ada (CSS berjalan pada cat
pertama, tanpa JS), dan Framer mengambil alih paragraf, baris tombol, dan kolom
gambar di bawahnya.

- [ ] **Step 2: Hero**

`src/app/page.tsx`: `<div className="page-x relative pb-16 pt-6 sm:pb-20">` menjadi
`<StaggerGroup className="page-x relative pb-16 pt-6 sm:pb-20">`. Tiga elemen
berikut menjadi `StaggerItem` dengan kelasnya dipindahkan apa adanya, `ENTER`
dihapus, dan `style={delay(n)}` dibuang: paragraf (baris 107), baris tombol
(baris 116), dan kolom gambar (baris 133). Wrapper `PublicNav` (baris 92) dan
`<h1>` (baris 96) **tidak** disentuh. Setelah itu `ENTER` dan `delay` di berkas
itu tidak terpakai lagi — hapus keduanya.

- [ ] **Step 3: Header aplikasi dan header auth**

`AppHeader.tsx` (sudah klien): bungkus tiga anaknya — `BrandMark` (baris 30),
blok nama (baris 32), dan `<nav>` (baris 41) — dengan `StaggerGroup` + `stagger={0.05}`
dan `StaggerItem`. Header ini juga terlihat pada cat pertama, jadi seluruhnya
memakai `animateOnMount={false}` untuk elemen yang sudah ada di layar; yang
penting di sini adalah keseragaman masuknya di perangkat yang mampu, bukan animasi
yang menunda header.

`src/app/(auth)/layout.tsx`: elemen ber-`animate-fade-up` pada baris 96 (judul),
103 (paragraf), dan 113 (kartu) menjadi `StaggerItem`, `animate-fade-up` dihapus
dari ketiganya. Baris 41 (logo) dibiarkan apa adanya.

- [ ] **Step 4: Jaring `<noscript>`**

`src/app/layout.tsx`: tambahkan tepat setelah skrip tingkat perangkat:

```tsx
<noscript>
  <style>{`[data-stagger-item]{opacity:1 !important;transform:none !important}`}</style>
</noscript>
```

Alasannya: tanpa JavaScript, keadaan `initial` milik Framer tidak akan pernah
berganti, dan konten yang dianimasikan akan tinggal tak terlihat.

- [ ] **Step 5: Gerbang dan bukti**

Run: `bash scripts/check-types` → 0; `npm run build` → berhasil. Catat ulang tabel
First Load JS: `/` naik karena framer-motion kini ikut; angkanya dicatat di
`bundle-task6.txt` dan dilaporkan apa adanya.
Di browser dengan `no-preference`: tiap `[data-stagger-item]` mendarat di
`opacity: 1` dan `transform: none`; jeda antar anak terbaca sekitar 0,08 detik.
Dengan `reduce`: elemen muncul tanpa berpindah tempat (pudarnya tetap, karena
`MotionConfig reducedMotion="user"` memang begitu).

- [ ] **Step 6: Commit**

```bash
git add src/components/motion/StaggerGroup.tsx src/app/page.tsx src/components/layout/AppHeader.tsx src/app/\(auth\)/layout.tsx src/app/layout.tsx
git commit -m "feat(motion): stagger the hero copy and the header banners"
```

---

### Task 7: Kartu menu dan kartu statistik pindah ke Framer

**Files:**
- Modify: `src/components/student/MenuCatalog.tsx:326-346` (kartu menu)
- Modify: `src/components/layout/StatTile.tsx` (menjadi klien)
- Modify: `src/app/(app)/siswa/page.tsx:69-113` (tiga kartu ringkasan)

**Interfaces:**
- Consumes: `StaggerGroup`, `StaggerItem` dari Task 6.
- Produces: `StatTile` kini `"use client"` dan menerima `{ icon, label, value, unit, tone, hint, className }` tanpa `style`.

- [ ] **Step 1: Kartu menu**

`MenuCatalog.tsx`: `<ul className="mt-3 grid gap-3 sm:grid-cols-2">` (baris 331)
dibungkus `<StaggerGroup animateOnMount={!sambutanSelesai}>`. Pembungkus itu tidak
punya kelas sendiri, jadi tata letaknya tidak berubah: `<section>` tetap
`<section>`, `<ul>` tetap `<ul>`. Setiap `<li>` (baris 335) menjadi
`StaggerItem as="li" hover` dengan kelasnya dipindahkan apa adanya. Kelas
`motion-safe:animate-fade-up` dan `style={animationDelay}` dihapus dari `<li>`;
aturan "masuk sekali saja" tetap dijaga oleh `sambutanSelesai` yang sudah ada,
sekarang lewat `animateOnMount`. Verifikasi tidak ada sisa `animate-fade-up` di
berkas ini.

- [ ] **Step 2: `StatTile` menjadi klien**

`StatTile.tsx`: tambahkan `"use client"`, ganti elemen terluarnya menjadi
`motion.div` dengan `variants={STAGGER_ITEM}`, `whileHover={{ y: -4 }}`,
`whileTap={{ scale: 0.97 }}`, `transition={{ type: "spring", stiffness: 300, damping: 25 }}`,
dan `data-stagger-item`. Properti `style` dihapus dari tipe props-nya, karena
tidak ada lagi jeda yang perlu diatur dari luar — dan sebelum menghapusnya,
`grep -rn "<StatTile" src/` untuk memastikan tidak ada pemanggil lain yang masih
mengirim `style` (bila ada, hapus juga propnya di sana).

- [ ] **Step 3: Kartu ringkasan siswa**

`src/app/(app)/siswa/page.tsx`: `<section className="grid gap-3 sm:grid-cols-3">`
(baris 69) menjadi `StaggerGroup`. Ketiga anaknya — dua `StatTile` (baris 70 dan
79) dan kartu cincin progres (baris 90) — menyumbang `motion-safe:animate-fade-up`
dan `style={{ animationDelay }}`; keduanya dihapus. Kartu cincin progres dibungkus
`StaggerItem hover` agar kartu ketiga tidak berbeda perilaku dari dua yang lain.

**Catatan yang wajib ditulis di commit:** ini menggantikan stagger CSS Task 12 di
dua tempat. Bukti lama ("kelas dilepas setelah ~900 ms") tidak berlaku lagi dan
diganti oleh bukti Task 7 di bawah.

- [ ] **Step 4: Gerbang dan bukti**

Run: `bash scripts/check-types` → 0; `npm run build` → berhasil.
Di browser, sebagai siswa: keempat kartu katalog dan ketiga kartu ringkasan
muncul berurutan lalu mendarat `opacity: 1`; berpindah kategori tidak memutar
ulang animasi masuk (`sambutanSelesai`); hover pada kartu menggeser `y` ke -4px,
tekan mengubah skala, dan keduanya kembali ke 0 dalam keadaan diam. Dengan
`reduce`: tidak ada pergeseran, hanya pudar.

- [ ] **Step 5: Commit**

```bash
git add src/components/student/MenuCatalog.tsx src/components/layout/StatTile.tsx src/app/\(app\)/siswa/page.tsx
git commit -m "feat(motion): give menu and stat cards springs and press feedback"
```

---

### Task 8: Pegas pada modal

**Files:**
- Modify: `src/components/ui/Sheet.tsx:71` (panel)
- Modify: `src/components/ui/ConfirmDialog.tsx:77` (panel)

**Interfaces:**
- Consumes: tidak ada.
- Produces: tidak ada API baru; hanya nilai transisi panel.

- [ ] **Step 1: Ganti transisi panel**

Panel `Sheet.tsx` (baris 71) dan panel `ConfirmDialog.tsx` (baris 77) memakai
`transition={{ type: "spring", stiffness: 300, damping: 25 }}`. Latar belakang
keduanya tetap `duration: 0.16`; `Toast.tsx` **tidak** diubah — ia punya
`layout="position"` dan pegas pada daftar membuat tiap notifikasi baru menggeser
yang lain terlalu lama.

- [ ] **Step 2: Gerbang dan bukti**

Run: `bash scripts/check-types` → 0; `npm run build` → berhasil.
Di browser: buka Sheet checkout (`/siswa/kantin` → tambah menu → keranjang) dan
`ConfirmDialog` (tombol keluar). Panel masuk dengan pegas tanpa memantul lebih
dari sekali, dan tanpa satu pun peringatan React di konsol. Dengan `reduce`:
panel muncul tanpa bergerak (hanya pudar) — bukti bahwa `MotionConfig` masih
bekerja setelah nilai transisinya berubah.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Sheet.tsx src/components/ui/ConfirmDialog.tsx
git commit -m "feat(motion): open modals with a light spring"
```

---

### Task 9: Transisi halaman

**Files:**
- Create: `src/components/motion/PageFade.tsx`
- Create: `src/app/(app)/template.tsx`
- Create: `src/app/(auth)/template.tsx`

**Interfaces:**
- Consumes: tidak ada.
- Produces: `PageFade({ children }: { children: React.ReactNode })`.

- [ ] **Step 1: Tulis `PageFade`**

`motion.div` dengan `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`,
`transition={{ duration: 0.22, ease: "easeOut" }}`. **Hanya opasitas.** Alasannya
wajib ditulis sebagai komentar di berkasnya: Framer meninggalkan
`transform: translateY(0px)` setelah tween selesai, dan itu bukan `none` — sebuah
leluhur yang punya `transform` menjadi *containing block* bagi keturunannya yang
`position: fixed`, sehingga bar keranjang di `MenuCatalog` dan `BottomNav` akan
ikut tergulung bersama halaman.

`PageFade` juga menjaga pemuatan pertama: sebuah penanda tingkat modul bernama
`pernahTampil` (dimulai `false`) dibaca lewat
`useState(() => !pernahTampil)` dan dinyatakan selesai di dalam `useEffect`.
Selama `false`, `initial` bernilai `false` sehingga tidak ada `opacity: 0` di
HTML server; setelahnya, setiap pemasangan ulang `template.tsx` memakai
`initial={{ opacity: 0 }}` dan memudar masuk. Di server penanda itu tidak pernah
berubah — `useEffect` tidak berjalan di sana — jadi HTML server selalu sama
dengan render pertama klien dan tidak ada peringatan hidrasi.

- [ ] **Step 2: Pasang `template.tsx`**

`src/app/(app)/template.tsx` dan `src/app/(auth)/template.tsx`, keduanya komponen
server:

```tsx
import { PageFade } from "@/components/motion/PageFade";
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageFade>{children}</PageFade>;
}
```

- [ ] **Step 3: Gerbang dan bukti**

Run: `bash scripts/check-types` → 0; `npm run build` → berhasil.
Di browser: muat ulang `/siswa` langsung — HTML pertama sudah memuat konten
dengan `opacity: 1` (tidak ada halaman kosong). Lalu berpindah lewat BottomNav:
pudar masuk terlihat, dan yang paling penting, `getBoundingClientRect().bottom`
bar keranjang `fixed` di `/siswa/kantin` tetap sama dengan `innerHeight` sebelum
dan sesudah perpindahan.

- [ ] **Step 4: Commit**

```bash
git add src/components/motion/PageFade.tsx src/app/\(app\)/template.tsx src/app/\(auth\)/template.tsx
git commit -m "feat(motion): fade between app pages without breaking fixed bars"
```

---

## Fase C — Rilis

### Task 10: `latest_update.sql` dan pembuktiannya di database

**Files:**
- Create: `supabase/migrations/latest_update.sql`

**Interfaces:**
- Consumes: isi `002_preorder_schema.sql`, `003_preorder_logic.sql`, `004_realtime_replica_identity.sql`.
- Produces: satu berkas untuk Supabase SQL Editor, dibagi tiga bagian berlabel.

- [ ] **Step 1: Susun berkasnya**

Kepala berkas menjelaskan aturannya: Postgres menolak memakai nilai enum di
transaksi yang sama dengan saat nilai itu ditambahkan, dan SQL Editor menjalankan
satu tempelan sebagai satu transaksi — karena itu **dua kali tempel-jalankan**,
bukan satu.

- **Bagian 1** — nilai enum `awaiting_approval` dan `unclaimed`, kolom
  `profiles.unclaimed_orders_count` dan `preorder_blocked_until`, kolom
  `orders.payment_mode`/`points_paid`/`points_refunded` beserta tiga check,
  kolom `vouchers.order_id`/`refunded_at`, index `orders_student_status_idx`,
  dan `prevent_profile_escalation()`. Isinya sama persis dengan 002, termasuk
  peringatan bahwa bagian ini **tidak memakai** nilai enum barunya.
- **Bagian 2** — default status, index unik parsial
  `orders_one_active_per_student`, `place_order` (beserta `drop function` dua
  overload lama), `vendor_resolve_order`, `get_preorder_status`, pencabutan
  policy `orders_vendor_update`, seluruh `grant`/`revoke`, dan
  `replica identity full` untuk `orders` dan `order_items`. Isinya sama persis
  dengan 003 ditambah 004.
- **Bagian 3** — hanya membaca, untuk memastikan: tiga kolom baru ada di
  `orders`, dua kolom baru ada di `profiles`, kedua nilai enum terdaftar, index
  unik parsial ada, dan keempat fungsi ada.

Idempoten: setiap pernyataan memakai `if not exists`, `create or replace`, atau
`do $$ … exception when duplicate_object then null`. Tidak ada perintah `psql`
dan tidak ada `\i`, karena harus bisa ditempel ke SQL Editor.

- [ ] **Step 2: Jalankan kedua bagian terhadap database live**

```bash
node --env-file=.env.local scripts/db.mjs supabase/migrations/latest_update.sql
```

Karena berkasnya berisi dua bagian dalam satu simple query, jalankan juga tiap
bagian terpisah untuk membuktikan keduanya sah sebagai satu transaksi:
`scripts/db.mjs` dipanggil dua kali dengan potongan Bagian 1 dan Bagian 2 (tulis
potongannya ke berkas sementara di `%TEMP%\opencode\`). Expected: keduanya
keluar 0 tanpa baris ERROR. Ulangi sekali lagi untuk membuktikan idempoten.

- [ ] **Step 3: Jalankan uji SQL lama**

```bash
node --env-file=.env.local scripts/check-sql.mjs supabase/tests/001_schema_probe.sql supabase/tests/002_preorder_rules.sql supabase/tests/003_preorder_resolution.sql
```

Expected: seluruh asersi LULUS, tanpa GAGAL. Keluarannya dicatat di rencana ini.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/latest_update.sql
git commit -m "docs(db): consolidate the pre-order schema into one runnable file"
```

---

### Task 11: Dokumen rilis dan checklist deployment

**Files:**
- Create: `docs/DEPLOY-CHECKLIST.md`
- Modify: `README.md` (bagian menjalankan migrasi menunjuk ke berkas baru)

**Interfaces:**
- Consumes: keputusan dan temuan dari milestone sebelumnya.
- Produces: satu dokumen yang bisa diikuti tanpa membaca kode.

- [ ] **Step 1: Tulis `docs/DEPLOY-CHECKLIST.md`**

Isinya, berurutan, bahasa Indonesia:

1. **Menjalankan SQL** — langkah bernomor untuk Dashboard → SQL Editor: tempel
   Bagian 1, Run; tunggu; tempel Bagian 2, Run; lalu Bagian 3 untuk memastikan.
   Sertakan apa yang harus terlihat setelah tiap langkah.
2. **Email reset tidak bisa terkirim** — `skamuda.sch.id` tidak punya catatan
   DNS (NXDOMAIN), sehingga `POST /auth/v1/recover` menjawab
   `400 email_address_invalid`; kuota SMTP bawaan lalu menjawab `429`. Tindakan
   yang dibutuhkan: domain sungguhan dengan MX atau SMTP kustom, dan pastikan
   templat *Recovery* aktif. Ini penghalang produksi, bukan cacat kode.
3. **URL callback** — tambahkan `<origin>/auth/callback` ke Supabase →
   Authentication → URL Configuration → Redirect URLs, untuk setiap origin yang
   dipakai (localhost dan domain produksi).
4. **Bug realtime `orders` INSERT** — peristiwa INSERT untuk tabel `orders`
   tidak pernah sampai ke klien, sedangkan UPDATE dan DELETE sampai.
   Publication, `wal_level = logical`, `replica identity full`, dan keterbacaan
   baris di bawah RLS semuanya sudah diperiksa dan bukan penyebabnya. Aplikasi
   sudah mengakalinya dengan pembandingan hasil + penyegaran tiap 30 detik, jadi
   fitur berjalan; yang belum ada adalah perbaikan sesungguhnya.
5. **Kata sandi database** — kredensial pernah terbaca di transkrip sesi;
   anjurkan menggantinya di Supabase → Settings → Database, lalu perbarui
   `SUPABASE_DB_URL` di `.env.local`.
6. **Perangkat dan gerak** — cara melihat animasi di mesin yang melaporkan
   `prefers-reduced-motion: reduce`, dan cara menguji `data-tier="lite"`.

- [ ] **Step 2: Perbarui README**

Bagian menjalankan migrasi menyebut `supabase/migrations/latest_update.sql`
sebagai jalan satu-berkas untuk database baru, sambil tetap menyebut urutan
001 → 004 sebagai riwayat.

- [ ] **Step 3: Commit**

```bash
git add docs/DEPLOY-CHECKLIST.md README.md
git commit -m "docs: add the production deployment checklist"
```

---

### Task 12: Verifikasi akhir, push, dan PR

**Files:**
- Modify: `docs/superpowers/plans/2026-10-17-motion-and-release.md` (catat hasil)
- Modify: `docs/superpowers/specs/2026-10-17-motion-and-release-design.md` (bila ada yang menyimpang)

**Interfaces:**
- Consumes: seluruh task di atas.
- Produces: cabang yang ter-push dan sebuah PR.

- [ ] **Step 1: Gerbang lengkap**

```bash
node --env-file=.env.local scripts/check-sql.mjs supabase/tests/001_schema_probe.sql supabase/tests/002_preorder_rules.sql supabase/tests/003_preorder_resolution.sql
bash scripts/check-types
node --experimental-strip-types scripts/check-motion-tiers.ts
node --experimental-strip-types scripts/check-preorder-rules.ts
npm run build
```

Expected: semuanya keluar 0; asersi SQL tanpa GAGAL; build mencetak tabel First
Load JS.

- [ ] **Step 2: Tabel biaya**

Bandingkan tabel First Load JS dengan `bundle-sebelum.txt` dari Task 1. Setiap
kenaikan diberi satu baris penjelasan; yang tidak bisa dijelaskan dianggap cacat
dan diperbaiki, bukan dilaporkan.

- [ ] **Step 3: Bukti browser menyeluruh**

Dengan `no-preference` (DevTools → Rendering), di jalur normal dan jalur
`lite`/`reduce`: reveal, angka berjalan, denyut badge, stagger kartu, pegas
modal, dan transisi halaman — semuanya seperti yang disebut tiap task. Lalu
telusuri ulang dua alur fitur lama: pesanan tunai Terima → Siap Diambil → Selesai
Diambil, dan jalur penalti dua kali "Tidak Diambil" — keduanya harus masih
berakhir persis seperti pada putaran verifikasi sebelumnya.

- [ ] **Step 4: Periksa Anti-Slop dan hidrasi**

0 emoji; tidak ada teks di bawah 13px; setiap angka memakai `tnum`;
`grep -rn "bg-gradient-" src/` hanya menemukan pita shimmer; dan konsol browser
tidak memuat peringatan hidrasi (khususnya soal `data-tier` pada `<html>`).

- [ ] **Step 5: Catat hasil di rencana dan ledger**

Tulis angka sebenarnya ke bagian verifikasi rencana ini, termasuk yang
mengecewakan. Catat juga penyimpangan dari spec, bila ada.

- [ ] **Step 6: Push dan PR**

```bash
git add -A
git commit -m "docs(plan): record the final motion and release verification"
git push -u origin feat/preorder-hardening
```

Lalu buat PR ke `main` (`gh pr create` bila `gh` tersedia; bila tidak, berikan
URL pembuatannya). Badan PR memuat ringkasan, tabel biaya, dan dua penghalang
produksi dari Task 11 yang butuh tindakan Anda.

---

## Hasil verifikasi (Task 12)

Semua angka di bawah diambil dari **hasil produksi** (`npm run build` lalu
`npm start`), bukan dari server dev, pada mesin yang melaporkan
`prefers-reduced-motion: reduce` sehingga tingkat perangkat aslinya `lite`.

### Step 1 — Gerbang lengkap

| Gerbang | Perintah | Hasil |
| --- | --- | --- |
| Asersi SQL | `scripts/check-sql.mjs` (001 + 002 + 003) | 13 + 10 + 13 = 36 asersi, 0 `GAGAL`, `HASIL: semua berkas uji lulus (3 berkas)` |
| Tipe | `bash scripts/check-types` | `tsc: 0 error` |
| Tingkat perangkat | `check-motion-tiers.ts` | `LULUS: 9` |
| Aturan poin | `check-preorder-rules.ts` | `HASIL: semua aturan perhitungan poin lulus` |
| Build | `npm run build` | keluar 0, tabel First Load JS tercetak |

Catatan: `check-preorder-rules.ts` sempat terlihat "Exited with code 1"; itu
artefak pipa `Tee-Object`/`Select-String` di PowerShell, bukan kegagalan skrip.
Log: `%TEMP%\opencode\gate-task12.log`, `build-task12.log`.

### Step 2 — Biaya bundel (sebelum = Task 1)

| Rute | Sebelum | Sesudah | Delta | Sebab |
| --- | --- | --- | --- | --- |
| `/` | 114 kB | 155 kB | +41 | framer-motion masuk lewat `StatTile` yang kini komponen klien |
| `/papan-skor` | 114 kB | 156 kB | +42 | idem, di halaman publik |
| `/petugas` | 177 kB | 217 kB | +40 | idem |
| `/siswa` | 175 kB | 216 kB | +41 | idem |
| `/siswa/riwayat` | 171 kB | 212 kB | +41 | idem |
| `/kantin` | 220 kB | 222 kB | +2 | template `(app)` (`PageFade`) + pembulatan kolom |
| `/siswa/pesanan` | 229 kB | 230 kB | +1 | idem |
| `/kantin/menu` | 218 kB | 219 kB | +1 | template `(app)` + pembulatan kolom |
| `/kantin/scan` | 185 kB | 186 kB | +1 | idem |
| `/petugas/riwayat` | 174 kB | 175 kB | +1 | idem |
| `/login` | 178 kB | 179 kB | +1 | template `(auth)` |
| `/cek-email` | 106 kB | 107 kB | +1 | idem |
| `/siswa/kantin` | 233 kB | 233 kB | 0 | framer-motion sudah ada di rute itu sejak awal |
| `/lupa-password`, `/register`, `/reset-password`, `/siswa/qr`, `/_not-found`, `/auth/callback` | - | - | 0 | tidak berubah |
| **First Load JS shared by all** | **103 kB** | **103 kB** | **0** | GSAP tidak pernah masuk bundel awal |

Artinya: satu-satunya biaya nyata adalah lantai framer-motion (~40 kB) pada
lima rute yang sebelumnya belum mengirimnya. GSAP tetap di potongan berkas
async dan di `lite` tidak pernah diambil: `useGsap()`
(`src/lib/use-gsap.ts:80`) keluar lebih dulu sebelum `loadGsap()` dipanggil,
jadi `import("gsap")` memang tidak pernah jalan — dan di produksi efeknya
terukur sebagai titik badge tanpa gaya inline dan tanpa tween. Angka +1/+2 kB
adalah pembulatan kolom ditambah pembungkus transisi halaman, bukan pustaka
baru.

Tindak lanjut yang tersisa untuk Anda: `StatTile` di `/papan-skor` yang publik
ikut membayar +42 kB; kalau tidak mau, `StatTile` bisa dibuat server-rendered
khusus di rute itu.

### Step 3 — Bukti browser (produksi)

Alur lama, persis seperti putaran verifikasi sebelumnya:

| Langkah | Bukti |
| --- | --- |
| Siswa buat pesanan tunai "Air Mineral" (Kantin Pakde) | `SKM-I1-JE8Q`, `awaiting_approval`, `payment_mode=cash`, `points_paid=0` |
| Penjual: Terima Pesanan | kartu jadi "Disiapkan" |
| Penjual: Siap Diambil | tombol jadi "Selesai Diambil" + "Tidak Diambil" |
| Penjual: Selesai Diambil | `status=completed`; poin siswa tidak tersentuh |
| Pelanggaran 1: pesanan poin 300 P, "Tidak Diambil" | `SKM-I1-XTBG` jadi `unclaimed`, `points_refunded=300`, saldo kembali 700, `unclaimed_orders_count=1`, `preorder_blocked_until=null` |
| Pelanggaran 2: pesanan poin 300 P, "Tidak Diambil" | `SKM-I1-PQGN` jadi `unclaimed`, `points_refunded=0` (hangus), saldo 400, `unclaimed_orders_count=2`, `preorder_blocked_until=2026-10-20T08:06:48Z` (+72 jam) |
| Siswa membuka `/siswa/kantin` saat diblokir | "Pre-Order Kantin diblokir sementara ... memesan lagi pada 20 Okt 2026", **0 tombol "Tambah"** |

Dialog konfirmasi "Tidak Diambil" berbunyi tepat seperti spec ("Pelanggaran
pertama poinnya masih dikembalikan; pelanggaran kedua poinnya hangus dan
pre-order siswa diblokir 3 hari") dengan tombol Batal / "Tandai tidak diambil".

Gerak, diukur di produksi:

- **Denyut badge status (GSAP)**: dengan `data-tier="full"` lalu navigasi lunak,
  titik badge punya gaya inline dan nilainya bergerak
  (skala 0.932 → 0.899 → 0.858 → 0.830 → 0.807 → 0.800 → 0.808 → 0.825,
  opasitas 0.813 → 0.723 → 0.609 → 0.533 → 0.469 → 0.450 → 0.471 → 0.519) —
  ayunan 1,1 detik menuju 0,8 / 0,45 lalu kembali, sama seperti spec.
  Dengan `data-tier="lite"` titik yang sama **tanpa gaya inline** dan tetap
  `transform: none; opacity: 1`. Jadi jalur `import()` malas GSAP benar-benar
  hidup di bundel produksi dan benar-benar mati di `lite`.
- **Pegas modal di bawah `reduce`**: panel `ConfirmDialog` hanya punya dua nilai
  (`matrix(0.96,0,0,0.96,0,8)` lalu `none`) — memotong, tanpa nilai antara,
  konsisten dengan temuan Task 8.
- **Transisi halaman**: sudah dibuktikan di Task 9 (opasitas 0,000 → 1,000,
  `transform` selalu `none`, bilah keranjang tetap menempel, `scrollTop` 0).
- Tanpa-preference penuh (bukan `lite`) diuji di dev lewat stub `matchMedia`
  sementara pada Task 3-9; di produksi yang diperiksa adalah `lite` (mesin ini)
  dan jalur `full` yang dipaksa, bukan preferensi pengguna.

Pembersihan setelah uji: pesanan uji dihapus (`orders 0`, `order_items 0`,
`voucher ber-order 0`) dan siswa demo dikembalikan ke `points_balance 0`,
`unclaimed_orders_count 0`, `preorder_blocked_until null`.

### Step 4 — Anti-Slop dan hidrasi

| Periksa | Hasil |
| --- | --- |
| Emoji | 0 di teks yang disajikan, 5 rute diperiksa |
| Lantai huruf 13px | 0 elemen di bawah 13px: `/siswa` (54 elemen teks), `/siswa/kantin` (60), `/siswa/pesanan` (36), `/siswa/riwayat` (38), `/papan-skor` (200) |
| Angka `tnum` | 35 dari 35 angka di `/papan-skor` berada di dalam `.tnum`; 0 pelanggar |
| Gradient dekoratif | `bg-gradient-` hanya di `Skeleton.tsx` (pita shimmer); satu-satunya `linear-gradient` lain adalah `.scrim` di `globals.css` yang memang pengecualian tunggal untuk keterbacaan di atas foto |
| Tanpa JavaScript | Semua 27 `opacity:0` di HTML SSR (8 rute) berada pada elemen `[data-stagger-item]`, dan tiap rute mengirim `<noscript><style>[data-stagger-item]{opacity:1 !important;transform:none !important}</style></noscript>` — 0 yang tidak tertutup |
| Hidrasi | Konsol produksi kosong di `/siswa`, `/siswa/kantin`, `/siswa/pesanan`, `/siswa/riwayat`, `/papan-skor`, termasuk saat masuk dan keluar akun: tanpa peringatan hidrasi, tanpa peringatan React soal `data-tier` |
| Sisa gerak | `/papan-skor` 47 dari 47 item daftar berakhir di opasitas penuh; tidak ada konten yang tersangkut di opasitas 0 setelah hidrasi |

Peringatan reduced-motion milik Framer **tidak** muncul di produksi; itu pesan
dev-only, dan di dev memang muncul (dicatat di Task 9).
