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
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <div className="border-b border-line bg-eco-50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-eco-700">
            <Store size={17} />
            <span className="text-sm font-semibold">{ticket.stand_name ?? "Kantin"}</span>
          </div>
          <Badge tone={STATUS_TONE[ticket.status]}>{meta.label}</Badge>
        </div>
      </div>

      <div className="flex flex-col items-center px-4 py-5">
        <div className="rounded-control border border-line bg-white p-3">
          <QRCodeSVG value={ticket.booking_code} size={168} level="M" marginSize={0} />
        </div>

        <p className="mt-3 text-xs font-medium text-muted">Kode booking</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="tnum text-lg font-bold tracking-wide text-ink">
            {ticket.booking_code}
          </span>
          <button
            type="button"
            onClick={copyCode}
            aria-label="Salin kode booking"
            className="grid h-9 w-9 place-items-center rounded-control border border-line text-muted transition-colors hover:bg-mint hover:text-ink"
          >
            {copied ? <Check size={16} className="text-eco-600" /> : <Copy size={16} />}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          Tunjukkan QR ini ke penjual saat mengambil pesanan.
        </p>
      </div>

      <dl className="border-t border-line px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-muted">
          <Clock3 size={16} className="text-eco-700" />
          <dt className="sr-only">Slot pengambilan</dt>
          <dd className="font-semibold text-ink">{ticket.pickup_time_slot}</dd>
        </div>
      </dl>

      <div className="border-t border-line px-4 py-3">
        <ul className="space-y-2.5">
          {ticket.items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-ink-soft">
                  <span className="tnum font-semibold text-ink">{item.quantity}x</span> {item.name}
                </span>
                <span className="tnum shrink-0 text-ink-soft">
                  {formatRupiah(item.unit_price * item.quantity)}
                </span>
              </div>
              {item.item_notes ? (
                <p className="mt-0.5 pl-6 text-xs text-gold-600">Catatan: {item.item_notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {ticket.notes ? (
        <div className="border-t border-line px-4 py-3">
          <div className="flex items-start gap-2 rounded-control bg-gold-50 px-3 py-2.5">
            <StickyNote size={16} className="mt-0.5 shrink-0 text-gold-600" />
            <div>
              <p className="text-xs font-semibold text-gold-600">Catatan untuk penjual</p>
              <p className="mt-0.5 text-sm text-ink-soft">{ticket.notes}</p>
            </div>
          </div>
        </div>
      ) : null}

      <dl className="space-y-1.5 border-t border-line px-4 py-3 text-sm">
        <div className="flex justify-between text-muted">
          <dt>Subtotal</dt>
          <dd className="tnum">{formatRupiah(ticket.total_price)}</dd>
        </div>
        {ticket.discount_applied > 0 ? (
          <div className="flex justify-between text-eco-700">
            <dt>Potongan poin</dt>
            <dd className="tnum">-{formatRupiah(ticket.discount_applied)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-ink">
          <dt>Dibayar di kantin</dt>
          <dd className="tnum">{formatRupiah(net)}</dd>
        </div>
      </dl>
    </div>
  );
}
