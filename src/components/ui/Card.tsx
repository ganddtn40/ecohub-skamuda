import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return <div className={cn("rounded-card border border-line bg-white", className)} {...props} />;
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
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-control bg-eco-50 text-eco-700">
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="text-[15px] font-semibold leading-tight text-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm leading-snug text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}
