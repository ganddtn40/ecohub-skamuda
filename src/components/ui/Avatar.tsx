import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

/**
 * Avatar berbasis inisial. Tidak memakai foto orang atau gambar buatan (R-23/R-38).
 */
export function Avatar({
  name,
  className,
  size = 40,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-eco-600 font-bold text-white",
        className,
      )}
    >
      {initials(name || "?")}
    </span>
  );
}
