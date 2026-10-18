// Pemeriksaan penanda nav yang menyala.
//
//   node --experimental-strip-types scripts/check-nav-active.ts
//
// Latar belakangnya satu bug yang terlihat di layar: pada `/siswa/qr`, item
// `Beranda` ikut menyala karena rutenya berawalan `/siswa/`, sehingga muncul
// dua pil putih sekaligus di header. Aturan awalan terpanjang diuji di sini,
// termasuk batas garis miring dan rute yang bukan milik nav.
//
// Berkas ini sengaja hanya mengimpor `../src/lib/nav-active.ts`, tanpa alias
// `@/` dan tanpa impor lanjutan, supaya Node bisa menjalankannya apa adanya.

import { activeNavHref } from "../src/lib/nav-active.ts";

const SISWA = ["/siswa", "/siswa/qr", "/siswa/kantin", "/siswa/pesanan", "/siswa/riwayat"];
const PETUGAS = ["/petugas", "/petugas/riwayat"];
const PENJUAL = ["/kantin", "/kantin/scan", "/kantin/menu"];

let failed = 0;

function harap(nama: string, pathname: string, hrefs: string[], diharapkan: string | null): void {
  const dapat = activeNavHref(pathname, hrefs);
  if (dapat === diharapkan) {
    console.log(`LULUS: ${nama} (${pathname} -> ${dapat ?? "tidak ada"})`);
  } else {
    console.log(
      `GAGAL: ${nama}\n  diharapkan ${diharapkan ?? "tidak ada"}\n  didapat    ${dapat ?? "tidak ada"}`,
    );
    failed += 1;
  }
}

// 1. Rute induk sendiri.
harap("beranda siswa menyala di rutenya sendiri", "/siswa", SISWA, "/siswa");

// 2. Inilah bugnya: turunan tidak boleh menyalakan induknya juga.
harap("halaman QR hanya menyalakan item QR", "/siswa/qr", SISWA, "/siswa/qr");
harap("kantin hanya menyalakan item kantin", "/siswa/kantin", SISWA, "/siswa/kantin");
harap("pesanan hanya menyalakan item pesanan", "/siswa/pesanan", SISWA, "/siswa/pesanan");
harap("riwayat hanya menyalakan item riwayat", "/siswa/riwayat", SISWA, "/siswa/riwayat");

// 3. Peran lain.
harap("petugas di riwayat tidak menyalakan pindai setoran", "/petugas/riwayat", PETUGAS, "/petugas/riwayat");
harap("petugas di halaman pindai", "/petugas", PETUGAS, "/petugas");
harap("penjual di kelola menu", "/kantin/menu", PENJUAL, "/kantin/menu");
harap("penjual di pindai tiket", "/kantin/scan", PENJUAL, "/kantin/scan");
harap("penjual di papan pesanan", "/kantin", PENJUAL, "/kantin");

// 4. Batasnya garis miring: awalan teks yang mirip bukan rute yang sama.
//    `/siswa/qrcode` bukan bagian dari `/siswa/qr`; yang menyala adalah
//    seksi induknya, bukan item yang mirip namanya.
harap("awalan yang mirip tidak menyalahkan item lain", "/siswa/qrcode", SISWA, "/siswa");
harap("turunan jauh menyala di item terdekat", "/siswa/kantin/xyz", SISWA, "/siswa/kantin");
harap("rute di luar nav tidak menyalakan apa pun", "/papan-skor", SISWA, null);

// 5. Daftar kosong tidak melempar, dan tetap tidak menyalakan apa pun.
harap("daftar nav kosong", "/siswa/qr", [], null);

console.log(
  failed === 0
    ? "\nHASIL: semua aturan penanda nav lulus"
    : `\nHASIL: ${failed} aturan gagal`,
);

process.exit(failed === 0 ? 0 : 1);
