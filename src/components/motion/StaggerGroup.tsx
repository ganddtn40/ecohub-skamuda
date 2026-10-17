"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Satu anak kelompok stagger: datang dari sedikit di bawah, lalu duduk.
 *
 * `y: 14` dipilih kecil dengan sengaja. Yang membuat kelompok ini terasa
 * tersusun adalah urutannya, bukan jarak tempuhnya — geseran besar pada teks
 * yang harus dibaca justru membuat baris pertama berpindah saat mata sudah
 * mulai membaca.
 */
export const STAGGER_ITEM: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Pegas yang sama dengan yang dipakai Task 8 untuk panel dan dialog. Dipakai di
 * sini untuk kartu yang bisa disentuh: `whileTap` dengan pegas terasa seperti
 * tombol yang menyerah sedikit, bukan seperti gambar yang diperkecil.
 */
export const SPRING_SENTUH = { type: "spring", stiffness: 300, damping: 25 } as const;

/**
 * Kelompok yang anak-anaknya masuk berurutan.
 *
 * Dua properti saja yang dipakai: `initial` dan `animate`. Tidak ada
 * `whileInView`, karena kelompok ini memang dirender bersama halamannya — ia
 * bukan reveal saat digulir, dan menambahkan pemicu gulir hanya akan membuat
 * animasi masuknya bergantung pada posisi gulir yang tidak pernah berubah.
 *
 * `animateOnMount={false}` merender `initial={false}`, dan itu berarti anaknya
 * sudah dalam keadaan akhir di HTML server. Itu yang dipakai di tempat yang
 * terlihat pada cat pertama: `initial="hidden"` akan menulis `opacity: 0` ke
 * HTML, dan di HP lambat artinya teks itu tidak ada sampai hidrasi selesai.
 *
 * `as` dipakai untuk satu hal saja: kelompok yang seluruh isinya sudah menjadi
 * satu elemen bermakna (`<aside>` di halaman auth) tidak perlu dibungkus satu
 * `<div>` lagi. Pembungkus tambahan di situ bukan tanpa akibat — ia menjadi anak
 * flex yang baru, dan jarak antar anak bergeser dari yang sudah ada.
 */
export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
  animateOnMount = true,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  animateOnMount?: boolean;
  as?: "div" | "aside" | "nav";
}) {
  const Gerak = motion[as];

  return (
    <Gerak
      className={className}
      initial={animateOnMount ? "hidden" : false}
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </Gerak>
  );
}

/**
 * Satu anak di dalam `StaggerGroup`.
 *
 * `as` menerima `p` dan `li`, bukan hanya `div`: dua kelompok yang benar-benar
 * memakainya menandai paragraf dan butir daftar, dan menukar tag-nya hanya demi
 * animasi berarti mengubah susunan dokumen demi hiasan.
 *
 * `data-stagger-item` bukan kelas hiasan: jaring `<noscript>` di layout root
 * memakainya untuk memaksa elemen ini terlihat bila JavaScript tidak jalan.
 */
export function StaggerItem({
  children,
  className,
  as = "div",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "p" | "li";
  hover?: boolean;
}) {
  const Gerak = motion[as];

  return (
    <Gerak
      data-stagger-item
      className={className}
      variants={STAGGER_ITEM}
      {...(hover
        ? {
            whileHover: { y: -4 },
            whileTap: { scale: 0.97 },
            transition: SPRING_SENTUH,
          }
        : null)}
    >
      {children}
    </Gerak>
  );
}
