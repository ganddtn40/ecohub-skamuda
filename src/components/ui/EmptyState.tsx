import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Empty state netral: tanpa data buatan, hanya penjelasan apa adanya. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-white px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-mint text-muted">
        {icon}
      </span>
      <p className="mt-3 text-[15px] font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Blok error yang jujur: menjelaskan apa yang gagal, bukan menyembunyikannya. */
export function ErrorState({
  title = "Gagal memuat data",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-danger-500/30 bg-danger-50 p-4">
      <p className="text-[15px] font-semibold text-danger-600">{title}</p>
      {description ? <p className="mt-1 text-sm text-danger-600/90">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
