"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/**
 * Pudar masuk untuk perpindahan antar halaman di dalam satu grup rute.
 *
 * **Hanya opasitas, tidak pernah `transform`.** Framer meninggalkan
 * `transform: translateY(0px)` setelah tween selesai, dan itu bukan `none`.
 * Leluhur yang punya `transform` menjadi *containing block* bagi keturunannya
 * yang `position: fixed`, sehingga bar keranjang di `MenuCatalog` dan apa pun
 * yang menempel di bawah layar ikut tergulung bersama halaman. Opasitas tidak
 * mengubah containing block.
 *
 * Pemuatan pertama dikecualikan: `pernahTampil` adalah penanda tingkat modul
 * yang mulai `false`, dan dibaca sekali lewat `useState`. Selama masih `false`,
 * `initial` bernilai `false` sehingga HTML server tidak pernah memuat
 * `opacity: 0` - halaman pertama tampil utuh walau JavaScript belum jalan.
 * Sesudah `useEffect` menandainya selesai, pemasangan berikutnya memudar masuk.
 * Di server `useEffect` tidak pernah berjalan, jadi HTML server selalu sama
 * dengan render pertama klien dan tidak ada selisih hidrasi.
 *
 * Kenapa ada dua komponen. `Fade` yang memegang status dan `key` dari
 * pathname ada di komponen itu, bukan di `motion.div` di dalamnya. Kalau
 * kuncinya hanya dipasang pada div, React membuat ulang simpul DOM-nya tetapi
 * **komponennya tidak dipasang ulang** - `useState` tidak pernah dijalankan
 * lagi, `pemuatanPertama` tetap `true` selamanya, dan pudarnya tidak pernah
 * terlihat. Diukur di browser: dengan kunci di dalam, `/siswa` ->
 * `/siswa/kantin` membuat div baru dengan `opacity: 1` sejak frame pertama.
 *
 * `template.tsx` sendiri seharusnya sudah memasang ulang setiap navigasi, dan
 * untuk grup `(auth)` memang begitu. Untuk grup `(app)` tidak: `/siswa` ->
 * `/siswa/kantin` memakai ulang simpul dan komponen yang sama persis. Kunci
 * dari pathname memaksa pemasangan ulang seperti yang dijanjikan `template.tsx`.
 * Param pencarian tidak mengubah pathname, jadi perubahan filter di halaman
 * yang sama tidak memicu pudar.
 */
let pernahTampil = false;

function Fade({ children }: { children: ReactNode }) {
  const [pemuatanPertama] = useState(() => !pernahTampil);

  useEffect(() => {
    pernahTampil = true;
  }, []);

  return (
    <motion.div
      initial={pemuatanPertama ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function PageFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return <Fade key={pathname}>{children}</Fade>;
}
