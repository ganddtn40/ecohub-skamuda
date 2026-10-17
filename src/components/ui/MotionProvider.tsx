"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Satu tempat yang mengatur seluruh animasi Framer Motion.
 *
 * Berkas terpisah ini ada karena Framer Motion tidak menandai berkasnya sendiri
 * dengan `"use client"`. Mengimpornya langsung dari server component seperti
 * layout root berarti konteksnya ikut dijalankan di server; pembungkus klien
 * sekecil ini yang membuatnya sah.
 *
 * `reducedMotion="user"` membuat semua animasi Framer Motion mengikuti setelan
 * sistem tanpa perlu memeriksa preferensinya di tiap komponen. Aturan di
 * `globals.css` hanya menjangkau animasi CSS; gerak yang digerakkan JavaScript
 * tidak tersentuh aturan itu, jadi keduanya memang perlu ada. Bedanya dengan
 * aturan CSS: di sini yang dimatikan hanya gerak dan skala, sedangkan pudarnya
 * tetap berjalan — sehingga panel dan notifikasi tetap muncul dan hilang, hanya
 * tanpa berpindah tempat.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
