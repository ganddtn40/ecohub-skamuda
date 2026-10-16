/** Terjemahan pesan error Supabase Auth yang paling sering muncul. */
export function mapAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("invalid login credentials")) return "Email atau kata sandi salah.";
  if (text.includes("email not confirmed")) return "Email belum dikonfirmasi. Buka tautan verifikasi di kotak masuk kamu.";
  if (text.includes("user already registered")) return "Email ini sudah terdaftar. Coba masuk saja.";
  if (text.includes("password should be at least")) return "Kata sandi minimal 6 karakter.";
  if (text.includes("email rate limit")) return "Terlalu banyak percobaan. Coba lagi beberapa saat.";
  if (text.includes("for security purposes"))
    return "Terlalu banyak percobaan dari perangkat ini. Tunggu sebentar, lalu coba lagi.";
  if (text.includes("unable to validate email")) return "Format email tidak valid.";
  if (text.includes("invalid or has expired"))
    return "Tautan sudah tidak berlaku. Minta tautan reset yang baru.";
  if (text.includes("should be different from the old password"))
    return "Kata sandi baru harus berbeda dari kata sandi lama.";
  if (text.includes("weak password") || text.includes("password is too weak"))
    return "Kata sandi terlalu mudah ditebak. Pakai huruf dan angka.";
  return message;
}
