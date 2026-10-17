import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "onDark" | "outlineDark";
export type ButtonSize = "sm" | "md";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-11 px-4 text-[15px]",
  md: "h-12 px-6 text-[17px]",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-eco-600 text-white hover:bg-eco-700 active:bg-eco-800",
  secondary: "bg-eco-50 text-eco-800 hover:bg-eco-100",
  ghost: "text-eco-700 hover:bg-eco-50",
  danger: "bg-danger-500 text-white hover:bg-danger-600",
  onDark: "bg-white text-eco-700 hover:bg-mint",
  outlineDark: "border border-white/40 text-white hover:bg-white/10",
};

/**
 * Efek tekan, dipakai bersama oleh `Button` dan tombol yang dirakit langsung
 * (pill filter dan tombol ikon di katalog) supaya rasanya seragam.
 *
 * `motion-safe:` bukan hiasan. Aturan di `globals.css` hanya memangkas durasi
 * transisi, bukan membatalkan transformasinya — tanpa penanda itu, tombol tetap
 * menyusut seketika meski pengguna sudah meminta gerak seminimal mungkin.
 *
 * `enabled:` menjaga tombol yang sedang nonaktif tidak ikut bergerak.
 *
 * Skalanya 0.97, bukan 0.95: pada tombol selebar kolom checkout, 5% berarti
 * sekitar 19px dan terbaca sebagai tata letak yang bergeser, bukan sebagai
 * tekanan.
 */
export const PRESS =
  "transition duration-150 motion-safe:enabled:active:scale-[0.97]";

/** Kelas tombol, dipakai bersama oleh <button> dan <Link>. */
export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold",
    PRESS,
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eco-500 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    SIZES[size],
    VARIANTS[variant],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonStyles(variant, size, className)} {...props} />;
}
