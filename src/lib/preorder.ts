/**
 * Aturan pembayaran penuh dengan poin.
 *
 * Dipisahkan dari komponen karena inilah satu-satunya perhitungan di alur
 * pre-order yang bisa salah tanpa terlihat salah: kalau keranjang berisi satu
 * menu tanpa harga poin, seluruh pesanan harus ditolak — bukan dianggap gratis.
 * Karena itu ia punya berkas pemeriksaannya sendiri
 * (`scripts/check-preorder-rules.ts`) dan tidak mengimpor apa pun, supaya bisa
 * dijalankan langsung oleh Node.
 *
 * Catatan: sisa poin dan potongan akhir tetap dihitung ulang oleh `place_order`
 * di basis data. Yang di sini hanya untuk memberi tahu siswa sebelum menekan
 * tombol; angka yang tersimpan selalu datang dari nilai balikan RPC.
 */

export type PointsPayment =
  | { available: true; cost: number }
  | { available: false; reason: "menu-tanpa-harga-poin" | "saldo-kurang"; cost: number | null };

/**
 * Menilai apakah seisi keranjang bisa dibayar penuh dengan poin.
 *
 * Harga poin `null` berarti menunya tidak diberi harga poin, dan `0` berarti
 * gratis — dua-duanya menutup opsi poin. Menu gratis yang lolos akan membuat
 * pesanan berbayar nol poin, jadi keduanya diperlakukan sama.
 */
export function evaluatePointsPayment(
  lines: Array<{ points_price: number | null; qty: number }>,
  balance: number,
): PointsPayment {
  let cost = 0;

  for (const line of lines) {
    if (line.points_price === null || line.points_price <= 0) {
      return { available: false, reason: "menu-tanpa-harga-poin", cost: null };
    }
    cost += line.points_price * line.qty;
  }

  if (balance < cost) {
    return { available: false, reason: "saldo-kurang", cost };
  }

  return { available: true, cost };
}
