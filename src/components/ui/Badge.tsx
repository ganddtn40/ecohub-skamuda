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

/**
 * Penanda status/label. Dipakai bila ada informasi nyata, bukan hiasan.
 *
 * `pulse` menambahkan satu titik kecil yang berdenyut pelan di depan teksnya -
 * untuk status yang sedang berjalan, seperti pesanan yang sedang disiapkan.
 * Yang berdenyut hanya titiknya, bukan badge-nya: teks yang ikut membesar-
 * mengecil terbaca sebagai kedipan dan justru menyulitkan dibaca. Warnanya
 * `bg-current`, jadi titiknya selalu sewarna dengan teks badge-nya sendiri.
 */
export function Badge({
  children,
  tone = "neutral",
  pulse = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  pulse?: boolean;
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
      {pulse ? (
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current motion-safe:animate-pulse-dot"
        />
      ) : null}
      {children}
    </span>
  );
}
