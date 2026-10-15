import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { ROUTE } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-mint">
      <header className="rounded-b-header bg-eco-600 px-4 pb-10 pt-5 sm:px-6">
        <div className="mx-auto w-full max-w-lg">
          <Link href={ROUTE.home} aria-label="Kembali ke beranda">
            <BrandMark tone="light" />
          </Link>
        </div>
      </header>

      <main className="mx-auto -mt-6 w-full max-w-lg px-4 pb-14 sm:px-6">{children}</main>

      <footer className="pb-8 text-center text-xs text-muted">
        SKAMUDA EcoHub &middot; SMKN 1 Murung Pudak
      </footer>
    </div>
  );
}
