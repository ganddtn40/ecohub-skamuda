import { QrCode, Recycle, ShoppingBag, Trophy, UserRound } from "lucide-react";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { ImpactStats } from "@/types/database";

const TILES = [
  { icon: QrCode, label: "Setor sampah" },
  { icon: ShoppingBag, label: "Pre-order" },
  { icon: Trophy, label: "Papan skor" },
  { icon: UserRound, label: "Profil" },
];

/**
 * Layar aplikasi yang sesungguhnya, dirender di dalam bingkai ponsel.
 *
 * Bukan gambar karangan: seluruh angka di sini datang dari basis data yang
 * hidup (get_impact_stats) dan menu kantin yang benar-benar dijual.
 *
 * Ditandai `data-ui` karena ini potongan antarmuka produk yang dipotret, bukan
 * halaman: teksnya punya ukuran sendiri dan tidak dihitung sebagai tipografi
 * halaman. Ditandai `role="img"` supaya terbaca sebagai gambar, bukan kendali
 * yang bisa ditekan.
 */
export function HeroDevice({
  stats,
  dish,
}: {
  stats: ImpactStats;
  dish: { name: string; price_idr: number } | null;
}) {
  return (
    <div
      data-ui
      role="img"
      aria-label={`Tampilan aplikasi SKAMUDA EcoHub: ${formatNumber(stats.total_points)} poin terkumpul, ${formatNumber(
        stats.total_kg,
        2,
      )} kilogram sampah didaur ulang, ${formatNumber(stats.students)} siswa terdaftar, dan ${
        dish ? `menu kantin ${dish.name} seharga ${formatRupiah(dish.price_idr)}` : "daftar menu kantin"
      }.`}
      className="w-[300px] rounded-[42px] border border-white/15 bg-eco-800 p-2"
    >
      <div className="overflow-hidden rounded-[34px] bg-white">
        <div className="flex items-center gap-2.5 px-5 pb-1 pt-5">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-eco-600 text-[11px] font-bold text-white">
            SE
          </span>
          <span className="text-[13px] font-bold text-ink">SKAMUDA EcoHub</span>
        </div>

        <div className="px-5 pt-4">
          <p className="text-[13px] font-semibold text-eco-800">Halo, warga SKAMUDA</p>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="tnum text-[42px] font-extrabold leading-none text-ink">
              {formatNumber(stats.total_points)}
            </span>
            <span className="text-[13px] font-bold text-gold-600">poin</span>
          </p>
          <p className="mt-2 text-[13px] leading-snug text-muted">
            Terkumpul dari setoran yang sudah diverifikasi petugas.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 px-4">
          <div className="rounded-card bg-mint px-3.5 py-3">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
              <Recycle size={14} className="text-eco-600" aria-hidden />
              Didaur ulang
            </span>
            <p className="tnum mt-1.5 text-[17px] font-bold text-ink">
              {formatNumber(stats.total_kg, 2)} kg
            </p>
          </div>
          <div className="rounded-card bg-mint px-3.5 py-3">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
              <UserRound size={14} className="text-eco-600" aria-hidden />
              Siswa terdaftar
            </span>
            <p className="tnum mt-1.5 text-[17px] font-bold text-ink">{formatNumber(stats.students)}</p>
          </div>
        </div>

        {dish ? (
          <div className="mx-4 mt-3 rounded-card bg-eco-50 px-3.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-ink">{dish.name}</p>
                <p className="mt-1 text-[13px] text-eco-800">Menu kantin hari ini</p>
              </div>
              <span className="tnum shrink-0 text-[15px] font-bold text-ink">
                {formatRupiah(dish.price_idr)}
              </span>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-4 gap-1 px-3 pb-5 pt-1">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <div key={tile.label} className="flex flex-col items-center gap-2 text-center">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-mint text-eco-700">
                  <Icon size={16} aria-hidden />
                </span>
                <span className="text-[13px] font-semibold leading-tight text-muted">
                  {tile.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
