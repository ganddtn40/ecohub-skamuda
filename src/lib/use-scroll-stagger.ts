"use client";

import { useEffect, type RefObject } from "react";
import { loadScrollTrigger, useGsap } from "@/lib/use-gsap";

/**
 * Garis pemicu: 92% tinggi layar.
 *
 * Lebih rendah dari garis reveal halaman (88%) karena daftar ini panjang dan
 * barisnya datang berkelompok: baris terakhir kelompok yang sedang masuk sudah
 * hampir di tepi bawah layar saat baris pertamanya menyentuh garis. Ditulis
 * `92 / 100`, bukan `0.92 * 100`, karena yang kedua menghasilkan
 * 92.0000000000001.
 */
const GARIS = "top 92%";
const GARIS_PECAHAN = 92 / 100;

/** Batas jumlah baris yang ikut dianimasikan. Sisanya statis, dan itu disengaja. */
const MAKS_BAWAAN = 60;

/**
 * Stagger untuk daftar panjang, dipakai bersama oleh tabel riwayat petugas dan
 * papan peringkat kelas.
 *
 * Dipisah dari `RevealScope` karena kebutuhannya berbeda, bukan karena bentuknya
 * berbeda. Reveal halaman menyasar bagian halaman yang jumlahnya belasan; hook ini
 * menyasar baris yang jumlahnya bisa ratusan, dan dua hal mengikuti dari situ:
 *
 * 1. **Ada batasnya.** Menganimasikan seluruh riwayat setoran berarti ratusan
 *    elemen komposit sekaligus, dan itu justru membuat gulir tersendat — persis
 *    kebalikan dari yang diinginkan. Enam puluh baris pertama saja yang bergerak;
 *    selebihnya sudah terlihat dan tetap terlihat.
 * 2. **Baris tabel tidak digeser.** `transform` pada `display: table-row` tidak
 *    didukung merata, jadi pemanggil dari tabel memakai `y: 0` dan animasinya
 *    hanya opacity. Papan peringkat memakai jarak kecil karena barisnya elemen
 *    biasa.
 *
 * Sama seperti reveal halaman, animasinya berbentuk `from()`: keadaan akhirnya
 * sudah ada di HTML server, jadi tidak ada yang tersembunyi bila berkas GSAP
 * tidak pernah tiba. Dan sama juga, elemen yang sudah terlihat saat pemicunya
 * dibuat dibiarkan statis — menganimasikannya berarti kedipan.
 */
export function useScrollStagger(
  scope: RefObject<HTMLElement | null>,
  options?: { max?: number; y?: number },
): void {
  const gsap = useGsap();
  const max = options?.max ?? MAKS_BAWAAN;
  const y = options?.y ?? 10;

  useEffect(() => {
    const root = scope.current;
    if (!gsap || !root) return;

    let hidup = true;
    let pemicu: ReturnType<typeof import("gsap/ScrollTrigger").ScrollTrigger.batch> = [];
    let tween: ReturnType<typeof gsap.from> | null = null;

    // ScrollTrigger sudah didaftarkan oleh loadGsap(); impor kedua ini mengambil
    // modul yang sama dari cache, bukan berkas baru.
    void loadScrollTrigger().then((ScrollTrigger) => {
      if (!hidup) return;

      const elemen = Array.from(root.querySelectorAll<HTMLElement>("[data-stagger]"))
        .slice(0, max)
        .filter((el) => el.getBoundingClientRect().top > window.innerHeight * GARIS_PECAHAN);
      if (elemen.length === 0) return;

      pemicu = ScrollTrigger.batch(elemen, {
        start: GARIS,
        once: true,
        onEnter: (batch) => {
          const sasaran = batch as HTMLElement[];
          tween = gsap.from(sasaran, {
            opacity: 0,
            y,
            duration: 0.38,
            ease: "power2.out",
            stagger: 0.05,
            // Dipasang saat geraknya berjalan dan dilepas begitu selesai: lapisan
            // komposit yang dibiarkan menyala memakan memori GPU, dan pada daftar
            // sepanjang ini jumlahnya menumpuk.
            onStart: () => {
              for (const el of sasaran) {
                el.style.willChange = y === 0 ? "opacity" : "opacity, transform";
              }
            },
            onComplete: () => {
              for (const el of sasaran) el.style.willChange = "";
            },
          });
        },
      });
    });

    return () => {
      hidup = false;
      tween?.kill();
      for (const p of pemicu) p.kill();
    };
  }, [gsap, max, y, scope]);
}
