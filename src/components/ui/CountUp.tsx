"use client";

import { useCountUp } from "@/lib/use-count-up";
import { formatNumber } from "@/lib/format";

/**
 * Angka yang berjalan ke nilai barunya, sudah diformat untuk dibaca.
 *
 * Sengaja hanya membungkus angkanya, bukan seluruh kartu statistiknya: yang
 * perlu hidup di klien hanyalah angka ini. Label, ikon, dan tata letaknya tetap
 * dirender server, jadi tidak ada satu kartu penuh yang ikut dikirim ke peramban
 * hanya demi satu animasi.
 */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const tampil = useCountUp(value);
  return <>{formatNumber(tampil, decimals)}</>;
}
