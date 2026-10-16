"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, Coins, Receipt, RotateCcw, Store } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { BookingTicket } from "@/components/student/BookingTicket";
import { buttonStyles } from "@/components/ui/Button";
import { ORDER_STATUS_META, ROUTE, STATUS_TONE, ACTIVE_ORDER_STATUSES } from "@/lib/constants";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { TicketData } from "@/types/database";

export interface StudentOrder extends TicketData {
  id: string;
  created_at: string;
  /** Poin yang dikembalikan setelah pesanan ditolak atau tidak diambil. */
  points_refunded: number;
}

type Filter = "aktif" | "selesai" | "semua";

export function StudentOrderList({ orders }: { orders: StudentOrder[] }) {
  const [filter, setFilter] = useState<Filter>("aktif");
  const [selected, setSelected] = useState<StudentOrder | null>(null);

  const filtered = useMemo(() => {
    if (filter === "aktif") return orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status));
    if (filter === "selesai")
      return orders.filter((o) => !ACTIVE_ORDER_STATUSES.includes(o.status));
    return orders;
  }, [orders, filter]);

  const tabs: Array<{ key: Filter; label: string }> = [
    { key: "aktif", label: "Aktif" },
    { key: "selesai", label: "Riwayat" },
    { key: "semua", label: "Semua" },
  ];

  return (
    <div>
      <div role="tablist" aria-label="Filter pesanan" className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={filter === tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "h-10 rounded-full px-4 text-[15px] font-semibold transition-colors",
              filter === tab.key
                ? "border-eco-600 bg-eco-600 text-white"
                : "bg-white text-ink-soft hover:bg-mint",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Receipt size={22} />}
            title={filter === "aktif" ? "Tidak ada pesanan aktif" : "Belum ada pesanan"}
            description="Pesanan yang kamu buat di kantin akan muncul di sini beserta tiket booking-nya."
            action={
              <Link href={ROUTE.studentCanteen} className={buttonStyles("primary", "sm")}>
                Pesan di kantin
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {filtered.map((order) => {
              const meta = ORDER_STATUS_META[order.status];
              const net = order.total_price - order.discount_applied;
              return (
                <li key={order.id} className="rounded-card bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-eco-700">
                        <Store size={16} />
                        <span className="truncate text-[15px] font-semibold">
                          {order.stand_name ?? "Kantin"}
                        </span>
                      </div>
                      <p className="tnum mt-1 text-[17px] font-bold text-ink">
                        {order.booking_code}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[order.status]}>{meta.label}</Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={14} /> {order.pickup_time_slot}
                    </span>
                    <span>{formatDateTime(order.created_at)}</span>
                    {order.payment_mode === "points" ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-eco-700">
                        <Coins size={14} className="shrink-0" />
                        Sudah dibayar dengan poin ·{" "}
                        <span className="tnum">{order.points_paid} P</span>
                      </span>
                    ) : (
                      <span className="tnum font-semibold text-ink">{formatRupiah(net)}</span>
                    )}
                  </div>

                  {order.points_refunded > 0 ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-control bg-eco-50 px-3 py-1.5 text-small font-semibold text-eco-700">
                      <RotateCcw size={14} className="shrink-0" />
                      <span className="tnum">+{order.points_refunded} P</span> dikembalikan
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setSelected(order)}
                    className={buttonStyles("secondary", "sm", "mt-3 w-full")}
                  >
                    Lihat tiket booking
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Tiket booking"
        description={selected ? ORDER_STATUS_META[selected.status].hint : undefined}
      >
        {selected ? <BookingTicket ticket={selected} /> : null}
      </Sheet>
    </div>
  );
}
