import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-control border border-line bg-white px-3 py-2.5 text-[15px] text-ink " +
  "placeholder:text-muted/70 transition-colors " +
  "focus:border-eco-500 focus:outline-none focus:ring-2 focus:ring-eco-500/25 " +
  "disabled:cursor-not-allowed disabled:bg-mint disabled:text-muted " +
  // Jarak gulir bawah: saat kolom ini difokuskan dan peramban menggulirnya ke
  // dalam pandangan, sisa ruang di bawahnya ikut diperhitungkan. Di HP, keyboard
  // memakan sebagian tinggi layar, dan tanpa ini kolom yang difokuskan bisa
  // mendarat tepat di tepi bawah — tombol kirim di bawahnya lalu tertutup.
  "scroll-mb-32";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "min-h-[88px] resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(CONTROL, "appearance-none bg-[length:16px] pr-9", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235B6B63' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.75rem center",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-2 block text-small font-semibold text-ink-soft", className)}
      {...props}
    />
  );
}

/** Label + kontrol + pesan bantuan/error dalam satu blok. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-small text-danger-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-small text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
