import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck, ArrowLeft } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";
import { ROUTE } from "@/lib/constants";

export const metadata: Metadata = { title: "Cek Email" };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="rounded-card bg-white p-6 text-center sm:p-8">
      <span
        className="mx-auto grid h-14 w-14 animate-fade-up place-items-center rounded-full bg-eco-50 text-eco-700"
        style={{ animationDelay: "40ms" }}
      >
        <MailCheck size={26} />
      </span>

      <h1
        className="mt-5 animate-fade-up text-item font-extrabold text-ink"
        style={{ animationDelay: "110ms" }}
      >
        Konfirmasi email kamu
      </h1>

      <p
        className="mt-3 animate-fade-up text-[17px] leading-relaxed text-ink-soft"
        style={{ animationDelay: "170ms" }}
      >
        Kami mengirim tautan verifikasi ke{" "}
        <span className="font-semibold text-ink">{email ?? "alamat emailmu"}</span>. Buka tautan
        tersebut untuk mengaktifkan akun, lalu masuk ke aplikasi.
      </p>

      <p
        className="mt-3 animate-fade-up text-small leading-relaxed text-muted"
        style={{ animationDelay: "230ms" }}
      >
        Email belum masuk? Periksa folder spam atau promosi.
      </p>

      <Link
        href={ROUTE.login}
        className={buttonStyles("primary", "md", "mt-6 w-full animate-fade-up")}
        style={{ animationDelay: "290ms" }}
      >
        <ArrowLeft size={18} />
        Kembali ke halaman masuk
      </Link>
    </div>
  );
}
