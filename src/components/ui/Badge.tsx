import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "green" | "amber" | "red" | "blue";

const TONES: Record<Tone, string> = {
  neutral: "bg-mint text-ink-soft",
  green: "bg-eco-50 text-eco-700",
  amber: "bg-gold-50 text-gold-600",
  red: "bg-danger-50 text-danger-600",
  blue: "bg-sky-50 text-sky-700",
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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-small font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
