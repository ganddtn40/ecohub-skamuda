"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Subscription {
  table: string;
  filter?: string;
}

/**
 * Langganan Supabase Realtime: setiap perubahan pada tabel terkait memicu
 * router.refresh() sehingga data server ter-render ulang tanpa reload manual.
 */
export function RealtimeRefresher({
  channelName,
  subscriptions,
}: {
  channelName: string;
  subscriptions: Subscription[];
}) {
  const router = useRouter();

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
        () => router.refresh(),
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
