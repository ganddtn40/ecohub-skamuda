import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Wordmark + logo resmi sekolah. Logo ditempatkan pada chip putih agar tetap
 * terbaca di atas header emerald.
 */
export function BrandMark({
  tone = "dark",
  showText = true,
  className,
}: {
  tone?: "dark" | "light";
  showText?: boolean;
  className?: string;
}) {
  const textColor = tone === "light" ? "text-white" : "text-ink";
  const subColor = tone === "light" ? "text-white/75" : "text-muted";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-white ring-1 ring-black/5">
        <Image
          src="/logo.png"
          alt="Logo SKAMUDA EcoHub"
          width={28}
          height={28}
          priority
          className="h-7 w-7 object-contain"
        />
      </span>
      {showText ? (
        <span className="leading-tight">
          <span className={cn("block text-[15px] font-bold", textColor)}>SKAMUDA EcoHub</span>
          <span className={cn("block text-[11px]", subColor)}>SMKN 1 Murung Pudak</span>
        </span>
      ) : null}
    </div>
  );
}
