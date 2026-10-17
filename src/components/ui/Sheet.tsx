"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { SPRING_SENTUH } from "@/components/motion/StaggerGroup";
import { cn } from "@/lib/cn";

/**
 * Bottom sheet responsif. Bisa ditutup dengan tombol X, klik backdrop, atau Escape.
 *
 * Masuk dan keluarnya digerakkan Framer Motion, bukan kelas animasi CSS: yang
 * dibutuhkan di sini adalah animasi **keluar**, dan itu menuntut komponennya
 * tetap terpasang selama geraknya berjalan. Karena itu pula kelas
 * `animate-fade-in` dan `animate-sheet-up` dilepas dari sini — kalau keduanya
 * dibiarkan, satu elemen akan dianimasikan dua kali oleh dua mesin berbeda.
 *
 * `initial` di bawah adalah keadaan *sebelum* masuk; warna latar dilakukan oleh
 * pembungkusnya supaya backdrop dan panelnya memudar bersamaan.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
        >
          <button
            type="button"
            aria-label="Tutup panel"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-ink/40"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 24, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, scale: 0.98 }}
            transition={SPRING_SENTUH}
            className={cn(
              "relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-header bg-white shadow-sheet",
              "sm:rounded-card sm:shadow-float",
              className,
            )}
          >
            <div className="flex items-start justify-between gap-3 bg-mint px-5 py-4">
              <div>
                <h2 className="text-[17px] font-bold text-ink">{title}</h2>
                {description ? <p className="mt-0.5 text-[15px] text-muted">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-white hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer ? <div className="bg-mint px-5 py-4">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
