"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, KeyRound, LinkIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { ROLE_HOME, ROUTE } from "@/lib/constants";
import { mapAuthError } from "@/lib/auth-errors";
import type { UserRole } from "@/types/database";

/** Sama dengan batas di formulir pendaftaran; dijaga tetap selaras. */
const MIN_PASSWORD = 8;

type Phase = "memeriksa" | "siap" | "kedaluwarsa";

/**
 * Ganti kata sandi dari tautan reset.
 *
 * Halaman ini hanya boleh menampilkan formulir kalau memang ada sesi. Sesi itu
 * datang dari `/auth/callback`, yang menukar kode di tautan email menjadi sesi
 * pemulihan. Tautan yang sudah dipakai, sudah lewat masa berlaku, atau dibuka di
 * peramban lain (tempat kode PKCE-nya tidak ada) tidak menghasilkan sesi — dan
 * dalam keadaan itu menampilkan formulir kosong hanya membuat pengguna mengetik
 * sandi baru untuk ditolak di akhir.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("memeriksa");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [role, setRole] = useState<UserRole>("student");

  useEffect(() => {
    let alive = true;

    async function periksaSesi() {
      // Tautan yang gagal ditukar mendarat di sini dengan tanda dari
      // /auth/callback. Tidak perlu bertanya ke server lagi: kegagalannya sudah
      // terjadi di sana, dan hasilnya sama saja.
      if (searchParams.get("error")) {
        if (alive) setPhase("kedaluwarsa");
        return;
      }

      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (!alive) return;

      if (!data.user) {
        setPhase("kedaluwarsa");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!alive) return;

      if (profile?.role) setRole(profile.role as UserRole);
      setPhase("siap");
    }

    void periksaSesi();

    return () => {
      alive = false;
    };
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD) {
      setError(`Kata sandi minimal ${MIN_PASSWORD} karakter.`);
      return;
    }

    if (password !== confirm) {
      setError("Ulangan kata sandi belum sama.");
      return;
    }

    setPending(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(mapAuthError(updateError.message));
      setPending(false);
      return;
    }

    // Sesi di perangkat lain diakhiri supaya sandi lama tidak tertinggal hidup
    // di sana. Sesi di perangkat ini sengaja dibiarkan: pengguna baru saja
    // membuktikan dirinya lewat tautan email, dan memaksanya mengetik ulang
    // sandi yang sama tidak menambah keamanan apa pun.
    await supabase.auth.signOut({ scope: "others" });

    router.replace(ROLE_HOME[role]);
    router.refresh();
  }

  if (phase === "memeriksa") {
    return (
      <div className="rounded-card bg-white p-6 sm:p-8">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-5 h-12 w-full rounded-control" />
        <Skeleton className="mt-6 h-12 w-full rounded-full" />
      </div>
    );
  }

  if (phase === "kedaluwarsa") {
    return (
      <div className="animate-fade-up rounded-card bg-white p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <LinkIcon size={19} className="shrink-0 text-gold-600" />
          <h1 className="text-item font-extrabold text-ink">Tautan tidak berlaku lagi</h1>
        </div>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
          Tautan reset hanya bisa dipakai sekali, dan masa berlakunya terbatas. Tautan yang
          dibuka di peramban berbeda dari yang memintanya juga tidak bisa dipakai.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Minta tautan baru, lalu buka langsung dari email di peramban yang sama.
        </p>

        <Link
          href={ROUTE.forgotPassword}
          className={buttonStyles("primary", "md", "mt-5 w-full")}
        >
          Minta tautan baru
        </Link>

        <p className="mt-6 text-center text-[15px] text-ink-soft">
          <Link href={ROUTE.login} className="font-semibold text-eco-700 hover:underline">
            Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    );
  }

  // Kiriman asli peramban — yang terjadi kalau tombol kirim ditekan sebelum React
  // mengambil alih form — harus POST. Tanpa `method`, peramban memakai GET dan
  // kata sandi berakhir di URL, riwayat peramban, dan log server.
  return (
    <form
      onSubmit={handleSubmit}
      method="post"
      className="animate-fade-up rounded-card bg-white p-6 sm:p-8"
      noValidate
    >
      <div className="flex items-center gap-2">
        <KeyRound size={19} className="shrink-0 text-eco-700" />
        <h1 className="text-item font-extrabold text-ink">Buat kata sandi baru</h1>
      </div>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
        Setelah tersimpan, kamu langsung masuk dengan kata sandi baru ini.
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
        <Field label="Kata sandi baru" htmlFor="reset-password" hint={`Minimal ${MIN_PASSWORD} karakter.`}>
          <Input
            id="reset-password"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            placeholder="Kata sandi baru"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <Field label="Ulangi kata sandi baru" htmlFor="reset-confirm">
          <Input
            id="reset-confirm"
            type="password"
            name="confirm"
            autoComplete="new-password"
            required
            placeholder="Ketik ulang kata sandi baru"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </Field>
      </div>

      <Button type="submit" disabled={pending} className="mt-6 w-full">
        {pending ? <Spinner className="text-white" /> : <KeyRound size={18} />}
        {pending ? "Menyimpan..." : "Simpan kata sandi baru"}
      </Button>

      <p className="mt-6 text-center text-[15px] text-ink-soft">
        <Link href={ROUTE.login} className="font-semibold text-eco-700 hover:underline">
          Kembali ke halaman masuk
        </Link>
      </p>
    </form>
  );
}
