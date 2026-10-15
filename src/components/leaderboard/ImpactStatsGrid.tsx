import { Leaf, Recycle, Users, Wind } from "lucide-react";
import { formatKg, formatNumber } from "@/lib/format";
import { CO2E_FACTOR_PER_KG } from "@/lib/constants";
import type { ImpactStats } from "@/types/database";
import { StatTile } from "@/components/layout/StatTile";

/**
 * Statistik dampak lingkungan dari RPC get_impact_stats().
 * Bila belum ada setoran sama sekali, ditampilkan keterangan apa adanya (bukan angka karangan).
 */
export function ImpactStatsGrid({ stats }: { stats: ImpactStats }) {
  const empty = Number(stats.deposits) === 0;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={<Recycle size={18} />}
          label="Total didaur ulang"
          value={formatNumber(stats.total_kg, 2)}
          unit="kg"
          tone="green"
        />
        <StatTile
          icon={<Wind size={18} />}
          label="Estimasi reduksi CO2e"
          value={formatNumber(stats.co2e_kg, 1)}
          unit="kg"
          tone="neutral"
        />
        <StatTile
          icon={<Leaf size={18} />}
          label="Saldo poin terkumpul"
          value={formatNumber(stats.total_points)}
          unit="P"
          tone="amber"
        />
        <StatTile
          icon={<Users size={18} />}
          label="Siswa terdaftar"
          value={formatNumber(stats.students)}
          unit="akun"
          tone="neutral"
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        {empty
          ? "Belum ada setoran sampah tercatat. Statistik akan terisi otomatis setelah petugas memproses setoran pertama."
          : `Estimasi CO2e memakai faktor ${CO2E_FACTOR_PER_KG} kg CO2e per kg material campuran yang didaur ulang.`}
      </p>
    </div>
  );
}
