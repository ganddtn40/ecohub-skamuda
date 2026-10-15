import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "green" | "amber" | "neutral";

const ICON_TONES: Record<Tone, string> = {
  green: "bg-eco-50 text-eco-700",
  amber: "bg-gold-50 text-gold-600",
  neutral: "bg-mint text-ink-soft",
};

/** Kartu metrik tunggal: ikon, label, nilai besar. */
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
    <div className={cn("rounded-card border border-line bg-white p-4", className)}>
      <div className="flex items-center gap-2.5">
        <span className={cn("grid h-9 w-9 place-items-center rounded-control", ICON_TONES[tone])}>
          {icon}
        </span>
        <span className="text-sm font-semibold text-muted">{label}</span>
      </div>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="tnum text-2xl font-bold leading-none text-ink">{value}</span>
        {unit ? <span className="text-sm font-semibold text-muted">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
