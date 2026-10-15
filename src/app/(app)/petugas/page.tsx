import { ClipboardList, Recycle, Scale } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/layout/PageTitle";
import { StatTile } from "@/components/layout/StatTile";
import { WasteOfficerPanel } from "@/components/officer/WasteOfficerPanel";
import { formatNumber, todayStartISO } from "@/lib/format";
import type { WasteItemType } from "@/types/database";

export const metadata = { title: "Pindai Setoran" };
export const revalidate = 0;

export default async function OfficerPage() {
  await requireRole(["waste_officer"]);
  const supabase = await createClient();

  const [typesRes, todayRes] = await Promise.all([
    supabase
      .from("waste_item_types")
      .select("code, label, unit_label, points_per_kg, is_active")
      .eq("is_active", true)
      .order("label", { ascending: true }),
    supabase
      .from("waste_deposits")
      .select("weight_kg, points_earned")
      .gte("created_at", todayStartISO()),
  ]);

  const wasteTypes = (typesRes.data ?? []) as WasteItemType[];
  const todayRows = (todayRes.data ?? []) as Array<{ weight_kg: number; points_earned: number }>;
  const todayCount = todayRows.length;
  const todayKg = todayRows.reduce((sum, row) => sum + Number(row.weight_kg), 0);
  const todayPoints = todayRows.reduce((sum, row) => sum + Number(row.points_earned), 0);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Bank Sampah"
        description="Pindai QR siswa, catat jenis dan berat sampah, poin akan otomatis masuk ke akun siswa."
      />

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Ringkasan setoran hari ini">
        <StatTile
          icon={<ClipboardList size={18} />}
          label="Setoran hari ini"
          value={formatNumber(todayCount)}
          unit="transaksi"
          tone="green"
        />
        <StatTile
          icon={<Scale size={18} />}
          label="Berat hari ini"
          value={formatNumber(todayKg, 2)}
          unit="kg"
          tone="neutral"
        />
        <StatTile
          icon={<Recycle size={18} />}
          label="Poin dibagikan"
          value={formatNumber(todayPoints)}
          unit="P"
          tone="amber"
        />
      </section>

      <WasteOfficerPanel wasteTypes={wasteTypes} />
    </div>
  );
}
