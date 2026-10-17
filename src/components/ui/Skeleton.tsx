import { cn } from "@/lib/cn";

/**
 * Kerangka saat data sedang dimuat.
 *
 * Sapuannya satu pita terang yang melintas, bukan denyut opacity seperti dulu:
 * denyut membuat seluruh blok berkedip dan menarik mata ke arah yang salah,
 * sedangkan sapuan terbaca sebagai "sedang diambil". Pita itu memakai
 * `transform` sehingga tidak memicu cat ulang, dan letaknya di luar bidang saat
 * animasinya dimatikan - jadi pada `prefers-reduced-motion: reduce` yang
 * tersisa hanya blok sage yang tenang, bukan pita yang berhenti di tengah.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden rounded-control bg-mint-deep", className)}
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent motion-safe:animate-shimmer" />
    </div>
  );
}

/** Placeholder baris daftar saat data sedang dimuat. */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" role="status" aria-label="Memuat data">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-card bg-white p-3.5"
        >
          <Skeleton className="h-10 w-10 rounded-control" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-3" role="status" aria-label="Memuat ringkasan">
      <Skeleton className="h-24 rounded-card" />
      <Skeleton className="h-24 rounded-card" />
    </div>
  );
}
