"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ROLE_HOME, ROUTE } from "@/lib/constants";
import { mapAuthError } from "@/lib/auth-errors";
import type { UserRole } from "@/types/database";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(mapAuthError(signInError.message));
      setPending(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    const role = (profile?.role as UserRole | undefined) ?? "student";
    const destination =
      nextPath && nextPath.startsWith("/") ? nextPath : ROLE_HOME[role];

    router.replace(destination);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card border border-line bg-white p-5 shadow-sm sm:p-6"
      noValidate
    >
      <h1 className="text-xl font-bold text-ink">Masuk ke akunmu</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Gunakan email dan kata sandi yang terdaftar di SKAMUDA EcoHub.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-control border border-danger-500/30 bg-danger-50 px-3 py-2.5 text-sm text-danger-600"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="mt-5 space-y-4">
        <Field label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="nama@skamuda.sch.id"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label="Kata sandi" htmlFor="login-password">
          <Input
            id="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="Kata sandi"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
      </div>

      <Button type="submit" disabled={pending} className="mt-6 w-full">
        {pending ? <Spinner className="text-white" /> : <LogIn size={18} />}
        {pending ? "Memeriksa akun..." : "Masuk"}
      </Button>

      <p className="mt-5 text-center text-sm text-muted">
        Belum punya akun siswa?{" "}
        <Link href={ROUTE.register} className="font-semibold text-eco-700 hover:underline">
          Daftar di sini
        </Link>
      </p>
    </form>
  );
}
