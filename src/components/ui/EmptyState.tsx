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
        "flex flex-col items-center justify-center rounded-card bg-white px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-mint text-muted">
        {icon}
      </span>
      <p className="mt-4 text-[17px] font-bold text-ink">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-small leading-relaxed text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
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
    <div className="rounded-card bg-danger-50 p-5">
      <p className="text-[17px] font-bold text-danger-600">{title}</p>
      {description ? (
        <p className="mt-1.5 text-small leading-relaxed text-danger-600/90">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
