import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Judul halaman + keterangan singkat. Dipakai konsisten di semua dashboard. */
export function PageTitle({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        <h1 className="text-item font-bold text-ink">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-body text-ink-soft">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
