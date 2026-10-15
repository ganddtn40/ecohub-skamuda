import { cn } from "@/lib/cn";

/**
 * Circular progress untuk target daur ulang. Nilai 0..1.
 * Angka di tengah selalu ditampilkan sebagai data nyata (bukan dekorasi).
 */
export function ProgressRing({
  value,
  size = 112,
  stroke = 10,
  label,
  sublabel,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  sublabel?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * clamped;

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-mint-deep"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-eco-600 transition-[stroke-dasharray] duration-700 ease-out"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="tnum text-[17px] font-bold text-ink">{label}</span>
        {sublabel ? <span className="text-small text-muted">{sublabel}</span> : null}
      </div>
    </div>
  );
}
