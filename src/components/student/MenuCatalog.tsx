"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Minus,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Ticket,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { BookingTicket } from "@/components/student/BookingTicket";
import { PICKUP_SLOTS, type PickupSlot } from "@/lib/constants";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { CanteenStand, MenuItem, TicketData, VoucherTier } from "@/types/database";

interface CartLine {
  qty: number;
  notes: string;
}

type Carts = Record<string, Record<string, CartLine>>;

export function MenuCatalog({
  stands,
  menuItems,
  tiers,
  pointsBalance,
}: {
  stands: CanteenStand[];
  menuItems: MenuItem[];
  tiers: VoucherTier[];
  pointsBalance: number;
}) {
  const router = useRouter();

  const [standId, setStandId] = useState<string>(stands[0]?.id ?? "");
  const [carts, setCarts] = useState<Carts>({});
  const [sheetOpen, setSheetOpen] = useState(false);

  const [slot, setSlot] = useState<PickupSlot>(PICKUP_SLOTS[0]);
  const [orderNotes, setOrderNotes] = useState("");
  const [voucherPoints, setVoucherPoints] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketData | null>(null);

  const cart = carts[standId] ?? {};

  const menuByStand = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of menuItems) {
      const list = map.get(item.stand_id) ?? [];
      list.push(item);
      map.set(item.stand_id, list);
    }
    return map;
  }, [menuItems]);

  const visibleItems = useMemo(
    () =>
      (menuByStand.get(standId) ?? []).filter((item) => item.is_available),
    [menuByStand, standId],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of visibleItems) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, [visibleItems]);

  const itemById = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const item of menuItems) map.set(item.id, item);
    return map;
  }, [menuItems]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, line]) => ({ item: itemById.get(id), ...line }))
        .filter((line): line is { item: MenuItem; qty: number; notes: string } => Boolean(line.item))
        .filter((line) => line.qty > 0),
    [cart, itemById],
  );

  const itemCount = cartLines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = cartLines.reduce((sum, line) => sum + line.item.price_idr * line.qty, 0);

  const activeTier = tiers.find((tier) => tier.points_cost === voucherPoints);
  const discount = activeTier ? Math.min(activeTier.discount_idr, subtotal) : 0;
  const net = Math.max(subtotal - discount, 0);

  const currentStand = stands.find((stand) => stand.id === standId) ?? null;

  function updateLine(itemId: string, updater: (line: CartLine) => CartLine) {
    setCarts((prev) => {
      const standCart = { ...(prev[standId] ?? {}) };
      const next = updater(standCart[itemId] ?? { qty: 0, notes: "" });
      if (next.qty <= 0) delete standCart[itemId];
      else standCart[itemId] = next;
      return { ...prev, [standId]: standCart };
    });
  }

  function addItem(itemId: string) {
    updateLine(itemId, (line) => ({ ...line, qty: line.qty + 1 }));
  }

  function decreaseItem(itemId: string) {
    updateLine(itemId, (line) => ({ ...line, qty: line.qty - 1 }));
  }

  function setItemNotes(itemId: string, notes: string) {
    updateLine(itemId, (line) => ({ ...line, notes }));
  }

  function resetCheckout() {
    setCarts((prev) => ({ ...prev, [standId]: {} }));
    setOrderNotes("");
    setVoucherPoints(0);
  }

  async function submitOrder() {
    if (!currentStand || cartLines.length === 0) return;
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("place_order", {
      p_stand_id: standId,
      p_slot: slot,
      p_notes: orderNotes,
      p_items: cartLines.map((line) => ({
        menu_item_id: line.item.id,
        quantity: line.qty,
        item_notes: line.notes,
      })),
      p_voucher_points: voucherPoints,
    });

    if (rpcError) {
      setError(rpcError.message);
      setPending(false);
      return;
    }

    const result = data as { booking_code: string };

    setTicket({
      booking_code: result.booking_code,
      pickup_time_slot: slot,
      status: "pending",
      total_price: subtotal,
      discount_applied: discount,
      notes: orderNotes.trim() ? orderNotes.trim() : null,
      stand_name: currentStand.stand_name,
      items: cartLines.map((line) => ({
        name: line.item.name,
        quantity: line.qty,
        unit_price: line.item.price_idr,
        item_notes: line.notes.trim() ? line.notes.trim() : null,
      })),
    });

    resetCheckout();
    setPending(false);
    router.refresh();
  }

  if (stands.length === 0) {
    return (
      <EmptyState
        icon={<Store size={22} />}
        title="Belum ada stand kantin aktif"
        description="Stand kantin akan muncul di sini setelah penjual mengaktifkan stand mereka."
      />
    );
  }

  return (
    <div className={cn(itemCount > 0 && "pb-24")}>
      {/* Filter stand kantin */}
      <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <SlidersHorizontal size={16} className="text-eco-700" />
        Pilih stand kantin
      </div>
      <div
        role="tablist"
        aria-label="Filter stand kantin"
        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {stands.map((stand) => {
          const active = stand.id === standId;
          const count = Object.values(carts[stand.id] ?? {}).reduce((s, l) => s + l.qty, 0);
          return (
            <button
              key={stand.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setStandId(stand.id)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors",
                active
                  ? "border-eco-600 bg-eco-600 text-white"
                  : "bg-white text-ink-soft hover:bg-mint",
              )}
            >
              {stand.stand_name}
              {count > 0 ? (
                <span
                  className={cn(
                    "tnum grid h-5 min-w-5 place-items-center rounded-full px-1 text-small",
                    active ? "bg-white text-eco-700" : "bg-eco-600 text-white",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {currentStand?.description ? (
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{currentStand.description}</p>
      ) : null}

      {/* Katalog menu */}
      <div className="mt-5">
        {grouped.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={22} />}
            title="Belum ada menu tersedia"
            description="Penjual belum menambahkan menu pada stand ini."
          />
        ) : (
          <div className="space-y-6">
            {grouped.map(([category, items]) => (
              <section key={category} aria-label={category}>
                <h3 className="text-[17px] font-bold text-ink">
                  {category}
                </h3>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {items.map((item) => {
                    const line = cart[item.id];
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-card bg-white p-3.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-ink">{item.name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="tnum text-[15px] font-bold text-eco-700">
                              {formatRupiah(item.price_idr)}
                            </span>
                            {item.points_price ? (
                              <span className="tnum text-small text-muted">
                                {item.points_price} P
                              </span>
                            ) : null}
                          </div>
                          {line?.notes ? (
                            <p className="mt-1 truncate text-small text-gold-600">
                              Catatan: {line.notes}
                            </p>
                          ) : null}
                        </div>

                        {line && line.qty > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => decreaseItem(item.id)}
                              aria-label={`Kurangi ${item.name}`}
                              className="grid h-11 w-11 place-items-center rounded-control text-ink transition-colors hover:bg-mint"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="tnum w-6 text-center text-[15px] font-bold">{line.qty}</span>
                            <button
                              type="button"
                              onClick={() => addItem(item.id)}
                              aria-label={`Tambah ${item.name}`}
                              className="grid h-11 w-11 place-items-center rounded-control bg-eco-600 text-white transition-colors hover:bg-eco-700"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addItem(item.id)}
                            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-eco-50 px-4 text-[15px] font-semibold text-eco-700 transition-colors hover:bg-eco-100"
                          >
                            <Plus size={16} />
                            Tambah
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Bar keranjang */}
      {itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 px-4 md:bottom-6">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 rounded-card bg-white p-2.5 pl-4 shadow-float">
            <div className="min-w-0">
              <p className="text-small text-muted">
                {itemCount} item &middot; {currentStand?.stand_name}
              </p>
              <p className="tnum text-[15px] font-bold text-ink">{formatRupiah(subtotal)}</p>
            </div>
            <Button type="button" onClick={() => setSheetOpen(true)}>
              <ShoppingBag size={18} />
              Lihat keranjang
            </Button>
          </div>
        </div>
      ) : null}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={ticket ? "Pesanan dibuat" : "Konfirmasi pesanan"}
        description={
          ticket
            ? "Simpan kode booking ini untuk mengambil pesanan."
            : currentStand?.stand_name ?? undefined
        }
        footer={
          ticket ? (
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setTicket(null);
                setSheetOpen(false);
              }}
            >
              Pesan lagi
            </Button>
          ) : (
            <div className="space-y-3">
              {error ? (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-control bg-danger-50 px-3 py-2.5 text-[15px] text-danger-600"
                >
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  {error}
                </p>
              ) : null}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-small text-muted">Total dibayar di kantin</p>
                  <p className="tnum text-[17px] font-bold text-ink">{formatRupiah(net)}</p>
                </div>
                <Button
                  type="button"
                  onClick={submitOrder}
                  disabled={pending || cartLines.length === 0}
                >
                  {pending ? <Spinner className="text-white" /> : <Ticket size={18} />}
                  {pending ? "Memproses..." : "Buat pesanan"}
                </Button>
              </div>
            </div>
          )
        }
      >
        {ticket ? (
          <BookingTicket ticket={ticket} />
        ) : (
          <div className="space-y-5">
            {/* Item + catatan per item */}
            <ul className="space-y-3">
              {cartLines.map((line) => (
                <li key={line.item.id} className="rounded-control bg-mint p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-ink">{line.item.name}</p>
                      <p className="tnum text-small text-muted">
                        {formatRupiah(line.item.price_idr)} &times; {line.qty}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => decreaseItem(line.item.id)}
                        aria-label={`Kurangi ${line.item.name}`}
                        className="grid h-10 w-10 place-items-center rounded-control hover:bg-mint"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="tnum w-6 text-center text-[15px] font-bold">{line.qty}</span>
                      <button
                        type="button"
                        onClick={() => addItem(line.item.id)}
                        aria-label={`Tambah ${line.item.name}`}
                        className="grid h-10 w-10 place-items-center rounded-control hover:bg-mint"
                      >
                        <Plus size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateLine(line.item.id, () => ({ qty: 0, notes: "" }))}
                        aria-label={`Hapus ${line.item.name}`}
                        className="grid h-10 w-10 place-items-center rounded-control text-muted transition-colors hover:bg-danger-50 hover:text-danger-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={line.notes}
                    onChange={(event) => setItemNotes(line.item.id, event.target.value)}
                    placeholder="Catatan item, mis. pedas sedang"
                    className="mt-2.5 w-full rounded-control bg-mint px-3 py-2.5 text-[15px] placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-eco-500/30"
                  />
                </li>
              ))}
            </ul>

            {/* Slot pengambilan */}
            <div>
              <span className="mb-1.5 block text-[15px] font-semibold text-ink-soft">
                Slot pengambilan
              </span>
              <div className="grid grid-cols-2 gap-2">
                {PICKUP_SLOTS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={slot === option}
                    onClick={() => setSlot(option)}
                    className={cn(
                      "h-11 rounded-full text-[15px] font-semibold transition-colors",
                      slot === option
                        ? "border-eco-600 bg-eco-600 text-white"
                        : "bg-white text-ink-soft hover:bg-mint",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Catatan pesanan */}
            <Field
              label="Catatan untuk penjual"
              htmlFor="order-notes"
              hint="Opsional. Contoh: tanpa es, tidak pakai sambal."
            >
              <Textarea
                id="order-notes"
                value={orderNotes}
                onChange={(event) => setOrderNotes(event.target.value)}
                maxLength={200}
                placeholder="Tulis catatan khusus di sini"
              />
            </Field>

            {/* Tukar poin */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold text-ink-soft">Tukar poin</span>
                <Badge tone="amber">{pointsBalance} P tersedia</Badge>
              </div>
              <div className="mt-2 space-y-2">
                <button
                  type="button"
                  aria-pressed={voucherPoints === 0}
                  onClick={() => setVoucherPoints(0)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-control px-3.5 py-2.5 text-[15px] transition-colors",
                    voucherPoints === 0
                      ? "border-eco-600 bg-eco-50"
                      : "bg-white hover:bg-mint",
                  )}
                >
                  <span className="font-semibold text-ink">Tanpa tukar poin</span>
                  <span className="text-muted">Rp0</span>
                </button>

                {tiers.map((tier) => {
                  const enough = pointsBalance >= tier.points_cost;
                  const active = voucherPoints === tier.points_cost;
                  return (
                    <button
                      key={tier.points_cost}
                      type="button"
                      disabled={!enough}
                      aria-pressed={active}
                      onClick={() => setVoucherPoints(tier.points_cost)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-control px-3.5 py-2.5 text-[15px] transition-colors",
                        active
                          ? "border-eco-600 bg-eco-50"
                          : "bg-white hover:bg-mint",
                        !enough && "cursor-not-allowed opacity-50 hover:bg-white",
                      )}
                    >
                      <span className="font-semibold text-ink">
                        {tier.label} &middot; {tier.points_cost} P
                      </span>
                      <span className="text-muted">
                        -{formatRupiah(tier.discount_idr)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-small text-muted">
                Poin dipotong otomatis setelah pesanan dibuat.
              </p>
            </div>

            {/* Ringkasan */}
            <dl className="space-y-1.5 pt-3 text-[15px]">
              <div className="flex justify-between text-muted">
                <dt>Subtotal</dt>
                <dd className="tnum">{formatRupiah(subtotal)}</dd>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between text-eco-700">
                  <dt>Potongan poin</dt>
                  <dd className="tnum">-{formatRupiah(discount)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        )}
      </Sheet>
    </div>
  );
}
