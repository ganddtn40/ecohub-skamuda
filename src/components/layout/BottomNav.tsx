"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_BY_ROLE } from "@/components/layout/nav";
import { cn } from "@/lib/cn";
import { activeNavHref } from "@/lib/nav-active";
import type { UserRole } from "@/types/database";

/** Navigasi bawah khusus mobile (md:hidden). Target sentuh minimal 44px. */
export function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const nav = NAV_BY_ROLE[role];
  const activeHref = activeNavHref(
    pathname,
    nav.map((item) => item.href),
  );

  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-40 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul
        className="mx-auto grid w-full max-w-lg"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
        {nav.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 py-2 text-small font-semibold transition-colors",
                  active ? "text-eco-700" : "text-muted hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-12 place-items-center rounded-full transition-colors",
                    active ? "bg-eco-50" : "bg-transparent",
                  )}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
