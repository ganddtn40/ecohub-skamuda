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
    <div className="rounded-card border border-line bg-white p-6 text-center shadow-sm">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-eco-50 text-eco-700">
        <MailCheck size={26} />
      </span>

      <h1 className="mt-4 text-xl font-bold text-ink">Konfirmasi email kamu</h1>

      <p className="mt-2 text-sm leading-relaxed text-muted">
        Kami mengirim tautan verifikasi ke{" "}
        <span className="font-semibold text-ink">{email ?? "alamat emailmu"}</span>. Buka tautan
        tersebut untuk mengaktifkan akun, lalu masuk ke aplikasi.
      </p>

      <p className="mt-3 text-sm leading-relaxed text-muted">
        Email belum masuk? Periksa folder spam atau promosi.
      </p>

      <Link href={ROUTE.login} className={buttonStyles("primary", "md", "mt-6 w-full")}>
        <ArrowLeft size={18} />
        Kembali ke halaman masuk
      </Link>
    </div>
  );
}
