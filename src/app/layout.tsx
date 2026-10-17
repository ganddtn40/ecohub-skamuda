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
    /*
      `suppressHydrationWarning` di sini bukan kelalaian yang disamarkan.

      Skrip tingkat perangkat di bawah menulis `data-tier` ke elemen ini sebelum
      React hidup, dan React 19 menandai perbedaan itu sebagai kesalahan hidrasi
      — betul secara teknis, tapi tidak berguna: nilai yang benar memang hanya
      bisa diketahui peramban. Ini persis kasus yang disebut dokumentasi React
      untuk atribut ini, dan cara yang sama dipakai pustaka tema yang menulis
      `class` ke `<html>` sebelum hidrasi.

      Yang diredam hanya perbandingan atribut pada elemen ini; anak-anaknya
      tetap diperiksa seperti biasa.
    */
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
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
        {/*
          Jaring untuk peramban tanpa JavaScript.

          Keadaan `initial` milik Framer Motion tidak pernah berganti tanpa
          hidrasi, dan yang tertulis di HTML untuk elemen itu adalah
          `opacity: 0` — artinya tanpa JavaScript justru kontennya yang hilang,
          bukan animasinya. Satu aturan ini mengembalikannya ke keadaan akhir.
          Ditulis sebagai CSS, bukan sebagai `initial={false}`, karena yang
          perlu diperbaiki bukan mesin yang punya JavaScript, melainkan mesin
          yang tidak punya.
        */}
        <noscript>
          <style>{`[data-stagger-item]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
