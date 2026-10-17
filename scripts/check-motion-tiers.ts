// Pemeriksaan ambang tingkat perangkat dan konsistensinya dengan skrip bootstrap.
//
//   node --experimental-strip-types scripts/check-motion-tiers.ts
//
// Sama seperti scripts/check-preorder-rules.ts: berkas ini hanya mengimpor satu
// modul proyek tanpa alias `@/`, supaya Node bisa menjalankannya dengan cara
// menghapus tipenya saja.
//
// Yang diperiksa bukan cuma "apakah fungsinya benar", tapi juga "apakah angka di
// dalam skrip yang disisipkan ke HTML sama dengan angka di modul ini". Dua
// tempat yang memuat ambang yang sama adalah dua tempat yang cepat atau lambat
// berbeda, dan bedanya cuma terlihat di HP orang lain.

import assert from "node:assert/strict";
import { decideTier, LITE_CORES, LITE_MEMORY_GB, TIER_BOOTSTRAP } from "../src/lib/device-tier.ts";

// Perangkat yang jelas mampu: delapan inti, memori 8 GB, tanpa penghemat data,
// dan tanpa permintaan gerak minimal.
const tinggi = { reduceMotion: false, saveData: false, deviceMemory: 8, hardwareConcurrency: 8 };

assert.equal(decideTier(tinggi), "full");

// Empat sinyal penurunan, satu per satu.
assert.equal(decideTier({ ...tinggi, reduceMotion: true }), "lite");
assert.equal(decideTier({ ...tinggi, saveData: true }), "lite");
assert.equal(decideTier({ ...tinggi, deviceMemory: 2 }), "lite");
assert.equal(decideTier({ ...tinggi, hardwareConcurrency: 2 }), "lite");

// 4 GB adalah laporan yang paling umum dari HP kelas menengah. Ia tidak boleh
// ikut dihukum, atau sebagian besar siswa kehilangan animasinya tanpa alasan.
assert.equal(decideTier({ ...tinggi, deviceMemory: 4 }), "full");

// Peramban lama tidak melaporkan keduanya. Tidak tahu bukan alasan menghukum.
assert.equal(
  decideTier({ reduceMotion: false, saveData: false, deviceMemory: null, hardwareConcurrency: null }),
  "full",
);

// Ambang di skrip bootstrap dibangun dari konstanta yang sama.
assert.ok(
  TIER_BOOTSTRAP.includes(`deviceMemory<${LITE_MEMORY_GB}`),
  "skrip bootstrap memakai ambang memori yang berbeda dari LITE_MEMORY_GB",
);
assert.ok(
  TIER_BOOTSTRAP.includes(`hardwareConcurrency<=${LITE_CORES}`),
  "skrip bootstrap memakai ambang inti CPU yang berbeda dari LITE_CORES",
);

console.log("LULUS: 9");
