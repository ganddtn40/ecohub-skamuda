"use client";

import { useMemo, useState } from "react";
import { Medal } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatKg, formatNumber } from "@/lib/format";
import { JURUSAN } from "@/lib/constants";
import type { ClassLeaderboardRow } from "@/types/database";
import { EmptyState } from "@/components/ui/EmptyState";

type Filter = "SEMUA" | (typeof JURUSAN)[number];

export function ClassLeaderboard({ rows }: { rows: ClassLeaderboardRow[] }) {
  const [filter, setFilter] = useState<Filter>("SEMUA");

  const filtered = useMemo(
    () => (filter === "SEMUA" ? rows : rows.filter((row) => row.jurusan === filter)),
    [rows, filter],
  );

  const filters: Filter[] = ["SEMUA", ...JURUSAN];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filter jurusan"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
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
                "h-10 shrink-0 rounded-control border px-3 text-sm font-semibold transition-colors",
                active
                  ? "border-eco-600 bg-eco-600 text-white"
                  : "border-line bg-white text-ink-soft hover:bg-mint",
              )}
            >
              {item === "SEMUA" ? "Semua Jurusan" : item}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Medal size={22} />}
            title="Belum ada data kelas"
            description="Klasemen muncul setelah admin menambahkan daftar kelas dan siswa mulai menyetor sampah."
          />
        ) : (
          <ol className="overflow-hidden rounded-card border border-line bg-white">
            {filtered.map((row, index) => {
              const isTop = index < 3 && row.total_kg > 0;
              return (
                <li
                  key={row.class_name}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    index !== 0 && "border-t border-line",
                  )}
                >
                  <span
                    className={cn(
                      "tnum grid h-8 w-8 shrink-0 place-items-center rounded-control text-sm font-bold",
                      isTop ? "bg-eco-600 text-white" : "bg-mint text-muted",
                    )}
                  >
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{row.class_name}</p>
                    <p className="text-xs text-muted">
                      {row.jurusan} &middot; {formatNumber(row.students)} siswa
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="tnum text-sm font-bold text-ink">{formatKg(row.total_kg)}</p>
                    <p className="tnum text-xs text-muted">
                      {formatNumber(row.total_points)} poin
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
