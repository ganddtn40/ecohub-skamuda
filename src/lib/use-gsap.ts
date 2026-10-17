"use client";

import { useEffect, useState } from "react";
import { readTier } from "@/lib/device-tier";

/**
 * Pemuat GSAP.
 *
 * GSAP sengaja **tidak** diimpor di tingkat modul. Impor statis menaruh
 * seluruh GSAP ke bundel awal setiap halaman yang memakainya, dan halaman yang
 * memakainya termasuk `/siswa` dan `/siswa/kantin` — halaman pertama yang
 * dibuka hampir setiap siswa. Dengan `import()` di dalam fungsi, GSAP menjadi
 * potongan berkas terpisah yang baru diambil setelah cat pertama, dan tidak
 * diambil sama sekali oleh perangkat tingkat `lite` (lihat `useGsap`).
 *
 * Konsekuensi yang penting dan disengaja: tidak ada animasi yang berjalan saat
 * server merender, dan tiap komponen merender keadaan akhirnya lebih dulu.
 * Karena itu seluruh animasi di aplikasi ini memakai bentuk `from()` — titik
 * akhirnya sudah ada di HTML, jadi konten tetap terbaca bila berkas ini tidak
 * pernah tiba.
 */
export type Gsap = typeof import("gsap").gsap;

let janji: Promise<Gsap> | null = null;

export function loadGsap(): Promise<Gsap> {
  if (janji) return janji;

  janji = import("gsap")
    .then(async (mod) => {
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      // Sekali saja, dan lewat modul yang sama dengan yang dipakai pemanggil:
      // dua salinan GSAP berarti pluginnya terdaftar di salinan yang salah dan
      // diam-diam tidak berpengaruh.
      mod.gsap.registerPlugin(ScrollTrigger);
      return mod.gsap;
    })
    .catch((err) => {
      // Potongannya gagal diambil (jaringan putus, atau berkasnya diblokir).
      // Janjinya dilepas supaya pemasangan berikutnya masih bisa mencoba lagi,
      // dan kesalahannya dilempar supaya pemanggil yang memutuskan apa yang
      // pantas dilakukan — bukan diam-diam mengembalikan mesin yang tidak ada.
      janji = null;
      throw err;
    });

  return janji;
}

/**
 * Kelas `ScrollTrigger`, untuk komponen yang butuh memanggilnya langsung
 * (`ScrollTrigger.batch`). Dipisah dari `useGsap()` karena GSAP inti dan
 * pluginnya dua modul yang berbeda, dan pemanggil yang cuma butuh menganimasikan
 * angka tidak perlu ikut memuat ScrollTrigger.
 *
 * Impor keduanya mengambil modul yang sudah ada di cache setelah `loadGsap()`
 * berjalan; tidak ada berkas yang diunduh dua kali.
 */
export type ScrollTriggerApi = typeof import("gsap/ScrollTrigger").ScrollTrigger;

export function loadScrollTrigger(): Promise<ScrollTriggerApi> {
  return import("gsap/ScrollTrigger").then((mod) => mod.ScrollTrigger);
}

/**
 * Mesin GSAP untuk komponen ini, atau `null`.
 *
 * `null` selama potongannya masih diambil, dan `null` selamanya di perangkat
 * tingkat `lite` — di situ `loadGsap()` tidak pernah dipanggil, sehingga tidak
 * ada satu byte pun JavaScript animasi yang masuk daftar unduhan.
 *
 * Komponen yang memakainya harus memperlakukan `null` sebagai keadaan yang sah
 * dan lengkap: kontennya sudah benar tanpa animasi, karena animasinya berbentuk
 * `from()`.
 */
export function useGsap(): Gsap | null {
  const [mesin, setMesin] = useState<Gsap | null>(null);

  useEffect(() => {
    if (readTier() === "lite") return;

    let hidup = true;
    loadGsap().then(
      (g) => {
        if (hidup) setMesin(g);
      },
      () => {
        // Tanpa GSAP halaman tetap terbaca; tidak ada yang perlu diberitahukan
        // ke konsol pengguna.
      },
    );

    return () => {
      hidup = false;
    };
  }, []);

  return mesin;
}
