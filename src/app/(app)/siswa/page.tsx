import Link from "next/link";
import { Coins, QrCode, Recycle, ShoppingBag, Target } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresher } from "@/components/realtime/RealtimeRefresher";
import { PageTitle } from "@/components/layout/PageTitle";
import { StatTile } from "@/components/layout/StatTile";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonStyles } from "@/components/ui/Button";
import { DepositList, type DepositListItem } from "@/components/student/DepositList";
import { DAILY_RECYCLE_TARGET_KG, ROUTE } from "@/lib/constants";
import { formatKg, formatNumber, todayStartISO } from "@/lib/format";
import { unwrap } from "@/lib/query";

export const metadata = { title: "Dashboard Siswa" };
export const revalidate = 0;

export default async function StudentDashboard() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const [depositsRes, todayRes, ordersRes] = await Promise.all([
    supabase
      .from("waste_deposits")
      .select("id, item_type, quantity, weight_kg, points_earned, created_at, waste_item_types(label)")
      .eq("student_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("waste_deposits")
      .select("weight_kg")
      .eq("student_id", profile.id)
      .gte("created_at", todayStartISO()),
    supabase
      .from("orders")
      .select("id, booking_code, status")
      .eq("student_id", profile.id)
      .in("status", ["pending", "processing", "ready_for_pickup"]),
  ]);

  const deposits = unwrap(depositsRes) as unknown as DepositListItem[];
  const todayKg = unwrap(todayRes).reduce(
    (sum, row) => sum + Number((row as { weight_kg: number }).weight_kg),
    0,
  );
  const activeOrders = unwrap(ordersRes).length;

  const progress = DAILY_RECYCLE_TARGET_KG > 0 ? todayKg / DAILY_RECYCLE_TARGET_KG : 0;
  const firstName = profile.full_name.split(/\s+/)[0];

  return (
    <div className="space-y-6">
      <RealtimeRefresher
        channelName={`student-${profile.id}`}
        subscriptions={[
          { table: "waste_deposits", filter: `student_id=eq.${profile.id}` },
          { table: "orders", filter: `student_id=eq.${profile.id}` },
          { table: "profiles", filter: `id=eq.${profile.id}` },
        ]}
      />

      <PageTitle
        title={`Halo, ${firstName}`}
        description="Ringkasan poin, hasil daur ulang, dan pesanan kantinmu diperbarui otomatis."
      />

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Ringkasan siswa">
        <StatTile
          icon={<Coins size={18} />}
          label="Saldo poin"
          value={formatNumber(profile.points_balance)}
          unit="P"
          tone="amber"
          hint="Bisa ditukar di kantin"
        />
        <StatTile
          icon={<Recycle size={18} />}
          label="Total daur ulang"
          value={formatNumber(profile.total_recycled_kg, 2)}
          unit="kg"
          tone="green"
          hint="Sejak akun aktif"
        />

        <div className="flex items-center gap-4 rounded-card border border-line bg-white p-4 sm:col-span-1">
          <ProgressRing
            value={progress}
            label={`${formatNumber(Math.min(progress, 1) * 100)}%`}
            sublabel="hari ini"
            size={96}
            stroke={9}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-eco-700">
              <Target size={16} />
              <span className="text-sm font-semibold">Target harian</span>
            </div>
            <p className="tnum mt-1 text-lg font-bold text-ink">{formatKg(todayKg)}</p>
            <p className="text-xs text-muted">
              dari target {formatKg(DAILY_RECYCLE_TARGET_KG)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Aksi cepat">
        <Link
          href={ROUTE.studentQr}
          className="flex items-center gap-3 rounded-card border border-line bg-white p-4 transition-colors hover:bg-mint"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-eco-50 text-eco-700">
            <QrCode size={22} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink">Tampilkan QR setoran</span>
            <span className="block text-xs text-muted">Untuk dipindai petugas</span>
          </span>
        </Link>

        <Link
          href={ROUTE.studentCanteen}
          className="flex items-center gap-3 rounded-card border border-line bg-white p-4 transition-colors hover:bg-mint"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-eco-50 text-eco-700">
            <ShoppingBag size={22} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink">Pesan di kantin</span>
            <span className="block text-xs text-muted">Pre-order sesuai jam istirahat</span>
          </span>
        </Link>

        <Link
          href={ROUTE.studentOrders}
          className="flex items-center gap-3 rounded-card border border-line bg-white p-4 transition-colors hover:bg-mint"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-eco-50 text-eco-700">
            <Coins size={22} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink">Pesanan aktif</span>
            <span className="block text-xs text-muted">
              {activeOrders > 0 ? `${activeOrders} pesanan menunggu` : "Belum ada pesanan aktif"}
            </span>
          </span>
        </Link>
      </section>

      <section aria-labelledby="setoran-terakhir">
        <div className="flex items-end justify-between gap-2">
          <h2 id="setoran-terakhir" className="text-lg font-bold text-ink">
            Setoran terakhir
          </h2>
          <Link
            href={ROUTE.studentHistory}
            className="text-sm font-semibold text-eco-700 hover:underline"
          >
            Lihat semua
          </Link>
        </div>

        <div className="mt-3">
          {deposits.length === 0 ? (
            <EmptyState
              icon={<Recycle size={22} />}
              title="Belum ada setoran sampah"
              description="Tunjukkan QR milikmu ke petugas Bank Sampah untuk mulai mengumpulkan poin."
              action={
                <Link href={ROUTE.studentQr} className={buttonStyles("primary", "sm")}>
                  Buka QR Saya
                </Link>
              }
            />
          ) : (
            <DepositList items={deposits} />
          )}
        </div>
      </section>
    </div>
  );
}
