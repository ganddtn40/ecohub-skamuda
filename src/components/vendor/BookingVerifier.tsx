"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Camera, CameraOff, CheckCheck, ChefHat, PackageCheck, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { BookingTicket } from "@/components/student/BookingTicket";
import { QrCamera } from "@/components/qr/QrCamera";
import { ORDER_STATUS_META } from "@/lib/constants";
import type { OrderStatus, TicketData } from "@/types/database";

interface VerifiedOrder extends TicketData {
  id: string;
  created_at: string;
}

const NEXT_ACTION: Partial<Record<OrderStatus, { next: OrderStatus; label: string; icon: typeof ChefHat }>> = {
  pending: { next: "processing", label: "Mulai siapkan", icon: ChefHat },
  processing: { next: "ready_for_pickup", label: "Siap diambil", icon: PackageCheck },
  ready_for_pickup: { next: "completed", label: "Tandai sudah diambil", icon: CheckCheck },
};

const CODE_RE = /^SKM-I[12]-[A-Z0-9]{4}$/;

interface RawOrder {
  id: string;
  booking_code: string;
  status: OrderStatus;
  pickup_time_slot: string;
  total_price: number;
  discount_applied: number;
  notes: string | null;
  created_at: string;
  canteen_stands: { stand_name: string } | null;
  order_items: Array<{
    quantity: number;
    unit_price: number;
    item_notes: string | null;
    menu_items: { name: string } | null;
  }> | null;
}

export function BookingVerifier() {
  const router = useRouter();

  const [cameraActive, setCameraActive] = useState(true);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<VerifiedOrder | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function verify(raw: string) {
    const clean = raw.trim().toUpperCase();
    if (!CODE_RE.test(clean)) {
      setError("Format kode booking tidak valid. Contoh: SKM-I1-AB2C.");
      return;
    }

    setPending(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    const { data, error: queryError } = await supabase
      .from("orders")
      .select(
        "id, booking_code, status, pickup_time_slot, total_price, discount_applied, notes, created_at, canteen_stands(stand_name), order_items(quantity, unit_price, item_notes, menu_items(name))",
      )
      .eq("booking_code", clean)
      .maybeSingle();

    setPending(false);

    if (queryError) {
      setError(queryError.message);
      return;
    }
    if (!data) {
      setOrder(null);
      setError("Kode booking tidak ditemukan pada stand kamu.");
      return;
    }

    const orderRow = data as unknown as RawOrder;
    setOrder({
      id: orderRow.id,
      booking_code: orderRow.booking_code,
      status: orderRow.status,
      pickup_time_slot: orderRow.pickup_time_slot,
      total_price: orderRow.total_price,
      discount_applied: orderRow.discount_applied,
      notes: orderRow.notes,
      stand_name: orderRow.canteen_stands?.stand_name ?? null,
      created_at: orderRow.created_at,
      items: (orderRow.order_items ?? []).map((item) => ({
        name: item.menu_items?.name ?? "Menu",
        quantity: item.quantity,
        unit_price: item.unit_price,
        item_notes: item.item_notes,
      })),
    });
    setCameraActive(false);
  }

  async function advance() {
    if (!order) return;
    const action = NEXT_ACTION[order.status];
    if (!action) return;

    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: action.next })
      .eq("id", order.id);
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setOrder({ ...order, status: action.next });
    setNotice(`Status diperbarui ke "${ORDER_STATUS_META[action.next].label}".`);
    router.refresh();
  }

  function reset() {
    setOrder(null);
    setCode("");
    setError(null);
    setNotice(null);
    setCameraActive(true);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-card border border-line bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-eco-700">
            <Camera size={18} />
            <h2 className="text-sm font-semibold">Pindai tiket pesanan</h2>
          </div>
          <button
            type="button"
            onClick={() => setCameraActive((value) => !value)}
            className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line px-2.5 text-xs font-semibold text-ink-soft hover:bg-mint"
          >
            {cameraActive ? <CameraOff size={14} /> : <Camera size={14} />}
            {cameraActive ? "Matikan" : "Nyalakan"}
          </button>
        </div>

        <div className="mt-4">
          <QrCamera
            elementId="vendor-booking-reader"
            active={cameraActive && !order}
            onDecode={(text) => void verify(text)}
          />
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <Field label="Input kode booking manual" htmlFor="vendor-code">
            <Input
              id="vendor-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="SKM-I1-AB2C"
              autoComplete="off"
            />
          </Field>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full"
            disabled={pending}
            onClick={() => void verify(code)}
          >
            {pending ? <Spinner /> : <Search size={18} />}
            Verifikasi kode
          </Button>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-control border border-danger-500/30 bg-danger-50 px-3 py-2.5 text-sm text-danger-600"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        {notice ? (
          <p className="flex items-center gap-2 rounded-control border border-eco-200 bg-eco-50 px-3 py-2.5 text-sm font-semibold text-eco-700">
            <CheckCheck size={17} />
            {notice}
          </p>
        ) : null}

        {order ? (
          <>
            <BookingTicket ticket={order} />
            <div className="flex gap-2">
              {NEXT_ACTION[order.status] ? (
                <Button type="button" className="flex-1" disabled={pending} onClick={advance}>
                  {pending ? <Spinner className="text-white" /> : null}
                  {NEXT_ACTION[order.status]!.label}
                </Button>
              ) : (
                <p className="flex-1 rounded-control border border-line bg-mint px-3 py-3 text-center text-sm font-semibold text-muted">
                  Pesanan sudah selesai.
                </p>
              )}
              <Button type="button" variant="secondary" onClick={reset}>
                Verifikasi lain
              </Button>
            </div>
          </>
        ) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line bg-white px-4 text-center">
            <PackageCheck size={28} className="text-muted" />
            <p className="text-sm font-semibold text-ink">Belum ada tiket diverifikasi</p>
            <p className="max-w-xs text-sm text-muted">
              Pindai QR tiket atau masukkan kode booking untuk memverifikasi pesanan siswa.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
