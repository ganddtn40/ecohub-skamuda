/**
 * Terjemahan kegagalan RPC pesanan kantin ke kalimat yang bisa dibaca siswa dan penjual.
 *
 * RPC menandai kegagalan aturan bisnis dengan SQLSTATE sendiri supaya klien bisa
 * membedakannya dari error tak terduga. Kode yang dipakai:
 *
 *   PZ001  siswa sedang diblokir pre-order
 *   PZ002  siswa masih punya pesanan aktif
 *   PZ003  saldo poin kurang
 *   PZ004  ada menu tanpa harga poin, tidak bisa dibayar dengan poin
 *   PZ005  perpindahan status tidak legal (biasanya status sudah berubah duluan)
 *
 * `23505` bukan kode kita, melainkan pelanggaran index unik
 * `orders_one_active_per_student`. Itu jaring terakhir kalau pemeriksaan di RPC
 * tertembus dua permintaan yang datang bersamaan, jadi artinya sama dengan PZ002.
 */

type OrderErrorInput = string | { code?: string | null; message?: string | null };

export function mapOrderError(input: OrderErrorInput): string {
  const text =
    typeof input === "string"
      ? input
      : [input?.code, input?.message].filter(Boolean).join(" ");

  if (!text) return "Terjadi kesalahan. Coba lagi.";

  if (text.includes("PZ001")) {
    return "Pre-Order Kantin kamu sedang diblokir sementara.";
  }
  if (text.includes("PZ002") || text.includes("23505")) {
    return "Kamu masih punya pesanan yang belum selesai. Selesaikan dulu, atau tunggu penjual menolaknya.";
  }
  if (text.includes("PZ003")) {
    return "Saldo poinmu belum cukup untuk membayar pesanan ini.";
  }
  if (text.includes("PZ004")) {
    return "Ada menu yang belum punya harga poin. Bayar tunai untuk pesanan ini.";
  }
  if (text.includes("PZ005")) {
    return "Status pesanan ini sudah berubah. Muat ulang halamannya.";
  }

  // Validasi biasa dari RPC sudah berbahasa Indonesia, jadi diteruskan apa adanya.
  return text;
}
