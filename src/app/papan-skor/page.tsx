import type { Metadata } from "next";
import { ClassLeaderboard } from "@/components/leaderboard/ClassLeaderboard";
import { ImpactStatsGrid } from "@/components/leaderboard/ImpactStatsGrid";
import { PageTitle } from "@/components/layout/PageTitle";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { createClient } from "@/lib/supabase/server";
import type { ClassLeaderboardRow, ImpactStats } from "@/types/database";

export const metadata: Metadata = { title: "Papan Skor" };

export const revalidate = 0;

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const [{ data: leaderboardRows }, { data: impactData }] = await Promise.all([
    supabase.rpc("get_class_leaderboard"),
    supabase.rpc("get_impact_stats"),
  ]);

  const rows = (leaderboardRows ?? []) as ClassLeaderboardRow[];
  const stats = (impactData ?? {
    total_kg: 0,
    total_points: 0,
    students: 0,
    deposits: 0,
    co2e_kg: 0,
  }) as ImpactStats;

  return (
    <div className="min-h-dvh bg-mint">
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
        <PageTitle
          title="Papan Skor Daur Ulang"
          description="Klasemen kelas dihitung langsung dari data setoran sampah siswa. Dampak lingkungan diperbarui otomatis."
        />

        <section className="mt-6" aria-label="Statistik dampak lingkungan">
          <ImpactStatsGrid stats={stats} />
        </section>

        <section className="mt-8" aria-label="Klasemen kelas">
          <ClassLeaderboard rows={rows} />
        </section>
      </main>
    </div>
  );
}
