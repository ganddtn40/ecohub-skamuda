"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/layout/BrandMark";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NAV_BY_ROLE } from "@/components/layout/nav";
import { StaggerGroup, StaggerItem } from "@/components/motion/StaggerGroup";
import { cn } from "@/lib/cn";
import { activeNavHref } from "@/lib/nav-active";
import type { UserRole } from "@/types/database";

/**
 * Kepala semua dashboard: satu bidang eco-900, tanpa sudut melengkung.
 * Desktop menampilkan nav inline; mobile memakai BottomNav.
 *
 * Kelompok stagger di sini memakai `animateOnMount={false}`, dan itu memang
 * disengaja: header adalah hal pertama yang terlihat saat halaman dibuka, jadi
 * `initial="hidden"` akan menulis `opacity: 0` ke HTML-nya — di HP lambat
 * artinya kepala halaman kosong selama hidrasi. Yang dipakai dari kelompok ini
 * karena itu penandanya, bukan animasinya.
 */
export function AppHeader({
  role,
  fullName,
  roleLabel,
}: {
  role: UserRole;
  fullName: string;
  roleLabel: string;
}) {
  const pathname = usePathname();
  const nav = NAV_BY_ROLE[role];
  const activeHref = activeNavHref(
    pathname,
    nav.map((item) => item.href),
  );

  return (
    <header className="on-field bg-eco-900 text-white">
      <StaggerGroup stagger={0.05} animateOnMount={false}>
        <StaggerItem className="page-x flex items-center justify-between gap-3 py-4">
          <BrandMark tone="light" />

          <div className="flex items-center gap-2.5">
            <div className="hidden text-right sm:block">
              <p className="text-[15px] font-bold leading-tight">{fullName}</p>
              <p className="text-small text-white/70">{roleLabel}</p>
            </div>
            <LogoutButton />
          </div>
        </StaggerItem>

        <StaggerItem>
          <nav aria-label="Navigasi utama" className="page-x hidden gap-1 pb-4 md:flex">
            {nav.map((item) => {
              const active = item.href === activeHref;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors",
                    active ? "bg-white text-eco-900" : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </StaggerItem>
      </StaggerGroup>
    </header>
  );
}
