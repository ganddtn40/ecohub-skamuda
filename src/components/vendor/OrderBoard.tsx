"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Ban,
  CheckCheck,
  ChefHat,
  Clock3,
  Coins,
  PackageCheck,
  StickyNote,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { ORDER_STATUS_META, STATUS_TONE } from "@/lib/constants";
import { mapOrderError } from "@/lib/order-errors";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { OrderPaymentMode, OrderStatus } from "@/types/database";

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
  payment_mode: OrderPaymentMode;
  points_paid: number;
  student_name: string | null;
  student_class: string | null;
  stand_name: string | null;
  items: VendorOrderItem[];
}

type VendorAction = "accept" | "reject" | "ready" | "complete" | "unclaimed";

/**
 * Aksi yang tersedia untuk tiap status. Penjual tidak lagi mengubah status
 * langsung ke tabel; setiap tombol di sini memanggil `vendor_resolve_order`,
 * dan RPC itulah yang memutuskan transisinya sah atau tidak.
 *
 * Aksi yang merugikan siswa tidak langsung jalan: `ConfirmDialog` muncul lebih
 * dulu, dan kalimatnya menyebut akibatnya — berapa poin yang hangus dan berapa
 * lama blokirnya.
 *
 * Status `pending` sengaja tidak punya aksi. Itu nilai enum lama; sejak migrasi
 * 003 semua pesanan baru lahir sebagai `awaiting_approval`, dan tidak ada satu
 * pun baris `pending` di database.
 */
const ACTIONS: Partial<
  Record<
    OrderStatus,
    {
      primary: { action: VendorAction; label: string; icon: typeof ChefHat };
      secondary?: {
        action: VendorAction;
        label: string;
        icon: typeof ChefHat;
        title: string;
        description: string;
        confirmLabel: string;
      };
    }
  >
> = {
  awaiting_approval: {
    primary: { action: "accept", label: "Terima Pesanan", icon: CheckCheck },
    secondary: {
      action: "reject",
      label: "Tolak",
      icon: Ban,
      title: "Tolak pesanan ini?",
      description:
        "Pesanan dibatalkan dan poin yang sudah dibayarkan siswa dikembalikan penuh. Siswa bisa memesan lagi setelah ini.",
      confirmLabel: "Tolak pesanan",
    },
  },
  processing: {
    primary: { action: "ready", label: "Siap Diambil", icon: PackageCheck },
  },
  ready_for_pickup: {
    primary: { action: "complete", label: "Selesai Diambil", icon: CheckCheck },
    secondary: {
      action: "unclaimed",
      label: "Tidak Diambil",
      icon: Ban,
      title: "Tandai tidak diambil?",
      description:
        "Tandai pesanan ini tidak diambil siswa. Pelanggaran pertama poinnya masih dikembalikan; pelanggaran kedua poinnya hangus dan pre-order siswa diblokir 3 hari.",
      confirmLabel: "Tandai tidak diambil",
    },
  },
};

