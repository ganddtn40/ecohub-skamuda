/**
 * Ambil `data` dari respons Supabase, atau lempar errornya.
 *
 * Tanpa ini, query yang gagal berubah diam-diam menjadi `null`, dan halaman
 * menampilkan empty state yang menyesatkan ("belum ada data") padahal
 * sebenarnya server gagal menjawab. Melempar di sini membuat error boundary
 * terdekat menampilkan error state yang jujur.
 */
type QueryResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

export function unwrap<T>(result: QueryResult<T>): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.data === null) {
    throw new Error("Server tidak mengembalikan data.");
  }
  return result.data;
}
