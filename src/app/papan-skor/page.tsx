import type { Metadata } from "next";
import { ClassLeaderboard } from "@/components/leaderboard/ClassLeaderboard";
import { ImpactStatsGrid } from "@/components/leaderboard/ImpactStatsGrid";
import { PageTitle } from "@/components/layout/PageTitle";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { createClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/query";
import type { ClassLeaderboardRow, ImpactStats } from "@/types/database";

export const metadata: Metadata = { title: "Papan Skor" };

export const revalidate = 0;

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const [leaderboardRows, impactData] = await Promise.all([
    supabase.rpc("get_class_leaderboard"),
    supabase.rpc("get_impact_stats"),
  ]);

  const rows = unwrap(leaderboardRows) as ClassLeaderboardRow[];
  const stats = unwrap(impactData) as ImpactStats;

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
