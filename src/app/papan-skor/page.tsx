import type { Metadata } from "next";
import Image from "next/image";
import { ClassLeaderboard } from "@/components/leaderboard/ClassLeaderboard";
import { ImpactStatsGrid } from "@/components/leaderboard/ImpactStatsGrid";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNav, type PublicNavLink } from "@/components/public/PublicNav";
import { LoopMotif } from "@/components/art/LoopMotif";
import { RevealScope } from "@/components/motion/RevealScope";
import { createClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/query";
import { formatNumber } from "@/lib/format";
import type { ClassLeaderboardRow, ImpactStats, WasteItemType } from "@/types/database";

export const metadata: Metadata = { title: "Papan Skor" };

export const revalidate = 0;

const NAV_LINKS: PublicNavLink[] = [
  { label: "Modul", href: "/#modul" },
  { label: "Hitung poin", href: "/#hitung" },
  { label: "Cara kerja", href: "/#cara-kerja" },
];

/**
 * Foto nyata untuk jenis material yang benar-benar ditimbang di Bank Sampah.
 * Dipasangkan lewat kode jenis, bukan lewat nama tampilan, supaya tidak salah
 * pasang kalau labelnya diubah admin.
 */
const MATERIAL_PHOTO: Record<string, { src: string; alt: string }> = {
  kaleng: {
    src: "/images/photos/cans-recycling.jpg",
    alt: "Kaleng aluminium bekas yang dikumpulkan di tempat daur ulang.",
  },
  botol_plastik: {
    src: "/images/photos/waste-plastic-bottles.jpg",
    alt: "Pekerja mengangkat karung berisi botol plastik bekas ke atas truk pengangkut.",
  },
  kardus: {
    src: "/images/photos/57-cardboard-waste-pile-for-recycling-collection.jpg",
    alt: "Tumpukan kardus bekas yang dilipat rata, siap diangkut.",
  },
  kaca: {
    src: "/images/photos/soju-bottles-in-a-glass-recycling-bin.jpg",
    alt: "Botol-botol kaca di dalam wadah pengumpulan kaca.",
  },
};

/** Kelas masuk hero; jeda bertahap supaya terasa menyusun, bukan muncul sekaligus. */
const ENTER = "animate-fade-up";
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const [leaderboardRows, impactData, wasteTypesRes] = await Promise.all([
    supabase.rpc("get_class_leaderboard"),
    supabase.rpc("get_impact_stats"),
    supabase
      .from("waste_item_types")
      .select("code, label, unit_label, points_per_kg")
      .eq("is_active", true)
      .order("points_per_kg", { ascending: false }),
  ]);

  const rows = unwrap(leaderboardRows) as ClassLeaderboardRow[];
  const stats = unwrap(impactData) as ImpactStats;
  const wasteTypes = unwrap(wasteTypesRes) as WasteItemType[];
  const materials = wasteTypes.filter((type) => MATERIAL_PHOTO[type.code]).slice(0, 4);

  return (
    <RevealScope className="min-h-dvh bg-mint">
      {/* Bab 1 - bidang terdalam. Angka dampak memimpin, bukan dihias dulu. */}
      <section className="field on-field bg-eco-900 text-white">
        <LoopMotif className="pointer-events-none absolute -right-[34%] -top-[30%] h-[34rem] w-[34rem] text-eco-600/30 sm:-right-[18%] lg:h-[44rem] lg:w-[44rem]" />
        <Image
          src="/images/leaf-sprig.svg"
          alt=""
          width={220}
          height={320}
          className="animate-drift pointer-events-none absolute -bottom-10 left-2 w-[130px] opacity-20 sm:w-[170px] lg:left-8"
        />

        <div className="page-x relative pb-16 pt-6 sm:pb-20">
          <div className={ENTER} style={delay(0)}>
            <PublicNav links={NAV_LINKS} />
          </div>

          <h1
            className={`${ENTER} mt-12 max-w-[18ch] text-display font-extrabold lg:mt-14`}
            style={delay(60)}
          >
            Papan skor daur ulang
          </h1>

          <p
            className={`${ENTER} mt-6 max-w-xl text-[17px] leading-relaxed text-white/80`}
            style={delay(140)}
          >
            Setiap kilogram yang ditimbang petugas langsung tercatat di sini. Klasemen dihitung
            dari data setoran yang sudah diverifikasi, bukan dari jumlah setoran.
          </p>

          <div
            className={`${ENTER} mt-12 flex flex-wrap items-end gap-x-8 gap-y-5`}
            style={delay(220)}
          >
            <p className="flex items-baseline gap-2.5">
              <span className="tnum text-[clamp(3.75rem,11vw,8.5rem)] font-extrabold leading-[0.9] tracking-[-0.04em]">
                {formatNumber(stats.total_kg, 2)}
              </span>
              <span className="text-chapter font-extrabold">kg</span>
            </p>
            <p className="mb-2 max-w-xs text-[17px] leading-relaxed text-white/75">
              Total sampah yang sudah ditimbang dan diverifikasi, sepanjang umur aplikasi.
            </p>
          </div>
        </div>
      </section>

      {/* Bab 2 - material. Foto sungguhan dari jenis yang benar-benar ditimbang. */}
      {materials.length > 0 ? (
        <section className="field bg-white" aria-labelledby="material">
          <Image
            src="/images/leaf-sprig.svg"
            alt=""
            width={220}
            height={320}
            className="animate-drift pointer-events-none absolute -top-8 right-2 w-[140px] opacity-20 sm:w-[180px] lg:right-10"
            style={{ animationDelay: "-4s" }}
          />
          <div className="page-x relative py-16 sm:py-20">
            <h2
              id="material"
              className="text-chapter font-extrabold text-ink"
              data-reveal
            >
              Yang ditimbang di sini
            </h2>
            <p
              className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-soft"
              data-reveal
            >
              Lima jenis material dicatat sistem. Empat di antaranya, beserta nilai poin yang
              berlaku sekarang, ada di bawah ini.
            </p>

            <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
              {materials.map((type) => {
                const photo = MATERIAL_PHOTO[type.code];
                return (
                  <li key={type.code} data-reveal>
                    <figure>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-card">
                        <Image
                          src={photo.src}
                          alt={photo.alt}
                          fill
                          sizes="(min-width: 1024px) 24vw, 45vw"
                          className="animate-slow-zoom object-cover"
                        />
                      </div>
                      <figcaption className="mt-3">
                        <span className="block text-[17px] font-bold text-ink">{type.label}</span>
                        <span className="tnum mt-0.5 block text-small text-muted">
                          {formatNumber(type.points_per_kg)} poin / kg
                        </span>
                      </figcaption>
                    </figure>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Bab 3 - bidang kerja: dampak, lalu klasemen. Satu kolom, satu nada. */}
      <section className="field bg-mint" aria-labelledby="klasemen">
        <div className="page-x py-16 sm:py-20">
          <div data-reveal>
            <ImpactStatsGrid stats={stats} />
          </div>

          <h2 id="klasemen" className="mt-16 text-chapter font-extrabold text-ink" data-reveal>
            Klasemen kelas
          </h2>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-soft" data-reveal>
            Saring per jurusan untuk melihat kelas mana yang paling banyak mengembalikan
            materialnya.
          </p>

          <div className="mt-10">
            <ClassLeaderboard rows={rows} />
          </div>
        </div>
      </section>

      <PublicFooter />
    </RevealScope>
  );
}
