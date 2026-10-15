"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/layout/BrandMark";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { NavItem } from "@/components/layout/nav";
import { cn } from "@/lib/cn";

/**
 * Header emerald dengan sudut bawah melengkung (rounded-bottom).
 * Desktop menampilkan nav inline; mobile memakai BottomNav.
 */
export function AppHeader({
  nav,
  fullName,
  roleLabel,
}: {
  nav: NavItem[];
  fullName: string;
  roleLabel: string;
}) {
  const pathname = usePathname();

  return (
    <header className="rounded-b-header bg-eco-600 text-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <BrandMark tone="light" />

        <div className="flex items-center gap-2">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight">{fullName}</p>
            <p className="text-[11px] text-white/75">{roleLabel}</p>
          </div>
          <LogoutButton />
        </div>
      </div>

      <nav
        aria-label="Navigasi utama"
        className="mx-auto hidden w-full max-w-5xl gap-1 px-4 pb-3 sm:px-6 md:flex"
      >
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold transition-colors",
                active ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
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
