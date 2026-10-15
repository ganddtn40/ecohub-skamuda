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
        <h1 className="text-xl font-bold tracking-[-0.01em] text-ink sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
