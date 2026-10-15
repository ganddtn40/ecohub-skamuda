import { ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresher } from "@/components/realtime/RealtimeRefresher";
import { PageTitle } from "@/components/layout/PageTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  WasteHistoryTable,
  type WasteHistoryRow,
} from "@/components/officer/WasteHistoryTable";

export const metadata = { title: "Riwayat Setoran" };
export const revalidate = 0;

export default async function OfficerHistoryPage() {
  const { profile } = await requireRole(["waste_officer"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("waste_deposits")
    .select(
      "id, created_at, weight_kg, quantity, points_earned, item_type, profiles!waste_deposits_student_id_fkey(full_name, class_name), waste_item_types(label)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as WasteHistoryRow[];

  return (
    <div>
      <RealtimeRefresher
        channelName={`officer-history-${profile.id}`}
        subscriptions={[{ table: "waste_deposits" }]}
      />

      <PageTitle
        title="Riwayat Setoran Sampah"
        description="Semua setoran yang tercatat, lengkap dengan data siswa. Gunakan ekspor CSV untuk laporan."
      />

      <div className="mt-5">
        {rows.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={22} />}
            title="Belum ada transaksi"
            description="Riwayat setoran muncul di sini setelah kamu memproses setoran pertama."
          />
        ) : (
          <WasteHistoryTable rows={rows} />
        )}
      </div>
    </div>
  );
}
