import Link from "next/link";
import { Compass } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { buttonStyles } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROUTE } from "@/lib/constants";

export const metadata = { title: "Halaman tidak ditemukan" };

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-mint">
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <EmptyState
          icon={<Compass size={22} />}
          title="Halaman tidak ditemukan"
          description="Alamat yang kamu buka tidak ada di SKAMUDA EcoHub. Kembali ke beranda untuk mulai lagi."
          action={
            <Link href={ROUTE.home} className={buttonStyles("secondary", "sm")}>
              Kembali ke beranda
            </Link>
          }
        />
      </main>
    </div>
  );
}
