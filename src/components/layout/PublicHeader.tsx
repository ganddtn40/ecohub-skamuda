import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { buttonStyles } from "@/components/ui/Button";
import { ROUTE } from "@/lib/constants";

/** Header publik (beranda & papan skor) dengan sudut bawah melengkung. */
export function PublicHeader() {
  return (
    <header className="rounded-b-header bg-eco-600">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <Link href={ROUTE.home} aria-label="Beranda SKAMUDA EcoHub">
          <BrandMark tone="light" />
        </Link>

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
    </header>
  );
}
