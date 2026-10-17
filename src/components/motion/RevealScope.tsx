"use client";

import { useEffect, useRef } from "react";
import { loadScrollTrigger, useGsap } from "@/lib/use-gsap";

/**
 * Garis pemicu: 88% tinggi layar.
 *
 * Elemen baru dianggap "masuk" saat tepi atasnya melewati garis ini, bukan saat
 * ia sudah setengah jalan ke atas layar. Angkanya ada dua bentuk karena dipakai
 * dua tempat: `GARIS` untuk ScrollTrigger, dan pecahannya untuk membandingkan
 * kotak elemen saat pemicunya dibuat. Ditulis `88 / 100`, bukan `0.88 * 100`,
 * karena yang kedua menghasilkan 88.00000000000001.
 */
const GARIS = "top 88%";
const GARIS_PECAHAN = 88 / 100;

/**
 * Satu pulau klien untuk seluruh reveal saat digulir di sebuah halaman.
 *
 * Dipasang sekali per halaman, bukan sekali per bagian. Sepuluh bagian halaman
 * berarti sepuluh pemicu gulir yang dievaluasi tiap frame kalau dipasang
 * sendiri-sendiri; satu `ScrollTrigger.batch` untuk semuanya hanya punya satu
 * daftar.
 *
 * Bentuk animasinya `from()`, dan itu bukan pilihan gaya: `from()` berarti
 * elemennya sudah dalam keadaan akhir di HTML server. Tidak ada `gsap.set()`
 * yang menyembunyikannya lebih dulu, jadi:
 *
 * 1. Tanpa JavaScript, halaman tetap terbaca penuh — tidak ada yang tersembunyi.
 * 2. Potongan GSAP yang belum tiba tidak membuat konten tak terlihat; ia hanya
 *    membuat geraknya belum ada.
 *
 * Konsekuensinya: elemen yang sudah terlihat saat halaman dibuka **tidak boleh**
 * diberi `data-reveal`, karena pemicunya akan langsung menyala dan elemen itu
 * sempat berkedip. Elemen yang di atas lipatan memakai masuknya Framer/CSS.
 */
export function RevealScope({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const wadah = useRef<HTMLDivElement | null>(null);
  const gsap = useGsap();

  useEffect(() => {
    const root = wadah.current;
    if (!gsap || !root) return;

    let hidup = true;
    let pemicu: ReturnType<typeof import("gsap/ScrollTrigger").ScrollTrigger.batch> = [];
    let tween: ReturnType<typeof gsap.from> | null = null;

    // ScrollTrigger sudah didaftarkan oleh loadGsap(); impor kedua ini mengambil
    // modul yang sama dari cache, bukan berkas baru.
    void loadScrollTrigger().then((ScrollTrigger) => {
      if (!hidup) return;

      /*
       * Hanya elemen yang benar-benar masih di bawah layar yang dianimasikan.
       *
       * Markahnya sudah membatasi diri pada bagian di bawah lipatan, tapi markah
       * tidak tahu tinggi layar pembacanya: di layar 4K, bagian yang di layar
       * biasa ada di bawah lipatan bisa sudah terlihat saat potongan GSAP tiba.
       * Kalau elemen seperti itu ikut dianimasikan, ia sempat terlihat penuh,
       * lalu melompat ke transparan, lalu muncul lagi — kedipan yang justru
       * lebih mengganggu daripada tidak ada animasi sama sekali.
       *
       * Jadi filter ini memeriksa kotak sungguhan tiap elemen, bukan niat
       * penulis markahnya. Elemen yang sudah terlihat (atau sudah terlewat)
       * dibiarkan apa adanya: statis, dan itu memang jawaban yang benar.
       */

      const elemen = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
        (el) => el.getBoundingClientRect().top > window.innerHeight * GARIS_PECAHAN,
      );
      if (elemen.length === 0) return;

      pemicu = ScrollTrigger.batch(elemen, {
        // 88% tinggi layar: pemicunya menyala saat elemen baru masuk, bukan saat
        // ia sudah setengah jalan ke atas layar.
        start: GARIS,
        once: true,
        onEnter: (batch) => {
          const sasaran = batch as HTMLElement[];
          tween = gsap.from(sasaran, {
            y: 18,
            opacity: 0,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.06,
            // `will-change` memaksa lapisan komposit tersendiri. Dipasang saat
            // geraknya berjalan dan dilepas begitu selesai; dibiarkan menyala,
            // lapisan itu memakan memori GPU dan justru membuat gulir tersendat.
            onStart: () => {
              for (const el of sasaran) el.style.willChange = "transform, opacity";
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
  }, [gsap]);

  return (
    <div ref={wadah} className={className}>
      {children}
    </div>
  );
}
