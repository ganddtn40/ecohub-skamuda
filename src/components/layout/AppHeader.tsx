"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/layout/BrandMark";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NAV_BY_ROLE } from "@/components/layout/nav";
import { cn } from "@/lib/cn";
import type { UserRole } from "@/types/database";

/**
 * Kepala semua dashboard: satu bidang eco-900, tanpa sudut melengkung.
 * Desktop menampilkan nav inline; mobile memakai BottomNav.
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

  return (
    <header className="on-field bg-eco-900 text-white">
      <div className="page-x flex items-center justify-between gap-3 py-4">
        <BrandMark tone="light" />

        <div className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="text-[15px] font-bold leading-tight">{fullName}</p>
            <p className="text-small text-white/70">{roleLabel}</p>
          </div>
          <LogoutButton />
        </div>
      </div>

      <nav aria-label="Navigasi utama" className="page-x hidden gap-1 pb-4 md:flex">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
    </header>
  );
}
