"use client";

import { useRef } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadCsv, toCsv } from "@/lib/csv";
import { useScrollStagger } from "@/lib/use-scroll-stagger";
import { formatDateTime, formatNumber } from "@/lib/format";

export interface WasteHistoryRow {
  id: string;
  created_at: string;
  weight_kg: number;
  quantity: number;
  points_earned: number;
  item_type: string;
  profiles: { full_name: string; class_name: string | null } | null;
  waste_item_types: { label: string } | null;
}

export function WasteHistoryTable({ rows }: { rows: WasteHistoryRow[] }) {
  const wadah = useRef<HTMLDivElement | null>(null);

  // `y: 0`: baris tabel hanya beranimasi opacity. `transform` pada
  // `display: table-row` tidak didukung merata, dan baris yang tidak bergeser
  // di mesin mana pun tetap baris yang sama di semua mesin.
  useScrollStagger(wadah, { y: 0 });

  function exportCsv() {
    const headers = [
      "Tanggal",
      "Nama Siswa",
      "Kelas",
      "Jenis Sampah",
      "Berat (kg)",
      "Jumlah",
      "Poin",
    ];
    const data = rows.map((row) => [
      formatDateTime(row.created_at),
      row.profiles?.full_name ?? "-",
      row.profiles?.class_name ?? "-",
      row.waste_item_types?.label ?? row.item_type,
      Number(row.weight_kg).toFixed(2),
      row.quantity,
      row.points_earned,
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`riwayat-setoran-skamuda-${stamp}.csv`, toCsv(headers, data));
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] text-ink-soft">
          {formatNumber(rows.length)} transaksi terakhir
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
          <Download size={16} />
          Ekspor CSV
        </Button>
      </div>

      <div ref={wadah} className="mt-4 overflow-x-auto rounded-card bg-white">
        <table className="w-full min-w-[720px] border-collapse text-[15px]">
          <thead>
            <tr className="bg-mint text-left text-small text-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Tanggal</th>
              <th scope="col" className="px-4 py-3 font-semibold">Nama Siswa</th>
              <th scope="col" className="px-4 py-3 font-semibold">Kelas</th>
              <th scope="col" className="px-4 py-3 font-semibold">Jenis Sampah</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Berat</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Jumlah</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Poin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} data-stagger className="border-b border-line last:border-b-0">
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {formatDateTime(row.created_at)}
                </td>
                <td className="px-4 py-3 font-semibold text-ink">
                  {row.profiles?.full_name ?? "-"}
                </td>
                <td className="px-4 py-3 text-ink-soft">{row.profiles?.class_name ?? "-"}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {row.waste_item_types?.label ?? row.item_type}
                </td>
                <td className="tnum px-4 py-3 text-right text-ink">
                  {formatNumber(row.weight_kg, 2)} kg
                </td>
                <td className="tnum px-4 py-3 text-right text-muted">{row.quantity}</td>
                <td className="tnum px-4 py-3 text-right font-bold text-eco-700">
                  +{formatNumber(row.points_earned)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
