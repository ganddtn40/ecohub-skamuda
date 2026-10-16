"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, MailCheck, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTE } from "@/lib/constants";

/**
 * Permintaan tautan reset kata sandi.
 *
 * Halaman ini tidak boleh bisa dipakai menebak email mana yang punya akun.
 * Email terdaftar dan email yang tidak terdaftar berakhir pada kalimat yang sama
 * persis. Satu-satunya kegagalan yang dibedakan adalah yang tidak ada kaitannya
 * dengan keberadaan akun — batas kirim dan gangguan jaringan — karena
 * menyembunyikannya berarti membiarkan orang menunggu email yang tidak pernah
 * diminta.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // Lewat /auth/callback supaya tautan dari email bisa menukar kode menjadi
      // sesi lebih dulu; sesi itulah yang membuat /reset-password boleh dibuka.
      redirectTo: `${window.location.origin}${ROUTE.authCallback}?next=${ROUTE.resetPassword}`,
    });

    setPending(false);

    // Hanya kegagalan yang tidak bisa bergantung pada ada-tidaknya akun yang
    // ditampilkan sebagai gagal — yaitu koneksi putus dan galat server.
    //
    // Semua balasan 4xx dari layanan auth diperlakukan sama seperti
    // keberhasilan, karena di keluarga itulah keberadaan akun bocor:
    // `email_address_invalid` hanya muncul untuk akun yang benar-benar ada
    // (domainnya gagal diperiksa pengirim), `over_email_send_rate_limit` hanya
    // tercapai kalau pengirimannya memang dicoba, sedangkan email yang tidak
    // terdaftar dijawab "berhasil" oleh layanannya. Menampilkan salah satunya
    // sebagai error membuat halaman ini jadi alat menebak email terdaftar —
    // persis yang dicegah kalimat "kalau email itu terdaftar".
    if (resetError) {
      const status = resetError.status ?? 0;
      if (status >= 500) {
        setError("Server sedang bermasalah. Coba lagi beberapa saat lagi.");
        return;
      }
      if (status === 0 && /fetch|network|load failed/i.test(resetError.message ?? "")) {
        setError("Tidak bisa menghubungi server. Periksa koneksi internetmu, lalu coba lagi.");
        return;
      }
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="animate-fade-up rounded-card bg-white p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <MailCheck size={19} className="shrink-0 text-eco-700" />
          <h1 className="text-item font-extrabold text-ink">Periksa emailmu</h1>
        </div>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
          Kalau email itu terdaftar, tautan reset sudah dikirim. Buka tautan tersebut untuk
          membuat kata sandi baru.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Tautannya belum datang? Periksa folder spam, lalu coba kirim ulang beberapa menit
          lagi.
        </p>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setSent(false)}
          className="mt-5 w-full"
        >
          Kirim ke email lain
        </Button>

        <p className="mt-6 text-center text-[15px] text-ink-soft">
          <Link href={ROUTE.login} className="font-semibold text-eco-700 hover:underline">
            Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-up rounded-card bg-white p-6 sm:p-8"
      noValidate
    >
      <h1 className="text-item font-extrabold text-ink">Lupa kata sandi</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
        Masukkan email akunmu. Kami kirimkan tautan untuk membuat kata sandi baru.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-control bg-danger-50 px-3.5 py-3 text-small text-danger-600"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="mt-5 space-y-4">
        <Field label="Email" htmlFor="forgot-email">
          <Input
            id="forgot-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="nama@skamuda.sch.id"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
      </div>

      <Button type="submit" disabled={pending} className="mt-6 w-full">
        {pending ? <Spinner className="text-white" /> : <Send size={18} />}
        {pending ? "Mengirim..." : "Kirim tautan reset"}
      </Button>

      <p className="mt-6 text-center text-[15px] text-ink-soft">
        Ingat kata sandinya?{" "}
        <Link href={ROUTE.login} className="font-semibold text-eco-700 hover:underline">
          Masuk di sini
        </Link>
      </p>
    </form>
  );
}
