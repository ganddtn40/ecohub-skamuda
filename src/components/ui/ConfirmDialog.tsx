"use client";

import { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Dialog konfirmasi untuk aksi penjual yang tidak bisa dibatalkan.
 *
 * Pola fokus dan Escape-nya sama dengan `Sheet`: fokus dipindah ke panel saat
 * dibuka, latar dikunci agar tidak ikut bergulir, dan Escape menutup. Bedanya,
 * panel ini di tengah layar dan sempit, karena isinya cuma satu pertanyaan.
 *
 * Selama `pending` (RPC sedang berjalan) dialog sengaja tidak bisa ditutup:
 * menutup di tengah jalan hanya menyembunyikan hasil yang sudah terlanjur
 * dikirim ke server.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = "danger",
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, pending]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Tutup dialog"
        onClick={pending ? undefined : onClose}
        className="absolute inset-0 cursor-default bg-ink/40 animate-fade-in"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-sm rounded-card bg-white p-5 animate-scale-in"
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle
            size={18}
            className={
              tone === "danger"
                ? "mt-0.5 shrink-0 text-danger-500"
                : "mt-0.5 shrink-0 text-gold-600"
            }
          />
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-ink">{title}</h2>
            <p className="mt-1 text-[15px] text-muted">{description}</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={pending}
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "danger" : "primary"}
            className="flex-1"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? <Spinner className="text-white" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
