import { Coins, Recycle } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresher } from "@/components/realtime/RealtimeRefresher";
import { PageTitle } from "@/components/layout/PageTitle";
import { StatTile } from "@/components/layout/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { DepositList, type DepositListItem } from "@/components/student/DepositList";
import { formatNumber } from "@/lib/format";
import { unwrap } from "@/lib/query";

export const metadata = { title: "Riwayat Daur Ulang" };
export const revalidate = 0;

export default async function StudentHistoryPage() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const deposits = unwrap(
    await supabase
      .from("waste_deposits")
      .select("id, item_type, quantity, weight_kg, points_earned, created_at, waste_item_types(label)")
      .eq("student_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(60),
  ) as unknown as DepositListItem[];
  const totalPoints = deposits.reduce((sum, item) => sum + item.points_earned, 0);
  const totalKg = deposits.reduce((sum, item) => sum + Number(item.weight_kg), 0);

  return (
    <div>
      <RealtimeRefresher
        channelName={`student-history-${profile.id}`}
        subscriptions={[
          { table: "waste_deposits", filter: `student_id=eq.${profile.id}` },
        ]}
      />

      <PageTitle
        title="Riwayat Daur Ulang"
        description="Catatan setiap setoran sampah yang sudah diverifikasi petugas Bank Sampah."
      />

      <section className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="Ringkasan riwayat">
        <StatTile
          icon={<Recycle size={18} />}
          label="Total pada daftar ini"
          value={formatNumber(totalKg, 2)}
          unit="kg"
          tone="green"
        />
        <StatTile
          icon={<Coins size={18} />}
          label="Poin dari daftar ini"
          value={formatNumber(totalPoints)}
          unit="P"
          tone="amber"
        />
      </section>

      <section className="mt-6">
        {deposits.length === 0 ? (
          <EmptyState
            icon={<Recycle size={22} />}
            title="Belum ada transaksi"
            description="Riwayat setoran akan muncul setelah petugas memproses sampah yang kamu bawa."
          />
        ) : (
          <DepositList items={deposits} />
        )}
      </section>
    </div>
  );
}
