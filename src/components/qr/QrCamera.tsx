"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { CameraOff } from "lucide-react";

/**
 * Komponen kamera QR yang dapat dipakai ulang.
 * Memakai html5-qrcode dan kamera belakang (facingMode: environment).
 */
export function QrCamera({
  elementId,
  onDecode,
  active = true,
}: {
  elementId: string;
  onDecode: (text: string) => void;
  active?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const onDecodeRef = useRef(onDecode);
  onDecodeRef.current = onDecode;

  useEffect(() => {
    if (!active) return;

    let disposed = false;
    let instance: Html5Qrcode | null = null;
    setError(null);

    (async () => {
      try {
        const mod = await import("html5-qrcode");
        if (disposed) return;

        instance = new mod.Html5Qrcode(elementId, { verbose: false });
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => onDecodeRef.current(decodedText),
          () => {},
        );
      } catch (err) {
        if (!disposed) {
          setError(
            err instanceof Error
              ? err.message
              : "Kamera tidak dapat diakses. Gunakan input kode manual.",
          );
        }
      }
    })();

    return () => {
      disposed = true;
      const current = instance;
      if (current) {
        current
          .stop()
          .then(() => current.clear())
          .catch(() => {});
      }
    };
  }, [active, elementId]);

  return (
    <div>
      <div className="overflow-hidden rounded-control border border-line bg-ink/5">
        {active ? (
          <div id={elementId} className="min-h-[240px] w-full [&_video]:w-full" />
        ) : (
          <div className="flex min-h-[240px] items-center justify-center">
            <CameraOff size={26} className="text-muted" />
          </div>
        )}
      </div>
      {error ? <p className="mt-2 text-sm text-gold-600">{error}</p> : null}
    </div>
  );
}
