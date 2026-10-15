"use client";

import { QRCodeSVG } from "qrcode.react";
import { ScanLine } from "lucide-react";

/**
 * Kartu QR fisik siswa. Nilai QR adalah qr_code_token unik milik siswa di database,
 * sehingga hanya token yang sah yang bisa dipindai petugas.
 */
export function QrPass({
  token,
  fullName,
  className,
}: {
  token: string;
  fullName: string;
  className?: string | null;
}) {
  return (
    <div className="rounded-card border border-line bg-white p-5 text-center">
      <div className="mx-auto w-fit rounded-control border border-line bg-white p-4">
        <QRCodeSVG value={token} size={216} level="M" marginSize={0} />
      </div>

      <p className="mt-4 text-base font-bold text-ink">{fullName}</p>
      {className ? <p className="text-sm text-muted">{className}</p> : null}

      <p className="tnum mt-3 text-xs text-muted">Token: {token}</p>

      <div className="mt-4 flex items-start gap-2 rounded-control bg-mint px-3 py-2.5 text-left">
        <ScanLine size={16} className="mt-0.5 shrink-0 text-eco-700" />
        <p className="text-xs leading-relaxed text-muted">
          Tunjukkan QR ini ke petugas Bank Sampah saat menyetor. QR ini bersifat pribadi, jangan
          dibagikan ke orang lain.
        </p>
      </div>
    </div>
  );
}
