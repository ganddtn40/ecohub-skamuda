"use client";

import type { ReactNode } from "react";
import { StaggerItem } from "@/components/motion/StaggerGroup";
import { cn } from "@/lib/cn";

type Tone = "green" | "amber" | "neutral";

const ICON_TONES: Record<Tone, string> = {
  green: "bg-eco-50 text-eco-700",
  amber: "bg-gold-50 text-gold-600",
  neutral: "bg-mint text-ink-soft",
};

/**
 * Satu angka di dalam pita statistik.
 *
 * Sengaja tanpa kotak dan tanpa garis: beberapa angka yang berdampingan
 * dipisahkan oleh jarak, dan seluruh kelompok duduk di atas satu bidang putih
 * yang disediakan pemanggilnya. Dengan begitu tidak pernah terbentuk deretan
 * kartu kembar yang seragam.
 *
 * Kartu ini juga satu butir stagger: ia masuk bersama kartu lain di pita yang
 * sama dan terangkat sedikit saat disentuh. Karena jeda antar kartu sekarang
 * diatur `staggerChildren` kelompoknya, prop `style` yang dulu mengatur jeda CSS
 * tidak ada lagi.
 */
export function StatTile({
  icon,
  label,
  value,
  unit,
  hint,
  tone = "green",
  className,
}: {
  icon: ReactNode;
  label: string;
  /** Angka yang sudah diformat. Boleh simpul juga, untuk angka yang berjalan. */
  value: ReactNode;
  unit?: string;
  hint?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <StaggerItem hover className={cn("min-w-0", className)}>
      <p className="flex items-baseline gap-1.5">
        <span className="tnum text-[26px] font-bold leading-none text-ink">{value}</span>
        {unit ? <span className="text-small font-semibold text-muted">{unit}</span> : null}
      </p>
      <span className="mt-2 flex items-center gap-2 text-small font-semibold text-muted">
        <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full", ICON_TONES[tone])}>
          {icon}
        </span>
        {label}
      </span>
      {hint ? <p className="mt-1.5 text-small text-muted">{hint}</p> : null}
    </StaggerItem>
  );
}
