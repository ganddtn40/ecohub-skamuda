"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Ban,
  CheckCheck,
  ChefHat,
  Clock3,
  PackageCheck,
  StickyNote,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { ORDER_STATUS_META, STATUS_TONE } from "@/lib/constants";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { OrderStatus } from "@/types/database";

export interface VendorOrderItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  item_notes: string | null;
}

export interface VendorOrder {
  id: string;
  booking_code: string;
  status: OrderStatus;
  pickup_time_slot: string;
  total_price: number;
  discount_applied: number;
  notes: string | null;
  created_at: string;
  student_name: string | null;
  student_class: string | null;
  stand_name: string | null;
  items: VendorOrderItem[];
}

const NEXT_ACTION: Partial<Record<OrderStatus, { next: OrderStatus; label: string; icon: typeof ChefHat }>> = {
  pending: { next: "processing", label: "Mulai siapkan", icon: ChefHat },
  processing: { next: "ready_for_pickup", label: "Siap diambil", icon: PackageCheck },
  ready_for_pickup: { next: "completed", label: "Selesai diambil", icon: CheckCheck },
};

function OrderCard({ order, onChanged }: { order: VendorOrder; onChanged: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const action = NEXT_ACTION[order.status];
  const meta = ORDER_STATUS_META[order.status];
  const net = order.total_price - order.discount_applied;

  async function updateStatus(next: OrderStatus) {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: next })
      .eq("id", order.id);
    setPending(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onChanged();
  }

  return (
    <article className="rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <User size={15} className="text-eco-700" />
            <span className="truncate">{order.student_name ?? "Siswa"}</span>
          </div>
          <p className="text-xs text-muted">{order.student_class ?? "Tanpa kelas"}</p>
        </div>
        <Badge tone={STATUS_TONE[order.status]}>{meta.label}</Badge>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="tnum text-base font-bold text-ink">{order.booking_code}</span>
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <Clock3 size={14} /> {order.pickup_time_slot}
        </span>
      </div>

      <ul className="mt-3 space-y-2 border-t border-line pt-3">
        {order.items.map((item) => (
          <li key={item.id} className="text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-ink-soft">
                <span className="tnum font-semibold text-ink">{item.quantity}x</span> {item.name}
              </span>
              <span className="tnum shrink-0 text-muted">
                {formatRupiah(item.unit_price * item.quantity)}
              </span>
            </div>
            {item.item_notes ? (
              <p className="mt-0.5 pl-6 text-xs font-medium text-gold-600">
                Catatan: {item.item_notes}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {order.notes ? (
        <div className="mt-3 flex items-start gap-2 rounded-control bg-gold-50 px-3 py-2.5">
          <StickyNote size={16} className="mt-0.5 shrink-0 text-gold-600" />
          <div>
            <p className="text-xs font-semibold text-gold-600">Catatan siswa</p>
            <p className="mt-0.5 text-sm text-ink-soft">{order.notes}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="text-xs text-muted">{formatDateTime(order.created_at)}</span>
        <span className="tnum text-sm font-bold text-ink">{formatRupiah(net)}</span>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-control border border-danger-500/30 bg-danger-50 px-3 py-2 text-sm text-danger-600"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        {action ? (
          <Button
            type="button"
            className="flex-1"
            disabled={pending}
            onClick={() => updateStatus(action.next)}
          >
            {pending ? <Spinner className="text-white" /> : <action.icon size={18} />}
            {action.label}
          </Button>
        ) : null}

        {order.status === "pending" || order.status === "processing" ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => updateStatus("cancelled")}
            aria-label="Batalkan pesanan"
          >
            <Ban size={18} />
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function OrderBoard({ orders }: { orders: VendorOrder[] }) {
  const router = useRouter();
  const [slot, setSlot] = useState<string>("semua");
  const [status, setStatus] = useState<"aktif" | "selesai" | "semua">("aktif");

  const slots = Array.from(new Set(orders.map((order) => order.pickup_time_slot)));
  const activeStatuses: OrderStatus[] = ["pending", "processing", "ready_for_pickup"];

  const filtered = orders.filter((order) => {
    if (slot !== "semua" && order.pickup_time_slot !== slot) return false;
    if (status === "aktif") return activeStatuses.includes(order.status);
    if (status === "selesai") return !activeStatuses.includes(order.status);
    return true;
  });

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Filter slot istirahat"
          className="flex gap-2 overflow-x-auto"
        >
          {["semua", ...slots].map((option) => {
            const active = slot === option;
            return (
              <button
                key={option}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setSlot(option)}
                className={cn(
                  "h-10 shrink-0 rounded-control border px-3 text-sm font-semibold transition-colors",
                  active
                    ? "border-eco-600 bg-eco-600 text-white"
                    : "border-line bg-white text-ink-soft hover:bg-mint",
                )}
              >
                {option === "semua" ? "Semua slot" : option}
              </button>
            );
          })}
        </div>

        <div role="tablist" aria-label="Filter status" className="flex gap-2">
          {(["aktif", "selesai", "semua"] as const).map((option) => {
            const active = status === option;
            return (
              <button
                key={option}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setStatus(option)}
                className={cn(
                  "h-10 rounded-control border px-3 text-sm font-semibold capitalize transition-colors",
                  active
                    ? "border-eco-600 bg-eco-50 text-eco-700"
                    : "border-line bg-white text-ink-soft hover:bg-mint",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<PackageCheck size={22} />}
            title="Belum ada pesanan"
            description="Pesanan baru dari siswa akan muncul otomatis di sini tanpa perlu me-refresh halaman."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} onChanged={() => router.refresh()} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
