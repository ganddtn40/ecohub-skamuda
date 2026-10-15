"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTE } from "@/lib/constants";
import { mapAuthError } from "@/lib/auth-errors";
import type { SchoolClass } from "@/types/database";

const GRADE_LABEL: Record<string, string> = {
  X: "Kelas X",
  XI: "Kelas XI",
  XII: "Kelas XII",
};

export function RegisterForm({ classes }: { classes: SchoolClass[] }) {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, SchoolClass[]>();
    for (const item of classes) {
      const list = map.get(item.grade) ?? [];
      list.push(item);
      map.set(item.grade, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      ["X", "XI", "XII"].indexOf(a) - ["X", "XI", "XII"].indexOf(b),
    );
  }, [classes]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (fullName.trim().length < 3) return setError("Nama lengkap minimal 3 karakter.");
    if (!className) return setError("Pilih kelas terlebih dahulu.");
    if (password.length < 8) return setError("Kata sandi minimal 8 karakter.");
    if (password !== confirm) return setError("Konfirmasi kata sandi tidak sama.");

    setPending(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), class_name: className },
        emailRedirectTo: `${window.location.origin}${ROUTE.authCallback}?next=/siswa`,
      },
    });

    if (signUpError) {
      setError(mapAuthError(signUpError.message));
      setPending(false);
      return;
    }

    if (data.session) {
      router.replace(ROUTE.student);
      router.refresh();
      return;
    }

    router.push(`${ROUTE.checkEmail}?email=${encodeURIComponent(email.trim())}`);
  }

  const noClasses = classes.length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-up rounded-card bg-white p-6 sm:p-8"
      noValidate
    >
      <h1 className="animate-fade-up text-item font-extrabold text-ink" style={{ animationDelay: "80ms" }}>
        Daftar akun siswa
      </h1>
      <p
        className="mt-3 animate-fade-up text-[17px] leading-relaxed text-ink-soft"
        style={{ animationDelay: "140ms" }}
      >
        Pendaftaran terbuka untuk siswa SMKN 1 Murung Pudak. Akun petugas dan penjual kantin
        dibuat oleh admin sekolah.
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

      {noClasses ? (
        <p className="mt-5 rounded-control bg-gold-50 px-3.5 py-3 text-small text-gold-600">
          Daftar kelas belum tersedia di server. Hubungi admin sekolah.
        </p>
      ) : null}

      <div className="mt-5 space-y-4">
        <Field label="Nama lengkap" htmlFor="reg-name">
          <Input
            id="reg-name"
            name="full_name"
            autoComplete="name"
            required
            placeholder="Nama sesuai data sekolah"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </Field>

        <Field label="Kelas" htmlFor="reg-class" hint="Gabungan tingkat X, XI, XII dan 6 jurusan.">
          <Select
            id="reg-class"
            name="class_name"
            required
            disabled={noClasses}
            value={className}
            onChange={(event) => setClassName(event.target.value)}
          >
            <option value="">Pilih kelas</option>
            {grouped.map(([grade, items]) => (
              <optgroup key={grade} label={GRADE_LABEL[grade] ?? grade}>
                {items.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>

        <Field label="Email" htmlFor="reg-email">
          <Input
            id="reg-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="nama@skamuda.sch.id"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kata sandi" htmlFor="reg-password" hint="Minimal 8 karakter.">
            <Input
              id="reg-password"
              type="password"
              name="password"
              autoComplete="new-password"
              required
              placeholder="Kata sandi"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          <Field label="Ulangi kata sandi" htmlFor="reg-confirm">
            <Input
              id="reg-confirm"
              type="password"
              name="confirm"
              autoComplete="new-password"
              required
              placeholder="Ulangi kata sandi"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </Field>
        </div>
      </div>

      <Button type="submit" disabled={pending || noClasses} className="mt-6 w-full">
        {pending ? <Spinner className="text-white" /> : <UserPlus size={18} />}
        {pending ? "Mendaftarkan..." : "Daftar sebagai siswa"}
      </Button>

      <p className="mt-6 text-center text-[15px] text-ink-soft">
        Sudah punya akun?{" "}
        <Link href={ROUTE.login} className="font-semibold text-eco-700 hover:underline">
          Masuk di sini
        </Link>
      </p>
    </form>
  );
}
