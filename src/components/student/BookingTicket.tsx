"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Clock3, Copy, StickyNote, Store } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ORDER_STATUS_META, STATUS_TONE } from "@/lib/constants";
import { formatRupiah } from "@/lib/format";
import type { TicketData } from "@/types/database";

/** Tiket booking: QR berisi kode booking + ringkasan pesanan & catatan siswa. */
export function BookingTicket({ ticket }: { ticket: TicketData }) {
  const [copied, setCopied] = useState(false);
  const meta = ORDER_STATUS_META[ticket.status];
  const net = ticket.total_price - ticket.discount_applied;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(ticket.booking_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard tidak tersedia; kode tetap terlihat di layar. */
    }
  }

  return (
    <div className="overflow-hidden rounded-card bg-white">
      <div className="bg-eco-50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-eco-700">
            <Store size={17} />
            <span className="text-[15px] font-semibold">{ticket.stand_name ?? "Kantin"}</span>
          </div>
          <Badge tone={STATUS_TONE[ticket.status]}>{meta.label}</Badge>
        </div>
      </div>

      <div className="flex flex-col items-center px-4 py-5">
        <div className="rounded-control bg-white p-3">
          <QRCodeSVG value={ticket.booking_code} size={168} level="M" marginSize={0} />
        </div>

        <p className="mt-3 text-small font-medium text-muted">Kode booking</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="tnum text-[17px] font-bold tracking-wide text-ink">
            {ticket.booking_code}
          </span>
          <button
            type="button"
            onClick={copyCode}
            aria-label="Salin kode booking"
            className="grid h-9 w-9 place-items-center rounded-control text-muted transition-colors hover:bg-mint hover:text-ink"
          >
            {copied ? <Check size={16} className="text-eco-600" /> : <Copy size={16} />}
          </button>
        </div>
        <p className="mt-1 text-small text-muted">
          Tunjukkan QR ini ke penjual saat mengambil pesanan.
        </p>
      </div>

      <dl className="px-4 py-3 text-[15px]">
        <div className="flex items-center gap-2 text-muted">
          <Clock3 size={16} className="text-eco-700" />
          <dt className="sr-only">Slot pengambilan</dt>
          <dd className="font-semibold text-ink">{ticket.pickup_time_slot}</dd>
        </div>
      </dl>

      <div className="px-4 py-3">
        <ul className="space-y-2.5">
          {ticket.items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="text-[15px]">
              <div className="flex items-start justify-between gap-3">
                <span className="text-ink-soft">
                  <span className="tnum font-semibold text-ink">{item.quantity}x</span> {item.name}
                </span>
                <span className="tnum shrink-0 text-ink-soft">
                  {formatRupiah(item.unit_price * item.quantity)}
                </span>
              </div>
              {item.item_notes ? (
                <p className="mt-0.5 pl-6 text-small text-gold-600">Catatan: {item.item_notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {ticket.notes ? (
        <div className="px-4 py-3">
          <div className="flex items-start gap-2 rounded-control bg-gold-50 px-3 py-2.5">
            <StickyNote size={16} className="mt-0.5 shrink-0 text-gold-600" />
            <div>
              <p className="text-small font-semibold text-gold-600">Catatan untuk penjual</p>
              <p className="mt-0.5 text-[15px] text-ink-soft">{ticket.notes}</p>
            </div>
          </div>
        </div>
      ) : null}

      <dl className="space-y-1.5 px-4 py-3 text-[15px]">
        <div className="flex justify-between text-muted">
          <dt>Subtotal</dt>
          <dd className="tnum">{formatRupiah(ticket.total_price)}</dd>
        </div>
        {ticket.payment_mode === "points" ? (
          <div className="flex justify-between text-eco-700">
            <dt>Sudah dibayar dengan poin</dt>
            <dd className="tnum">-{ticket.points_paid} P</dd>
          </div>
        ) : ticket.discount_applied > 0 ? (
          <div className="flex justify-between text-eco-700">
            <dt>Potongan poin</dt>
            <dd className="tnum">-{formatRupiah(ticket.discount_applied)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between pt-2 text-[17px] font-bold text-ink">
          <dt>{ticket.payment_mode === "points" ? "Sisa dibayar di kantin" : "Dibayar di kantin"}</dt>
          <dd className="tnum">{formatRupiah(net)}</dd>
        </div>
      </dl>
    </div>
  );
}
