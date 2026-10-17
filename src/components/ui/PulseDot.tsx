"use client";

import { useEffect, useRef } from "react";
import { useGsap } from "@/lib/use-gsap";

/**
 * Titik kecil yang berdenyut pelan, untuk status yang sedang berjalan.
 *
 * Bentuk geraknya sama persis dengan `pulse-dot` yang dulu dipegang CSS:
 * kedalaman 0,45 sampai 1 dan skala 0,8 sampai 1, dengan durasi 1,1 detik per
 * arah — pelan, dan hanya properti komposit yang digerakkan.
 *
 * Yang berubah hanyalah siapa yang menggerakkannya, dan ada dua alasan kenapa
 * itu layak ditukar. Pertama, titik ini hidup di sebelah teks status yang
 * berubah-ubah; kalau mesinnya sudah ada di halaman itu untuk hal lain, tidak
 * ada gunanya satu animasi kecil tetap di jalur CSS. Kedua, dan yang lebih
 * penting: pengguna yang meminta gerak dikurangi atau memakai perangkat tingkat
 * `lite` tidak menjalankan animasi tanpa akhir sama sekali. Sebelum ini, aturan
 * `motion-safe:` sudah mematikan denyutnya bagi mereka; sekarang titiknya berlaku
 * sama seperti sebelumnya - terlihat penuh, hanya diam.
 */
export function PulseDot({ className }: { className?: string }) {
  const titik = useRef<HTMLSpanElement | null>(null);
  const gsap = useGsap();

  useEffect(() => {
    const el = titik.current;
    // Tanpa mesin: tidak ada timeline, tidak ada berkas yang diunduh demi ini,
    // dan titiknya tetap di opacity 1 — terlihat, hanya tidak berdenyut.
    if (!gsap || !el) return;

    gsap.set(el, { scale: 0.8, opacity: 0.45 });
    const denyut = gsap.to(el, {
      scale: 1,
      opacity: 1,
      duration: 1.1,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    return () => {
      denyut.kill();
    };
  }, [gsap]);

  return <span ref={titik} aria-hidden className={className} />;
}
