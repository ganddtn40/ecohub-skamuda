import type { ReactNode } from "react";
import Link from "next/link";
import { Ban, Clock3, Coins, Store, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { ORDER_STATUS_META, ROUTE, STATUS_TONE } from "@/lib/constants";
import { formatDateTime, formatRupiah } from "@/lib/format";
import type { PreorderStatus, TicketData } from "@/types/database";

/**
 * Penjaga halaman kantin siswa. Tiga keadaannya saling meniadakan, dan urutannya
 * penting: blokir diperiksa lebih dulu daripada pesanan aktif, karena siswa yang
 * diblokir tetap tidak boleh memesan walau pesanan lamanya masih tersangkut.
 *
 * Ini komponen server: tidak ada keadaan yang perlu dipegang di klien, dan
 * keputusannya datang dari `get_preorder_status()` di halaman.
 *
 * `activeOrder` boleh null meski `status.active_order_id` terisi — pesanannya
 * mungkin gagal terbaca. Kalau itu terjadi, penjaga tetap menahan katalog dan
 * menyebut kode booking dari status, bukan diam-diam membiarkan siswa memesan
 * dan menabrak aturan satu-pesanan-aktif di sisi basis data.
 */
export function PreorderGate({
  status,
  activeOrder,
  children,
}: {
  status: PreorderStatus;
  activeOrder: TicketData | null;
  children: ReactNode;
}) {
  if (status.is_blocked) {
    return (
      <div className="rounded-card bg-danger-50 p-5">
        <div className="flex items-center gap-2 text-danger-600">
          <Ban size={19} className="shrink-0" />
          <h2 className="text-[17px] font-bold">Pre-Order Kantin diblokir sementara</h2>
        </div>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Pesanan kantinmu tidak diambil sampai batas waktu, jadi pre-order ditutup dulu.
        </p>
        {status.blocked_until ? (
          <p className="mt-3 text-[15px] text-ink-soft">
            Kamu bisa memesan lagi pada{" "}
            <span className="tnum font-semibold text-ink">
              {formatDateTime(status.blocked_until)}
            </span>
            .
          </p>
        ) : null}
        <Link
          href={ROUTE.studentOrders}
          className={buttonStyles("secondary", "sm", "mt-4")}
        >
          Lihat pesanan saya
        </Link>
      </div>
    );
  }

  if (status.active_order_id) {
    const activeStatus = activeOrder?.status ?? status.active_order_status;
    const bookingCode = activeOrder?.booking_code ?? status.active_booking_code ?? "—";
    const net = activeOrder ? activeOrder.total_price - activeOrder.discount_applied : 0;

    return (
      <div className="rounded-card bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-eco-700">
            <Store size={17} />
            <span className="text-[15px] font-semibold">
              {activeOrder?.stand_name ?? "Kantin"}
            </span>
          </div>
          {activeStatus ? (
            <Badge tone={STATUS_TONE[activeStatus]}>{ORDER_STATUS_META[activeStatus].label}</Badge>
          ) : null}
        </div>

        <p className="tnum mt-3 text-[22px] font-bold tracking-wide text-ink">{bookingCode}</p>

        {activeOrder ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-muted">
              <span className="inline-flex items-center gap-1">
                <Clock3 size={14} /> {activeOrder.pickup_time_slot}
              </span>
              {activeOrder.payment_mode === "points" ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-eco-700">
                  <Coins size={14} className="shrink-0" />
                  Sudah dibayar dengan poin · <span className="tnum">{activeOrder.points_paid} P</span>
                </span>
              ) : (
                <span className="inline-flex items-baseline gap-1.5">
                  <span className="tnum text-[15px] font-bold text-ink">{formatRupiah(net)}</span>
                  <span className="font-medium">tunai di kantin</span>
                </span>
              )}
            </div>

            <ul className="mt-3 space-y-2 pt-3">
              {activeOrder.items.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-start justify-between gap-3 text-[15px]"
                >
                  <span className="text-ink-soft">
                    <span className="tnum font-semibold text-ink">{item.quantity}x</span>{" "}
                    {item.name}
                  </span>
                  <span className="tnum shrink-0 text-muted">
                    {formatRupiah(item.unit_price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <p className="mt-4 rounded-control bg-eco-50 px-3.5 py-2.5 text-[15px] text-eco-700">
          {activeStatus === "awaiting_approval"
            ? "Menunggu penjual menerima pesanan ini. Kamu bisa memesan lagi setelah pesanan ini selesai."
            : "Pesanan ini masih berjalan. Kamu bisa memesan lagi setelah pesanan ini selesai."}
        </p>

        <Link
          href={ROUTE.studentOrders}
          className={buttonStyles("secondary", "sm", "mt-3 w-full")}
        >
          Lihat tiket booking
        </Link>
      </div>
    );
  }

  return (
    <div>
      {status.unclaimed_count === 1 ? (
        <div className="mb-4 rounded-card bg-gold-50 p-4">
          <div className="flex items-start gap-2">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-gold-600" />
            <div>
              <p className="text-[15px] font-semibold text-gold-600">
                Satu pesananmu tidak diambil
              </p>
              <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
                Poinnya masih dikembalikan, tapi kalau sekali lagi pesananmu tidak diambil,
                poinnya hangus dan pre-order kantin diblokir 3 hari.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {children}
    </div>
  );
}
