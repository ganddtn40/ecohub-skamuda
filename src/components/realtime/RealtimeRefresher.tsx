"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Subscription {
  table: string;
  filter?: string;
}

/**
 * Langganan Supabase Realtime: setiap perubahan pada tabel terkait memicu
 * router.refresh() sehingga data server ter-render ulang tanpa reload manual.
 *
 * `onInsert` bersifat opsional dan hanya dipanggil untuk peristiwa INSERT. Ia
 * dipakai papan penjual untuk memberi tahu ada pesanan baru tanpa harus menunggu
 * render ulang selesai. Callback-nya disimpan di ref supaya langganan tidak
 * dibongkar-pasang setiap kali induknya render dengan fungsi baru.
 */
export function RealtimeRefresher({
  channelName,
  subscriptions,
  onInsert,
}: {
  channelName: string;
  subscriptions: Subscription[];
  onInsert?: (table: string, row: Record<string, unknown>) => void;
}) {
  const router = useRouter();
  const onInsertRef = useRef(onInsert);

  useEffect(() => {
    onInsertRef.current = onInsert;
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(channelName);

    for (const sub of subscriptions) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        (payload) => {
          if (payload.eventType === "INSERT" && onInsertRef.current) {
            onInsertRef.current(sub.table, payload.new as Record<string, unknown>);
          }
          router.refresh();
        },
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, JSON.stringify(subscriptions), router]);

  return null;
}
