import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { buttonStyles } from "@/components/ui/Button";
import { ROUTE } from "@/lib/constants";

/**
 * Header publik ringkas untuk halaman di luar beranda (mis. halaman tidak
 * ditemukan). Beranda dan papan skor memakai PublicNav di dalam babnya sendiri.
 */
export function PublicHeader() {
  return (
    <header className="on-field bg-eco-900 text-white">
      <div className="page-x mx-auto flex w-full max-w-5xl items-center justify-between gap-3 py-3.5">
        <Link href={ROUTE.home} aria-label="Beranda SKAMUDA EcoHub">
          <BrandMark tone="light" />
        </Link>

        <nav aria-label="Navigasi publik" className="flex items-center gap-1">
          <Link
            href={ROUTE.leaderboard}
            className="hidden h-11 items-center rounded-full px-3.5 text-[15px] font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
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
