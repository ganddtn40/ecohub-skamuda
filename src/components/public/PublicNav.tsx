import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { buttonStyles } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ROUTE } from "@/lib/constants";

export interface PublicNavLink {
  label: string;
  href: string;
}

/**
 * Navigasi halaman publik. Duduk langsung di atas bidang halaman (tanpa bar
 * terpisah), sesuai arah desain: wordmark kiri, paling banyak tiga tautan teks
 * di kanan, lalu satu tombol masuk.
 *
 * Dibungkus `<header>` karena ini memang kepala halaman, sekaligus menandai
 * teks ini sebagai bagian dari kepala (bukan label pengantar di atas judul).
 */
export function PublicNav({
  links,
  tone = "onDark",
  className,
}: {
  links: PublicNavLink[];
  tone?: "onDark" | "onLight";
  className?: string;
}) {
  const onDark = tone === "onDark";

  return (
    <header className={cn("flex items-center justify-between gap-4", className)}>
      <Link href={ROUTE.home} aria-label="Beranda SKAMUDA EcoHub" className="shrink-0">
        <BrandMark tone={onDark ? "light" : "dark"} showSub={false} />
      </Link>

      <nav aria-label="Navigasi publik" className="flex items-center gap-1">
        <ul className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "inline-flex h-11 items-center rounded-full px-3.5 text-[15px] font-semibold transition-colors",
                  onDark
                    ? "text-white/80 hover:bg-white/10 hover:text-white"
                    : "text-ink-soft hover:bg-eco-50 hover:text-eco-800",
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href={ROUTE.login} className={buttonStyles(onDark ? "onDark" : "secondary", "sm")}>
          Masuk
        </Link>
      </nav>
    </header>
  );
}
