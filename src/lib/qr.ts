import type { Html5Qrcode } from "html5-qrcode";

/**
 * Hentikan pemindai html5-qrcode dengan aman.
 *
 * `Html5Qrcode.stop()` melempar string secara SINKRON (bukan promise yang
 * ditolak) saat pemindai belum/tidak berjalan, misalnya ketika kamera tidak
 * tersedia sehingga `start()` gagal. Kalau lemparan itu dibiarkan, ia bocor
 * dari cleanup effect dan memicu client-side error boundary sehingga halaman
 * jadi blank. Penjagaan ini membuat pembersihan selalu aman dipanggil.
 */
export function stopQrScanner(instance: Html5Qrcode | null): void {
  if (!instance) return;

  try {
    void instance
      .stop()
      .then(() => {
        try {
          instance.clear();
        } catch {
          /* Tidak ada elemen untuk dibersihkan. */
        }
      })
      .catch(() => {
        /* stop() mengembalikan promise yang ditolak pada sebagian kondisi. */
      });
  } catch {
    /* Pemindai belum berjalan; tidak ada yang perlu dihentikan. */
  }
}
