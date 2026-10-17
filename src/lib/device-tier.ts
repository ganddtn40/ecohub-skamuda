/**
 * Tingkat perangkat: satu keputusan, diambil sekali, dipakai semua animasi.
 *
 * Alasannya ada di sini dan bukan di tiap komponen: yang menentukan apakah
 * sebuah animasi pantas dijalankan bukan selera, melainkan perangkatnya. HP
 * dua gigabyte dengan dua inti prosesor tidak perlu sapuan kerangka dan motif
 * melayang; laptop delapan inti tidak perlu dikurangi. Keputusan itu diambil
 * sekali, ditulis sebagai satu atribut pada `<html>`, lalu dibaca oleh CSS dan
 * oleh pemuat GSAP.
 *
 * Berkas ini sengaja tanpa `"use client"` dan tanpa akses DOM di `decideTier()`,
 * supaya bisa diuji langsung oleh Node (lihat `scripts/check-motion-tiers.ts`)
 * dan bisa dipakai baik oleh layout server maupun komponen klien.
 */

export type Tier = "lite" | "full";

/** Atribut pada `<html>` yang menyimpan hasil keputusan itu. */
export const TIER_ATTR = "data-tier";

/**
 * Ambangnya sengaja konservatif.
 *
 * `navigator.deviceMemory` melaporkan pangkat dua dan dipangkas di 8, jadi HP
 * kelas menengah melaporkan 4. Kalau ambangnya `<= 4`, hampir semua HP siswa
 * kehilangan animasinya tanpa alasan. Yang memang lemah melaporkan 2.
 */
export const LITE_MEMORY_GB = 4;

/** Empat inti adalah laporan yang paling umum, termasuk dari HP kelas bawah. */
export const LITE_CORES = 2;

export type TierSignals = {
  reduceMotion: boolean;
  saveData: boolean;
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
};

/**
 * Murni: tidak menyentuh DOM sama sekali, supaya bisa diuji tanpa peramban.
 *
 * Nilai yang tidak diketahui (`null`) tidak pernah menghukum. Peramban lama
 * yang tidak melaporkan memori atau jumlah inti tetap mendapat animasi penuh;
 * yang membuat sebuah perangkat dianggap lemah harus benar-benar terbaca.
 */
export function decideTier(signals: TierSignals): Tier {
  if (signals.reduceMotion || signals.saveData) return "lite";
  if (signals.deviceMemory !== null && signals.deviceMemory < LITE_MEMORY_GB) return "lite";
  if (signals.hardwareConcurrency !== null && signals.hardwareConcurrency <= LITE_CORES) {
    return "lite";
  }
  return "full";
}

/** Membaca sinyal dari peramban. Hanya berguna di klien. */
export function readTierSignals(): TierSignals {
  if (typeof window === "undefined") {
    return { reduceMotion: false, saveData: false, deviceMemory: null, hardwareConcurrency: null };
  }

  // Dua properti ini tidak ada di lib DOM TypeScript karena tidak standar.
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };

  return {
    reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: nav.connection?.saveData === true,
    deviceMemory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    hardwareConcurrency:
      typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null,
  };
}

/**
 * Tingkat yang sudah dipasang skrip bootstrap di `<html>`.
 *
 * Bila atributnya tidak ada — skripnya gagal, atau seseorang mematikan
 * JavaScript lalu menyalakannya lagi — sinyalnya dihitung ulang di sini, dan
 * bila itu pun tidak bisa, jawabannya `"full"`. Sengaja memilih arah yang salah
 * dengan cara yang tidak merugikan: animasi penuh pada perangkat lemah lebih
 * mudah dimaafkan daripada animasi mati pada perangkat yang mampu.
 */
export function readTier(): Tier {
  if (typeof document === "undefined") return "full";
  const dipasang = document.documentElement.getAttribute(TIER_ATTR);
  if (dipasang === "lite" || dipasang === "full") return dipasang;
  return decideTier(readTierSignals());
}

/**
 * Skrip yang disisipkan ke `<head>` dan berjalan sebelum cat pertama.
 *
 * Ditulis sebagai string, bukan sebagai fungsi yang di-serialisasi, karena ia
 * harus berdiri sendiri: tidak boleh mengimpor apa pun, karena bundelnya belum
 * ada saat ia dijalankan.
 *
 * Ambangnya diambil dari konstanta di atas dengan cara interpolasi, bukan
 * diketik ulang. Dua tempat yang memuat angka yang sama adalah dua tempat yang
 * cepat atau lambat berbeda, dan bedanya hanya terlihat di HP orang lain.
 *
 * `navigator.deviceMemory` dan `navigator.hardwareConcurrency` yang tidak ada
 * bernilai `undefined`; semua perbandingannya bernilai salah, jadi peramban
 * lama otomatis masuk `"full"` tanpa pemeriksaan tambahan.
 */
export const TIER_BOOTSTRAP = [
  "(function(){try{",
  'var reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;',
  "var saveData=(navigator.connection||{}).saveData===true;",
  `var lite=reduce||saveData||navigator.deviceMemory<${LITE_MEMORY_GB}||navigator.hardwareConcurrency<=${LITE_CORES};`,
  `document.documentElement.setAttribute("${TIER_ATTR}",lite?"lite":"full");`,
  '}catch(e){}})();',
].join("");