function OrderCard({ order, onChanged }: { order: VendorOrder; onChanged: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const entry = ACTIONS[order.status];
  const meta = ORDER_STATUS_META[order.status];
  const net = order.total_price - order.discount_applied;

  async function resolve(action: VendorAction) {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("vendor_resolve_order", {
      p_order_id: order.id,
      p_action: action,
    });
    setPending(false);
    setConfirming(false);
    if (rpcError) {
      setError(mapOrderError(rpcError));
      return;
    }
    onChanged();
  }

  return (
    <article className="rounded-card bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <User size={15} className="text-eco-700" />
            <span className="truncate">{order.student_name ?? "Siswa"}</span>
          </div>
          <p className="text-small text-muted">{order.student_class ?? "Tanpa kelas"}</p>
        </div>
        <Badge tone={STATUS_TONE[order.status]}>{meta.label}</Badge>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="tnum text-[17px] font-bold text-ink">{order.booking_code}</span>
        <span className="inline-flex items-center gap-1 text-small text-muted">
          <Clock3 size={14} /> {order.pickup_time_slot}
        </span>
      </div>

      <ul className="mt-3 space-y-2 pt-3">
        {order.items.map((item) => (
          <li key={item.id} className="text-[15px]">
            <div className="flex items-start justify-between gap-3">
              <span className="text-ink-soft">
                <span className="tnum font-semibold text-ink">{item.quantity}x</span> {item.name}
              </span>
              <span className="tnum shrink-0 text-muted">
                {formatRupiah(item.unit_price * item.quantity)}
              </span>
            </div>
            {item.item_notes ? (
              <p className="mt-0.5 pl-6 text-small font-medium text-gold-600">
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
            <p className="text-small font-semibold text-gold-600">Catatan siswa</p>
            <p className="mt-0.5 text-[15px] text-ink-soft">{order.notes}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 pt-3">
        <span className="text-small text-muted">{formatDateTime(order.created_at)}</span>
        {order.payment_mode === "points" ? (
          <span className="inline-flex items-center gap-1.5 text-small font-semibold text-eco-700">
            <Coins size={14} className="shrink-0" />
            Sudah dibayar dengan poin ·{" "}
            <span className="tnum">{order.points_paid} P</span>
          </span>
        ) : (
          <span className="inline-flex items-baseline gap-1.5">
            <span className="tnum text-[15px] font-bold text-ink">{formatRupiah(net)}</span>
            <span className="text-small font-medium text-muted">tunai di kantin</span>
          </span>
        )}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-control bg-danger-50 px-3 py-2.5 text-[15px] text-danger-600"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      {entry ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            className="flex-1"
            disabled={pending}
            onClick={() => void resolve(entry.primary.action)}
          >
            {pending ? <Spinner className="text-white" /> : <entry.primary.icon size={18} />}
            {entry.primary.label}
          </Button>

          {entry.secondary ? (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirming(true)}
            >
              <entry.secondary.icon size={18} />
              {entry.secondary.label}
            </Button>
          ) : null}
        </div>
      ) : null}

      {entry?.secondary ? (
        <ConfirmDialog
          open={confirming}
          title={entry.secondary.title}
          description={entry.secondary.description}
          confirmLabel={entry.secondary.confirmLabel}
          pending={pending}
          onConfirm={() => void resolve(entry.secondary!.action)}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </article>
  );
}

/** Filter status papan. `menunggu` sengaja sempit: hanya pesanan yang belum diterima. */
export type OrderFilter = "aktif" | "menunggu" | "selesai" | "semua";

const STATUS_TABS: Array<{ value: OrderFilter; label: string }> = [
  { value: "aktif", label: "Aktif" },
  { value: "menunggu", label: "Menunggu" },
  { value: "selesai", label: "Selesai" },
  { value: "semua", label: "Semua" },
];

export function OrderBoard({
  orders,
  status,
  onStatusChange,
}: {
  orders: VendorOrder[];
  status: OrderFilter;
  onStatusChange: (status: OrderFilter) => void;
}) {
  const router = useRouter();
  const [slot, setSlot] = useState<string>("semua");

  const slots = Array.from(new Set(orders.map((order) => order.pickup_time_slot)));
  const activeStatuses: OrderStatus[] = ["awaiting_approval", "processing", "ready_for_pickup"];

  const filtered = orders.filter((order) => {
    if (slot !== "semua" && order.pickup_time_slot !== slot) return false;
    if (status === "aktif") return activeStatuses.includes(order.status);
    if (status === "menunggu") return order.status === "awaiting_approval";
    if (status === "selesai") return !activeStatuses.includes(order.status);
    return true;
  });

  const waiting = orders.filter((order) => order.status === "awaiting_approval").length;

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
                  "h-10 shrink-0 rounded-full px-4 text-[15px] font-semibold transition-colors",
                  active
                    ? "bg-eco-600 text-white"
                    : "bg-white text-ink-soft hover:bg-mint",
                )}
              >
                {option === "semua" ? "Semua slot" : option}
              </button>
            );
          })}
        </div>

        <div
          role="tablist"
          aria-label="Filter status"
          className="flex gap-2 overflow-x-auto"
        >
          {STATUS_TABS.map((tab) => {
            const active = status === tab.value;
            // Jumlah antrean menempel pada tab-nya sendiri. Sebelumnya ada chip
            // terpisah di atas papan, tapi dua kontrol untuk saringan yang sama
            // hanya membuat penjual ragu harus menekan yang mana.
            const count = tab.value === "menunggu" ? waiting : 0;
            return (
              <button
                key={tab.value}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => onStatusChange(tab.value)}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold transition-colors",
                  active ? "bg-eco-50 text-eco-700" : "bg-white text-ink-soft hover:bg-mint",
                )}
              >
                {tab.label}
                {count > 0 ? (
                  <span
                    className={cn(
                      "tnum rounded-full px-1.5 text-small",
                      active ? "bg-eco-600 text-white" : "bg-gold-50 text-gold-600",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
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
