import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <Loader2
      size={size}
      aria-hidden
      className={cn("animate-spin", className)}
      strokeWidth={2.5}
    />
  );
}
