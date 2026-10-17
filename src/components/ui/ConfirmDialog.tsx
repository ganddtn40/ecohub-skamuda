"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
 *
 * Seperti `Sheet`, kelas animasi CSS-nya dilepas karena Framer Motion yang
 * mengurus masuk dan keluarnya. Animasi keluar inilah yang membuat tombolnya
 * tidak sempat ditekan dua kali: panelnya masih terlihat saat menghilang.
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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={pending ? undefined : onClose}
            className="absolute inset-0 cursor-default bg-ink/40"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-sm rounded-card bg-white p-5"
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
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
