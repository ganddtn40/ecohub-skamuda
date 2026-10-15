import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "green" | "amber" | "red" | "blue";

const TONES: Record<Tone, string> = {
  neutral: "border-line bg-mint text-ink-soft",
  green: "border-eco-200 bg-eco-50 text-eco-700",
  amber: "border-gold-100 bg-gold-50 text-gold-600",
  red: "border-danger-500/30 bg-danger-50 text-danger-600",
  blue: "border-sky-200 bg-sky-50 text-sky-700",
};

/** Penanda status/label. Dipakai bila ada informasi nyata, bukan hiasan. */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
