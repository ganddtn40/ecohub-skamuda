// Pemeriksaan aturan perhitungan poin untuk pembayaran penuh dengan poin.
//
//   node --experimental-strip-types scripts/check-preorder-rules.ts
//
// Berkas ini sengaja hanya mengimpor `../src/lib/preorder.ts`. Node menjalankan
// berkas TypeScript dengan cara menghapus tipenya saja; ia tidak mengenal alias
// `@/` dan tidak mengubah resolusi modul. Begitu ada impor yang lebih jauh,
// skrip ini berhenti bisa dijalankan tanpa perkakas tambahan.
//
// Node mencetak peringatan MODULE_TYPELESS_PACKAGE_JSON karena package.json
// proyek ini tidak menyetel "type". Itu memang begitu adanya — berkasnya tetap
// dijalankan sebagai modul ES dan hasilnya benar.

import { evaluatePointsPayment, type PointsPayment } from "../src/lib/preorder.ts";

let failed = 0;

function lulus(nama: string): void {
  console.log(`LULUS: ${nama}`);
}

function gagal(nama: string, harap: string, dapat: string): void {
  console.log(`GAGAL: ${nama}\n  diharapkan ${harap}\n  didapat    ${dapat}`);
  failed += 1;
}

function harapTersedia(nama: string, hasil: PointsPayment, biaya: number): void {
  if (hasil.available === true && hasil.cost === biaya) {
    lulus(`${nama} (biaya ${biaya})`);
  } else {
    gagal(nama, `tersedia dengan biaya ${biaya}`, JSON.stringify(hasil));
  }
}

function harapTidakTersedia(nama: string, hasil: PointsPayment, alasan: string): void {
  if (hasil.available === false && hasil.reason === alasan) {
    lulus(`${nama} (alasan ${alasan})`);
  } else {
    gagal(nama, `tidak tersedia karena ${alasan}`, JSON.stringify(hasil));
  }
}

// 1. Dua baris sah: 1500 x 2 + 500 x 1 = 3500.
harapTersedia(
  "dua baris sah menjumlahkan harga poin",
  evaluatePointsPayment(
    [
      { points_price: 1500, qty: 2 },
      { points_price: 500, qty: 1 },
    ],
    5000,
  ),
  3500,
);

// 2. Satu baris tanpa harga poin berarti seluruh keranjang tidak bisa dibayar poin.
harapTidakTersedia(
  "baris tanpa harga poin menutup opsi poin",
  evaluatePointsPayment([{ points_price: null, qty: 1 }], 5000),
  "menu-tanpa-harga-poin",
);

// 3. Harga poin nol sama saja dengan gratis; itu tidak boleh lolos.
harapTidakTersedia(
  "harga poin nol ditolak, bukan dianggap gratis",
  evaluatePointsPayment([{ points_price: 0, qty: 1 }], 5000),
  "menu-tanpa-harga-poin",
);

// 4. Keranjang sah tapi saldo tidak cukup.
harapTidakTersedia(
  "saldo kurang menutup opsi poin",
  evaluatePointsPayment([{ points_price: 1500, qty: 2 }, { points_price: 500, qty: 1 }], 100),
  "saldo-kurang",
);

// 5. Saldo persis sama dengan biaya tetap boleh: tidak lebih dan tidak kurang.
harapTersedia(
  "saldo persis sama dengan biaya tetap boleh",
  evaluatePointsPayment(
    [
      { points_price: 1500, qty: 2 },
      { points_price: 500, qty: 1 },
    ],
    3500,
  ),
  3500,
);

// 6. Keranjang kosong tidak mungkin terjadi lewat UI, tapi biayanya harus nol —
//    bukan `menu-tanpa-harga-poin`, karena tidak ada baris yang menyebabkannya.
harapTersedia(
  "keranjang kosong berbiaya nol",
  evaluatePointsPayment([], 0),
  0,
);

console.log(
  failed === 0
    ? "\nHASIL: semua aturan perhitungan poin lulus"
    : `\nHASIL: ${failed} aturan gagal`,
);

process.exit(failed === 0 ? 0 : 1);
