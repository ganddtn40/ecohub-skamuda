"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useGsap } from "@/lib/use-gsap";
import { formatNumber } from "@/lib/format";

/**
 * Angka yang berjalan ke nilai barunya, sudah diformat untuk dibaca.
 *
 * Sengaja hanya membungkus angkanya, bukan seluruh kartu statistiknya: yang
 * perlu hidup di klien hanyalah angka ini. Label, ikon, dan tata letaknya tetap
 * dirender server, jadi tidak ada satu kartu penuh yang ikut dikirim ke peramban
 * hanya demi satu animasi.
 *
 * Dua hal menentukan bentuknya, dan keduanya diwarisi dari hook yang digantikan
 * berkas ini:
 *
 * 1. **Nilai pertama dirender apa adanya, di server.** Yang ditulis server adalah
 *    nilai target, dan tween berakhir tepat di nilai itu — jadi HTML dari server
 *    sudah memuat angka yang benar sebelum ada skrip yang berjalan, dan pembaca
 *    layar tidak pernah mendengar angka 0 yang tidak pernah benar.
 * 2. **Animasi hanya terjadi saat nilainya berubah.** Kalau tween dimulai pada
 *    render pertama, angka dari server akan melompat mundur ke nol saat hidrasi.
 *    Yang benar: nilai pertama sudah final, dan geraknya menyertai perubahan
 *    berikutnya — saat petugas mengkredit poin baru.
 *
 * `TextPlugin` tidak dipakai meski menggoda: teks tengah tween-nya adalah angka
 * mentah, dan yang perlu ditampilkan sudah diformat dengan pemisah ribuan
 * Indonesia. Yang di-tween karena itu objek perantara, lalu `onUpdate` yang
 * memformat dan menuliskan hasilnya.
 *
 * `useLayoutEffect` dipakai supaya tween dimulai sebelum cat: tanpa itu, angka
 * baru sempat terlihat satu frame, lalu melompat mundur ke titik awal tween.
 * Di server `useLayoutEffect` tidak boleh dipanggil, maka pola `useIsoLayoutEffect`
 * di bawah: di server yang terpasang adalah `useEffect` — yang tidak pernah
 * dijalankan karena mesinnya masih `null`.
 */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const DURASI_DETIK = 0.7;

export function CountUp({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const simpul = useRef<HTMLSpanElement | null>(null);

  // Angka terakhir yang benar-benar ditampilkan. Dipakai sebagai titik awal,
  // supaya tween yang terpotong di tengah melanjutkan dari tempat ia berhenti
  // dan bukan melompat mundur ke nilai target yang lama.
  const mulai = useRef(value);
  const gsap = useGsap();

  useIsoLayoutEffect(() => {
    const el = simpul.current;
    if (!el) return;

    const dari = mulai.current;
    const tujuan = value;

    // Tanpa mesin — tingkat `lite`, atau gerak dikurangi — nilai target ditulis
    // apa adanya. Tidak ada yang perlu dianimasikan, dan tidak ada yang diunduh
    // demi ini: `useGsap()` tidak pernah memuat berkas apa pun di jalur itu.
    if (!gsap || dari === tujuan) {
      el.textContent = formatNumber(tujuan, decimals);
      mulai.current = tujuan;
      return;
    }

    // Nilai target ditulis balik menjadi titik awal, dan itu memang perlu.
    //
    // React baru saja merender nilai target yang baru ke simpul ini — memang
    // begitu kontraknya, karena HTML dari server harus memuat nilai terakhir yang
    // benar. Kalau dibiarkan, frame pertama setelah perubahan memperlihatkan
    // nilai akhir sekejap, lalu angka itu mundur ke titik awal tween dan berjalan
    // naik lagi. Karena efek ini berjalan sebelum cat, menulis titik awal di sini
    // membuat frame itu tidak pernah terlihat: yang tercat sudah nilai lama.
    el.textContent = formatNumber(dari, decimals);

    const t = { n: dari };
    const tween = gsap.to(t, {
      n: tujuan,
      duration: DURASI_DETIK,
      ease: "power4.out",
      onUpdate: () => {
        el.textContent = formatNumber(t.n, decimals);
        mulai.current = t.n;
      },
      // Baris terakhir ditulis dari nilai target, bukan dari angka terakhir
      // tween: pemotongan angka bisa membuat frame terakhir berbeda tipis dari
      // saldo yang tercatat, dan yang dibaca pengguna harus saldo itu.
      onComplete: () => {
        el.textContent = formatNumber(tujuan, decimals);
        mulai.current = tujuan;
      },
    });

    return () => {
      tween.kill();
    };
  }, [gsap, value, decimals]);

  return (
    <span ref={simpul} className={className}>
      {formatNumber(value, decimals)}
    </span>
  );
}
