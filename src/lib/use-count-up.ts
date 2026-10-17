"use client";

import { useEffect, useRef, useState } from "react";

const TANYA_GERAK = "(prefers-reduced-motion: reduce)";

/**
 * Pelonggaran yang sama artinya dengan `cubic-bezier(0.22, 1, 0.36, 1)` yang
 * dipakai CSS di seluruh aplikasi ini: cepat di awal, panjang di ekornya.
 * Ditulis sebagai fungsi, bukan sebagai bezier, karena menghitung bezier di
 * JavaScript berarti menyelesaikan persamaan untuk tiap frame - dan untuk
 * angka yang bergerak 700 ms, tidak ada mata yang bisa membedakan hasilnya.
 */
function longgar(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

/**
 * Angka yang berjalan menuju nilai barunya, bukan nilai pertamanya.
 *
 * Ditulis tangan dengan `requestAnimationFrame`, bukan di atas `animate()` dari
 * Framer Motion, karena harga mengimpornya tidak sepadan: Framer Motion
 * menambah sekitar 26 kB First Load JS ke `/siswa` — halaman pertama yang
 * dibuka hampir setiap siswa — dan satu hook angka tidak butuh animasi librer
 * sebesar itu. Framer Motion tetap dipakai di tempat yang memang tidak bisa
 * ditiru CSS, yaitu animasi keluar pada Sheet, ConfirmDialog, dan Toast.
 *
 * Dua hal yang menentukan bentuknya:
 *
 * 1. **Nilai pertama dirender apa adanya.** Kalau animasinya dimulai dari nol,
 *    HTML dari server - yang sudah memuat angka benar - akan berubah menjadi
 *    "0" saat hidrasi, dan angka itu yang terbaca pembaca layar. Yang benar:
 *    nilai pertama sudah final, dan animasinya hanya terjadi ketika nilainya
 *    **berubah** — yaitu saat petugas mengkredit poin baru.
 * 2. **Keadaan reduced motion langsung memakai nilai target.** Tidak ada
 *    alasan menghitung angka perantara kalau pengguna meminta tidak ada gerak.
 *
 * Karena alasan nomor satu, hook ini tidak berguna pada render pertama; ia
 * berguna pada render berikutnya, dan itu memang yang diinginkan.
 */
export function useCountUp(value: number, options?: { durationMs?: number }): number {
  const durasiMs = options?.durationMs ?? 700;

  const [tampil, setTampil] = useState(value);
  const [kurangiGerak, setKurangiGerak] = useState(false);

  // Angka terakhir yang benar-benar ditampilkan. Dipakai sebagai titik awal,
  // supaya animasi yang terpotong di tengah melanjutkan dari tempat ia berhenti
  // dan bukan melompat mundur ke nilai target yang lama.
  const mulai = useRef(value);

  useEffect(() => {
    const tanya = window.matchMedia(TANYA_GERAK);
    setKurangiGerak(tanya.matches);
    const onUbah = () => setKurangiGerak(tanya.matches);
    tanya.addEventListener("change", onUbah);
    return () => tanya.removeEventListener("change", onUbah);
  }, []);

  useEffect(() => {
    if (kurangiGerak || durasiMs <= 0 || mulai.current === value) {
      mulai.current = value;
      setTampil(value);
      return;
    }

    const dari = mulai.current;
    const mulaiPada = performance.now();
    let raf = 0;

    const langkah = (kini: number) => {
      const t = Math.min(1, (kini - mulaiPada) / durasiMs);
      const angka = dari + (value - dari) * longgar(t);
      mulai.current = angka;
      setTampil(angka);
      if (t < 1) raf = requestAnimationFrame(langkah);
    };

    raf = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(raf);
  }, [value, kurangiGerak, durasiMs]);

  return tampil;
}
