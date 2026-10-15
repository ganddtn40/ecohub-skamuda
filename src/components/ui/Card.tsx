import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement>;

/**
 * Bidang kerja utama di dalam aplikasi: satu langkah nada di atas latar
 * halaman, tanpa garis tepi.
 */
export function Card({ className, ...props }: CardProps) {
  return <div className={cn("rounded-card bg-white", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-eco-50 text-eco-700">
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="text-[17px] font-bold leading-tight text-ink">{title}</h2>
          {description ? (
            <p className="mt-1 text-small leading-snug text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}
