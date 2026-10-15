"use client";

import { useId, useMemo, useState } from "react";
import { Minus, Plus, Ticket, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { MenuItem, VoucherTier, WasteItemType } from "@/types/database";

/**
 * Alat hitung setoran: satu-satunya hal interaktif di halaman publik.
 *
 * Semua angkanya nyata dan datang dari basis data: tarif poin per jenis sampah,
 * tingkatan voucher, dan harga menu kantin yang benar-benar dijual. Sebelum
 * disentuh, komponen ini sudah menampilkan jawaban yang sah, jadi tetap berarti
 * bila skripnya tidak pernah jalan.
 */
export function PointSimulator({
  wasteTypes,
  voucherTiers,
  menuItems,
}: {
  wasteTypes: WasteItemType[];
  voucherTiers: VoucherTier[];
  menuItems: Pick<MenuItem, "name" | "points_price">[];
}) {
  const sliderId = useId();
  const [code, setCode] = useState(wasteTypes[0]?.code ?? "");
  const [weight, setWeight] = useState(1);

  const type = wasteTypes.find((item) => item.code === code) ?? wasteTypes[0];

  const points = useMemo(
    () => (type ? Math.floor(type.points_per_kg * weight) : 0),
    [type, weight],
  );

  const tier = useMemo(
    () =>
      voucherTiers
        .filter((item) => item.points_cost <= points)
        .sort((a, b) => b.points_cost - a.points_cost)[0] ?? null,
    [points, voucherTiers],
  );

  const covered = useMemo(
    () =>
      menuItems.filter((item) => item.points_price !== null && item.points_price <= points).length,
    [menuItems, points],
  );

  if (!type) return null;

  const step = (delta: number) =>
    setWeight((current) => Math.min(50, Math.max(0.5, Math.round((current + delta) * 2) / 2)));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
      {/* Pilihan jenis sampah */}
      <div>
        <fieldset>
          <legend className="text-[15px] font-bold text-ink">Pilih jenis sampah</legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {wasteTypes.map((item) => {
              const active = item.code === code;
              return (
                <button
                  key={item.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCode(item.code)}
                  className={cn(
                    "inline-flex h-12 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition-colors",
                    active
                      ? "border-eco-700 bg-eco-700 text-white"
                      : "border-line bg-white text-ink-soft hover:border-eco-300 hover:text-eco-800",
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      "tnum text-small font-bold",
                      active ? "text-white/75" : "text-muted",
                    )}
                  >
                    {formatNumber(item.points_per_kg)}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Berat */}
        <div className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <label htmlFor={sliderId} className="text-[15px] font-bold text-ink">
              Berat setoran
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => step(-0.5)}
                aria-label="Kurangi setengah kilogram"
                className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-mint"
              >
                <Minus size={18} aria-hidden />
              </button>
              <output
                htmlFor={sliderId}
                className="tnum w-[92px] text-center text-[26px] font-extrabold leading-none text-ink"
              >
                {formatNumber(weight, 1)} kg
              </output>
              <button
                type="button"
                onClick={() => step(0.5)}
                aria-label="Tambah setengah kilogram"
                className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-mint"
              >
                <Plus size={18} aria-hidden />
              </button>
            </div>
          </div>

          <input
            id={sliderId}
            type="range"
            min={0.5}
            max={20}
            step={0.5}
            value={weight}
            onChange={(event) => setWeight(Number(event.target.value))}
            className="mt-4 h-11 w-full cursor-pointer accent-eco-600"
          />
          <p className="text-small text-muted">
            Geser, atau pakai tombol. Rentang 0,5 sampai 20 kg per setoran.
          </p>
        </div>
      </div>

      {/* Hasil */}
      <div className="rounded-card bg-eco-900 p-6 text-white sm:p-8">
        <p className="flex items-baseline gap-2" aria-live="polite">
          <span className="tnum text-display font-extrabold">
            {formatNumber(points)}
          </span>
          <span className="text-body font-bold text-gold-100">poin</span>
        </p>
        <p className="mt-4 max-w-sm text-[17px] leading-relaxed text-white/80">
          {formatNumber(weight, 1)} kg {type.label.toLowerCase()} dinilai{" "}
          {formatNumber(type.points_per_kg)} poin per kg oleh sistem.
        </p>

        <dl className="mt-8 space-y-5">
          <div className="flex items-start gap-3">
            <Ticket size={18} className="mt-1 shrink-0 text-gold-100" aria-hidden />
            <div>
              <dt className="text-[15px] font-semibold text-white/70">Voucher kantin terbuka</dt>
              <dd className="mt-0.5 text-[17px] font-semibold">
                {tier
                  ? `${tier.label}: potongan ${formatRupiah(tier.discount_idr)}`
                  : "Belum cukup untuk voucher terkecil"}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <UtensilsCrossed size={18} className="mt-1 shrink-0 text-gold-100" aria-hidden />
            <div>
              <dt className="text-[15px] font-semibold text-white/70">Menu kantin yang setara</dt>
              <dd className="mt-0.5 text-[17px] font-semibold">
                {covered > 0
                  ? `${formatNumber(covered)} dari ${formatNumber(menuItems.length)} menu bisa ditukar penuh`
                  : "Belum cukup untuk satu menu"}
              </dd>
            </div>
          </div>
        </dl>
      </div>
    </div>
  );
}
