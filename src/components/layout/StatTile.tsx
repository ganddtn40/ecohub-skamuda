import type { ReactNode } from "react";
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
  value: string;
  unit?: string;
  hint?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
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
    </div>
  );
}
