"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button, buttonStyles } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";
import { ROUTE } from "@/lib/constants";

/** Error state untuk halaman publik (beranda dan papan skor). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-mint">
      <header className="on-field bg-eco-900 text-white">
        <div className="page-x mx-auto flex w-full max-w-5xl items-center py-3.5">
          <Link href={ROUTE.home} aria-label="Beranda SKAMUDA EcoHub">
            <BrandMark tone="light" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <ErrorState
          title="Halaman gagal dimuat"
          description={error.message || "Terjadi kesalahan saat mengambil data dari server."}
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={reset}>
                <RotateCcw size={16} />
                Coba lagi
              </Button>
              <Link href={ROUTE.home} className={buttonStyles("ghost", "sm")}>
                Kembali ke beranda
              </Link>
            </div>
          }
        />
      </main>
    </div>
  );
}
