"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * Notifikasi singkat di sudut bawah layar.
 *
 * Dipakai untuk hal yang tidak boleh menghentikan pekerjaan penjual: pesanan baru
 * datang, dan itu berarti. Karena itu toast **tidak** memblokir apa pun, bisa
 * ditutup sendiri, dan memakai `role="status"` — bukan `alert`. `alert` memotong
 * pembaca layar di tengah kalimat; status hanya menyisipkannya.
 *
 * Maksimal tiga toast tampil bersamaan; yang tertua mengalah supaya penjual tidak
 * menumpuk antrean pengumuman yang sudah basi.
 *
 * Masuk dan keluarnya digerakkan Framer Motion. Yang benar-benar dibutuhkan dari
 * sana adalah animasi keluarnya: toast yang hilang begitu saja membuat mata
 * kehilangan jejak apakah pesannya sempat terbaca. `layout="position"` membuat
 * sisa toast bergeser turun dengan tenang saat satu di antaranya pergi, tanpa
 * ikut meregangkan teksnya.
 */

interface ToastAction {
  label: string;
  run: () => void;
}

interface ToastRecord {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastApi {
  /** Tampilkan satu toast. `actionLabel` dan `onAction` harus diberi bersamaan. */
  show: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS = 6000;
const MAX_TOASTS = 3;

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("useToast harus dipakai di dalam ToastProvider");
  }
  return api;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const clearTimer = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    },
    [clearTimer],
  );

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = nextId.current;
      nextId.current += 1;

      const action =
        options?.actionLabel && options.onAction
          ? { label: options.actionLabel, run: options.onAction }
          : undefined;

      setToasts((prev) => {
        const next = [...prev, { id, message, action }];
        // Yang tertua dibuang beserta pengatur waktunya, supaya peta timer tidak
        // tumbuh sepanjang sesi.
        for (const dropped of next.slice(0, Math.max(0, next.length - MAX_TOASTS))) {
          clearTimer(dropped.id);
        }
        return next.slice(-MAX_TOASTS);
      });

      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      );
    },
    [clearTimer, dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) clearTimeout(timer);
      map.clear();
    };
  }, []);

  // Identitas stabil: pengguna hook tidak perlu ikut render ulang setiap provider render.
  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 px-5 pb-24 md:pb-6"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout="position"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-card bg-ink px-4 py-3 text-white"
            >
              <span className="min-w-0 flex-1 text-[15px] leading-snug">{toast.message}</span>

              {toast.action ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.run();
                    dismiss(toast.id);
                  }}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[15px] font-semibold text-eco-200 transition-colors hover:bg-white/10"
                >
                  {toast.action.label}
                </button>
              ) : null}

              <button
                type="button"
                aria-label="Tutup notifikasi"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
