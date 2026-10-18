import type { MetadataRoute } from "next";

/**
 * Manifest PWA.
 *
 * Ikonnya berasal dari paket `favicon_io`, tetapi `site.webmanifest` bawaan
 * paket itu berisi `name` dan `short_name` kosong serta warna putih. Kalau
 * dipakai apa adanya, nama aplikasi di layar utama ponsel jadi kosong dan
 * splash screen-nya putih. Karena itu isinya ditulis ulang di sini dengan nama
 * aplikasi dan warna yang benar-benar dipakai: emerald header `#0A7A44` dan
 * latar halaman `#F4F7F5` (sama dengan `viewport.themeColor` di layout).
 *
 * Next menyajikan berkas ini sebagai `/manifest.webmanifest` dan menautkannya
 * sendiri ke setiap halaman, jadi tidak ada `metadata.manifest` yang perlu
 * ditulis dan tidak ada `public/site.webmanifest` yang perlu disimpan.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SKAMUDA EcoHub",
    short_name: "EcoHub",
    description:
      "Bank Sampah berbasis poin dan Pre-Order Kantin Pintar SMKN 1 Murung Pudak.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F7F5",
    theme_color: "#0A7A44",
    lang: "id",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
