import { cn } from "@/lib/cn";

/**
 * Motif identitas halaman: lingkaran daur ulang dua panah.
 * Bentuknya diambil dari sistem itu sendiri (sampah kembali jadi makanan),
 * dan dipakai berulang pada skala berbeda sebagai satu gerakan yang sama.
 *
 * Mewarisi `currentColor`, jadi bidang gelap maupun terang bisa memakainya.
 */
export function LoopMotif({
  className,
  strokeWidth = 30,
  animated = true,
}: {
  className?: string;
  strokeWidth?: number;
  animated?: boolean;
}) {
  const dash = 1000;

  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden="true"
      className={cn("block", className)}
    >
      <defs>
        <marker
          id="loop-head"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="1.7"
          markerHeight="1.7"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0.5 0.5L10 5L0.5 9.5L3 5Z" fill="currentColor" />
        </marker>
      </defs>

      {[
        "M55 161A150 150 0 0 1 345 161",
        "M345 239A150 150 0 0 1 55 239",
      ].map((d, index) => (
        <path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          markerEnd="url(#loop-head)"
          {...(animated
            ? {
                strokeDasharray: dash,
                style: {
                  ["--ring-len" as string]: `${dash}`,
                  animation: `ring-sweep 1.5s cubic-bezier(0.4,0,0.2,1) ${index * 0.35}s both`,
                },
              }
            : {})}
        />
      ))}
    </svg>
  );
}
