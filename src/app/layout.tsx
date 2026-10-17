import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { MotionProvider } from "@/components/ui/MotionProvider";
import { TIER_BOOTSTRAP } from "@/lib/device-tier";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SKAMUDA EcoHub",
    template: "%s | SKAMUDA EcoHub",
  },
  description:
    "Ekosistem digital SMKN 1 Murung Pudak: Bank Sampah berbasis poin dan Pre-Order Kantin Pintar dalam satu aplikasi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A7A44",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>
        {/*
          Tingkat perangkat dipasang sebelum cat pertama, dan harus begitu:
          kalau ia dipasang setelah React hidup, animasi yang berat sempat
          berjalan sekali di perangkat yang justru tidak mampu menjalankannya.
          App Router tidak menyediakan <head> yang bisa dikendalikan, jadi
          skripnya diletakkan sebagai anak pertama <body> — parser belum
          melihat satu pun konten saat baris ini dieksekusi.
        */}
        <script dangerouslySetInnerHTML={{ __html: TIER_BOOTSTRAP }} />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
