import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardCheck,
  CreditCard,
  QrCode,
  Recycle,
  ScanLine,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { buttonStyles } from "@/components/ui/Button";
import { ImpactStatsGrid } from "@/components/leaderboard/ImpactStatsGrid";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, ROUTE } from "@/lib/constants";
import { formatKg } from "@/lib/format";
import type { ClassLeaderboardRow, ImpactStats } from "@/types/database";

export const metadata: Metadata = { title: "Beranda" };
export const revalidate = 0;

const MODULES = [
  {
    icon: Recycle,
    title: "Bank Sampah berbasis poin",
    body: "Siswa menyetor sampah yang akan diverifikasi petugas, lalu saldo poin dan total kilogram tercatat otomatis di akun siswa.",
    points: [
      "QR pribadi siswa dipindai petugas untuk membuka setoran",
      "Jenis sampah dan berat menentukan poin yang masuk",
      "Setoran langsung menambah saldo poin dan total kilogram",
    ],
  },
  {
    icon: ShoppingBag,
    title: "Pre-Order Kantin Pintar",
    body: "Siswa memesan lebih dulu sesuai slot jam istirahat, lalu mengambil pesanan dengan menunjukkan kode booking.",
    points: [
      "Pesanan dipisah per slot Istirahat 1 dan Istirahat 2",
      "Poin dapat ditukar jadi potongan harga di checkout",
      "Penjual memverifikasi tiket sebelum pesanan diserahkan",
    ],
  },
];

export default async function HomePage() {
  const session = await getSessionProfile();
  if (session) redirect(ROLE_HOME[session.profile.role]);

  const supabase = await createClient();
  const [{ data: leaderboardRows }, { data: impactData }] = await Promise.all([
    supabase.rpc("get_class_leaderboard"),
    supabase.rpc("get_impact_stats"),
  ]);

  const rows = (leaderboardRows ?? []) as ClassLeaderboardRow[];
  const stats = (impactData ?? {
    total_kg: 0,
    total_points: 0,
    students: 0,
    deposits: 0,
    co2e_kg: 0,
  }) as ImpactStats;

  const top = rows.filter((row) => Number(row.total_kg) > 0).slice(0, 5);

  return (
    <div className="min-h-dvh bg-mint">
      <header className="rounded-b-header bg-eco-600 px-4 pb-12 pt-5 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <BrandMark tone="light" />
            <nav aria-label="Navigasi publik" className="flex items-center gap-1">
              <Link
                href={ROUTE.leaderboard}
                className="inline-flex h-11 items-center rounded-control px-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/15 hover:text-white"
              >
                Papan Skor
              </Link>
              <Link href={ROUTE.login} className={buttonStyles("onDark", "sm")}>
                Masuk
              </Link>
            </nav>
          </div>

          <div className="mt-12 max-w-2xl">
            <h1 className="text-3xl font-bold leading-[1.15] text-white sm:text-[40px]">
              Sampah jadi poin, kantin tanpa antre.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/85">
              SKAMUDA EcoHub menyatukan Bank Sampah berbasis poin dan Pre-Order Kantin Pintar
              dalam satu aplikasi untuk seluruh warga SMKN 1 Murung Pudak.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href={ROUTE.register} className={buttonStyles("onDark")}>
                Daftar akun siswa
              </Link>
              <Link href={ROUTE.login} className={buttonStyles("outlineDark")}>
                Saya sudah punya akun
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <section className="-mt-6 rounded-card border border-line bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-eco-700" />
            <h2 className="text-[15px] font-semibold text-ink">Dampak lingkungan saat ini</h2>
          </div>
          <div className="mt-4">
            <ImpactStatsGrid stats={stats} />
          </div>
        </section>

        <section className="mt-10" aria-labelledby="modul">
          <h2 id="modul" className="text-xl font-bold text-ink">
            Dua modul, satu alur
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            Poin dari sampah dipakai langsung di kantin. Tidak ada saldo terpisah, tidak ada
            pencatatan manual.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {MODULES.map((modul) => {
              const Icon = modul.icon;
              return (
                <article key={modul.title} className="rounded-card border border-line bg-white p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-control bg-eco-50 text-eco-700">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold text-ink">{modul.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{modul.body}</p>
                  <ul className="mt-4 space-y-2.5">
                    {modul.points.map((point) => (
                      <li key={point} className="flex gap-2.5 text-sm text-ink-soft">
                        <ClipboardCheck size={17} className="mt-0.5 shrink-0 text-eco-600" />
                        <span className="leading-snug">{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="alur">
          <h2 id="alur" className="text-xl font-bold text-ink">
            Bagaimana penggunaannya
          </h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: QrCode,
                title: "Siswa tunjukkan QR",
                body: "Setiap siswa punya QR pribadi di halaman QR Saya.",
              },
              {
                icon: ScanLine,
                title: "Petugas memindai",
                body: "Petugas memindai QR, memasukkan jenis dan berat sampah, poin langsung masuk.",
              },
              {
                icon: CreditCard,
                title: "Poin dipakai di kantin",
                body: "Poin ditukar jadi potongan harga saat memesan, pesanan siap di jam istirahat.",
              },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex gap-3 rounded-card border border-line bg-white p-4">
                  <span className="tnum grid h-9 w-9 shrink-0 place-items-center rounded-control bg-mint text-sm font-bold text-ink-soft">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-eco-700" />
                      <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
                    </div>
                    <p className="mt-1 text-sm leading-snug text-muted">{step.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="mt-10" aria-labelledby="klasemen">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="klasemen" className="text-xl font-bold text-ink">
                Klasemen kelas
              </h2>
              <p className="mt-1 text-sm text-muted">
                Diurutkan dari total kilogram sampah yang didaur ulang.
              </p>
            </div>
            <Link
              href={ROUTE.leaderboard}
              className="text-sm font-semibold text-eco-700 hover:underline"
            >
              Lihat semua kelas
            </Link>
          </div>

          <div className="mt-4">
            {top.length === 0 ? (
              <p className="rounded-card border border-dashed border-line bg-white px-4 py-6 text-center text-sm text-muted">
                Belum ada setoran sampah tercatat. Klasemen akan terisi setelah petugas memproses
                setoran pertama.
              </p>
            ) : (
              <ol className="overflow-hidden rounded-card border border-line bg-white">
                {top.map((row, index) => (
                  <li
                    key={row.class_name}
                    className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
                  >
                    <span className="tnum grid h-8 w-8 shrink-0 place-items-center rounded-control bg-eco-600 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                      {row.class_name}
                    </span>
                    <span className="tnum text-sm font-bold text-ink">
                      {formatKg(row.total_kg)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
          <BrandMark />
          <p className="text-xs text-muted">
            Ekosistem digital SMKN 1 Murung Pudak.
          </p>
        </div>
      </footer>
    </div>
  );
}
