"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";

/**
 * Error state untuk semua halaman di dalam shell aplikasi.
 * Muncul ketika query data benar-benar gagal, jadi pengguna melihat masalahnya
 * alih-alih empty state yang menyesatkan. Header dan navigasi tetap ada karena
 * boundary ini berada di bawah layout.
 */
export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Gagal memuat data"
      description={error.message || "Terjadi kesalahan saat mengambil data dari server."}
      action={
        <Button variant="secondary" size="sm" onClick={reset}>
          <RotateCcw size={16} />
          Coba lagi
        </Button>
      }
    />
  );
}
