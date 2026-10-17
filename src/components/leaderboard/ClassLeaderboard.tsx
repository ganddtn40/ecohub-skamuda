"use client";

import { useMemo, useRef, useState } from "react";
import { Medal } from "lucide-react";
import { cn } from "@/lib/cn";
import { useScrollStagger } from "@/lib/use-scroll-stagger";
import { formatKg, formatNumber } from "@/lib/format";
import { JURUSAN } from "@/lib/constants";
import type { ClassLeaderboardRow } from "@/types/database";
import { EmptyState } from "@/components/ui/EmptyState";

type Filter = "SEMUA" | (typeof JURUSAN)[number];

/**
 * Klasemen kelas. Barisnya dipisahkan jarak dan langkah nada, bukan garis,
 * dan urutannya memakai kilogram yang sudah diverifikasi - bukan jumlah setoran.
 */
export function ClassLeaderboard({ rows }: { rows: ClassLeaderboardRow[] }) {
  const [filter, setFilter] = useState<Filter>("SEMUA");
  const wadah = useRef<HTMLDivElement | null>(null);

  // Barisnya elemen biasa, jadi boleh bergeser sedikit saat masuk.
  useScrollStagger(wadah);

  const filtered = useMemo(
    () => (filter === "SEMUA" ? rows : rows.filter((row) => row.jurusan === filter)),
    [rows, filter],
  );

  const filters: Filter[] = ["SEMUA", ...JURUSAN];

  return (
    <div ref={wadah}>
      <div
        role="tablist"
        aria-label="Filter jurusan"
        className="flex flex-wrap gap-2"
      >
        {filters.map((item) => {
          const active = filter === item;
          return (
            <button
              key={item}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setFilter(item)}
              className={cn(
                "h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold transition-colors",
                active
                  ? "bg-eco-700 text-white"
                  : "bg-white text-ink-soft hover:bg-eco-50 hover:text-eco-800",
              )}
            >
              {item === "SEMUA" ? "Semua Jurusan" : item}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Medal size={22} />}
            title="Belum ada data kelas"
            description="Klasemen muncul setelah admin menambahkan daftar kelas dan siswa mulai menyetor sampah."
          />
        ) : (
          <ol className="space-y-2">
            {filtered.map((row, index) => {
              const isTop = index < 3 && Number(row.total_kg) > 0;
              return (
                <li
                  key={row.class_name}
                  data-stagger
                  className="flex items-center gap-4 rounded-card bg-white px-4 py-3.5"
                >
                  <span
                    className={cn(
                      "tnum grid h-10 w-10 shrink-0 place-items-center rounded-full text-[17px] font-bold",
                      isTop ? "bg-eco-600 text-white" : "bg-mint text-muted",
                    )}
                  >
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-bold text-ink">{row.class_name}</p>
                    <p className="text-small text-muted">
                      {row.jurusan} &middot; {formatNumber(row.students)} siswa &middot;{" "}
                      {formatNumber(row.total_points)} poin
                    </p>
                  </div>

                  <p className="tnum shrink-0 text-[17px] font-bold text-ink">
                    {formatKg(row.total_kg)}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
