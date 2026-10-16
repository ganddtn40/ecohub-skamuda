"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RealtimeRefresher } from "@/components/realtime/RealtimeRefresher";
import { OrderBoard, type OrderFilter, type VendorOrder } from "@/components/vendor/OrderBoard";
import { useToast } from "@/components/ui/Toast";

/**
 * Kulit papan penjual: menyatukan langganan realtime, notifikasi pesanan baru,
 * dan filter papan.
 *
 * Filternya hidup di sini, bukan di dalam `OrderBoard`, karena aksi "Lihat" pada
 * toast harus bisa memindahkannya. Batas client-nya ada di berkas ini: halaman
 * penjual tetap Server Component yang cuma mengambil data.
 *
 * ## Kenapa notifikasinya tidak hanya mengandalkan realtime
 *
 * Pada proyek Supabase yang dipakai sekarang, peristiwa INSERT untuk tabel
 * `orders` tidak pernah sampai ke klien. Yang sampai hanya UPDATE dan DELETE.
 * Sudah diperiksa dan bukan salah setelan yang bisa diperbaiki dari sini:
 * `orders` ada di publikasi `supabase_realtime`, `wal_level` = logical, semua
 * flag publikasi menyala, `replica identity` sudah `full`, dan penjual memang
 * boleh membaca barisnya di bawah RLS (diuji dengan menyamar sebagai penjual).
 * Jadi penekanannya ada di dalam Realtime sendiri.
 *
 * Karena itu toast dipicu dari dua arah:
 *
 * 1. `onInsert` realtime — instan, dan yang benar begitu sisi Supabase beres.
 * 2. Selisih data yang datang dari server — papan disegarkan berkala selagi tab
 *    terlihat, lalu pesanan yang belum pernah diberitakan dibandingkan. Ini yang
 *    membuat penjual tetap tahu ada pesanan masuk kalau nomor 1 bisu.
 *
 * Keduanya memakai satu himpunan id yang sama supaya satu pesanan tidak
 * diberitakan dua kali.
 */

/** Jeda penyegaran cadangan. Cukup rapat untuk terasa hidup, cukup longgar untuk tidak boros. */
const FALLBACK_REFRESH_MS = 30000;

export function OrderFeed({
  orders,
  standIds,
  channelName,
}: {
  orders: VendorOrder[];
  standIds: string[];
  channelName: string;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [status, setStatus] = useState<OrderFilter>("aktif");

  // Pesanan yang sudah pernah muncul sebagai toast.
  const notified = useRef(new Set<string>());
  // Muat pertama bukan kabar baru: papan memang sudah berisi antrean sejak awal.
  const firstLoad = useRef(true);

  function announce(id: string, slot: string, code: string) {
    if (notified.current.has(id)) return;
    notified.current.add(id);
    show(`Pesanan baru · ${slot} · ${code}`, {
      actionLabel: "Lihat",
      onAction: () => setStatus("menunggu"),
    });
  }

  function handleInsert(table: string, row: Record<string, unknown>) {
    if (table !== "orders") return;

    const standId = typeof row.stand_id === "string" ? row.stand_id : null;
    if (!standId || !standIds.includes(standId)) return;

    const id = typeof row.id === "string" ? row.id : null;
    const code = typeof row.booking_code === "string" ? row.booking_code : null;
    if (!id || !code) return;

    const slot =
      typeof row.pickup_time_slot === "string" ? row.pickup_time_slot : "slot belum diisi";
    announce(id, slot, code);
  }

  // Jalur cadangan: begitu data server berubah, pesanan menunggu yang belum
  // pernah diberitakan akan memunculkan toast yang sama.
  useEffect(() => {
    const fresh = orders.filter(
      (order) => order.status === "awaiting_approval" && !notified.current.has(order.id),
    );
    for (const order of fresh) notified.current.add(order.id);

    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }

    const newest = fresh[0];
    if (!newest) return;

    show(
      fresh.length === 1
        ? `Pesanan baru · ${newest.pickup_time_slot} · ${newest.booking_code}`
        : `${fresh.length} pesanan baru · terbaru ${newest.pickup_time_slot} · ${newest.booking_code}`,
      { actionLabel: "Lihat", onAction: () => setStatus("menunggu") },
    );
  }, [orders, show]);

  // Papan ikut menyegarkan diri selagi tab terlihat. Tanpa ini, pesanan baru
  // hanya muncul kalau kebetulan ada perubahan lain yang memicu realtime.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, FALLBACK_REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <>
      <RealtimeRefresher
        channelName={channelName}
        subscriptions={[{ table: "orders" }, { table: "order_items" }]}
        onInsert={handleInsert}
      />
      <OrderBoard orders={orders} status={status} onStatusChange={setStatus} />
    </>
  );
}
