import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { LoopMotif } from "@/components/art/LoopMotif";
import { RevealScope } from "@/components/motion/RevealScope";
import { StaggerGroup, StaggerItem } from "@/components/motion/StaggerGroup";
import { HeroDevice } from "@/components/public/HeroDevice";
import { PointSimulator } from "@/components/public/PointSimulator";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNav } from "@/components/public/PublicNav";
import { buttonStyles } from "@/components/ui/Button";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/query";
import { CO2E_FACTOR_PER_KG, ROLE_HOME, ROUTE } from "@/lib/constants";
import { formatKg, formatNumber, formatRupiah } from "@/lib/format";
import type {
  ClassLeaderboardRow,
  ImpactStats,
  MenuItem,
  VoucherTier,
  WasteItemType,
} from "@/types/database";

export const metadata: Metadata = { title: "Beranda" };
export const revalidate = 0;

const NAV_LINKS = [
  { label: "Modul", href: "#modul" },
  { label: "Hitung poin", href: "#hitung" },
  { label: "Cara kerja", href: "#cara-kerja" },
];

/** Tiga langkah nyata dari alur setoran sampai pengambilan pesanan. */
const STEPS = [
  {
    title: "Tunjukkan QR pribadi",
    body: "Setiap siswa punya satu kode QR tetap di halaman QR Saya. Tidak perlu kartu fisik, tidak perlu mencatat nomor.",
  },
  {
    title: "Petugas menimbang, poin masuk",
    body: "Petugas memindai QR, memilih jenis sampah, lalu menimbangnya. Saldo poin dan total kilogram langsung bertambah di akun siswa, dan setoran itu ikut terhitung untuk kelasnya.",
  },
  {
    title: "Poin jadi potongan harga di kantin",
    body: "Saat memesan, poin ditukar jadi voucher. Pesanan diambil di jam istirahat dengan menunjukkan kode booking ke penjual.",
  },
];

/** Kelas masuk untuk elemen hero; jeda dibuat bertahap supaya terasa menyusun. */
const ENTER = "animate-fade-up";
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

export default async function HomePage() {
  const session = await getSessionProfile();
  if (session) redirect(ROLE_HOME[session.profile.role]);

  const supabase = await createClient();
  const [leaderboardResult, impactResult, wasteResult, tierResult, menuResult] = await Promise.all([
    supabase.rpc("get_class_leaderboard"),
    supabase.rpc("get_impact_stats"),
    supabase
      .from("waste_item_types")
      .select("*")
      .eq("is_active", true)
      .order("points_per_kg", { ascending: false }),
    supabase.from("voucher_tiers").select("*").eq("is_active", true).order("points_cost"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .order("price_idr", { ascending: false }),
  ]);

  const rows = unwrap(leaderboardResult) as ClassLeaderboardRow[];
  const stats = unwrap(impactResult) as ImpactStats;
  const wasteTypes = unwrap(wasteResult) as WasteItemType[];
  const voucherTiers = unwrap(tierResult) as VoucherTier[];
  const menuItems = unwrap(menuResult) as MenuItem[];

  const top = rows.filter((row) => Number(row.total_kg) > 0).slice(0, 5);
  const featured = menuItems[0] ?? null;
  const hasDeposits = Number(stats.deposits) > 0;

  return (
    <RevealScope className="min-h-dvh bg-mint">
      {/* Bab 1 - hero, bidang terdalam. Bentuk termotif dipotong tepi kanan. */}
      <section className="field on-field bg-eco-900 text-white">
        <LoopMotif className="pointer-events-none absolute -right-[38%] -top-[24%] h-[40rem] w-[40rem] text-eco-600/35 sm:-right-[20%] sm:h-[46rem] sm:w-[46rem] lg:top-1/2 lg:h-[52rem] lg:w-[52rem] lg:-translate-y-1/2 lg:translate-x-[20%]" />

        <StaggerGroup className="page-x relative pb-16 pt-6 sm:pb-20">
          <div className={ENTER} style={delay(0)}>
            <PublicNav links={NAV_LINKS} />
          </div>

          <h1
            className={`${ENTER} mt-12 max-w-[22ch] text-display font-extrabold lg:mt-14`}
            style={delay(60)}
          >
            Sampah jadi poin,
            <br />
            kantin tanpa antre.
          </h1>

          <div className="mt-12 grid items-start gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <StaggerItem
                as="p"
                className="max-w-xl text-[17px] leading-relaxed text-white/80"
              >
                SKAMUDA EcoHub menyatukan Bank Sampah berbasis poin dan Pre-Order Kantin Pintar
                dalam satu aplikasi untuk seluruh warga SMKN 1 Murung Pudak. Satu saldo, dipakai
                langsung di kantin.
              </StaggerItem>

              <StaggerItem className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link href={ROUTE.register} className={buttonStyles("onDark")}>
                  Daftar akun siswa
                </Link>
                <Link
                  href={ROUTE.leaderboard}
                  className="inline-flex h-11 items-center gap-1.5 text-[17px] font-semibold text-white/85 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
                >
                  Lihat papan skor kelas
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </StaggerItem>
            </div>

            <StaggerItem className="relative flex items-end justify-center gap-1 sm:gap-4 lg:col-span-6 lg:justify-end">
              <Image
                src="/images/leaf-sprig.svg"
                alt=""
                width={220}
                height={320}
                className="animate-drift pointer-events-none absolute -left-2 bottom-4 z-30 hidden w-[92px] sm:block lg:w-[112px]"
              />
              <Image
                src="/images/waste-bank.svg"
                alt=""
                width={560}
                height={600}
                priority
                className="relative z-0 hidden w-[176px] shrink-0 sm:block lg:w-[212px]"
              />
              <div className="relative z-10">
                <HeroDevice
                  stats={stats}
                  dish={featured ? { name: featured.name, price_idr: featured.price_idr } : null}
                />
              </div>
            </StaggerItem>
          </div>
        </StaggerGroup>
      </section>

      {/* Bab 2 - dampak. Satu angka memiliki layar, jadi angka itu sendiri judulnya. */}
      <section className="field bg-white" aria-labelledby="dampak">
        <Image
          src="/images/leaf-sprig.svg"
          alt=""
          width={220}
          height={320}
          className="animate-drift pointer-events-none absolute -top-6 right-2 w-[130px] opacity-25 sm:w-[170px] lg:right-10"
        />
        <div className="page-x grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
          <div>
            <h2 id="dampak" className="flex flex-wrap items-baseline gap-x-4">
              <span className="tnum text-[clamp(4rem,10vw,8.5rem)] font-extrabold leading-[0.85] text-eco-700">
                {formatNumber(stats.total_kg, 2)}
              </span>
              <span className="text-item font-bold text-eco-700">kg</span>
            </h2>

            <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-ink-soft" data-reveal>
              Itu dampak yang sudah tercatat: total sampah yang ditimbang dan diverifikasi petugas
              sejak sistem ini dipakai.{" "}
              {hasDeposits
                ? "Angkanya bertambah setiap kali ada setoran baru."
                : "Setoran pertama akan langsung muncul di sini dan di papan skor."}
            </p>

            <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div data-reveal>
                <p className="tnum text-[26px] font-bold text-ink">
                  {formatNumber(stats.total_points)}
                </p>
                <p className="mt-1.5 text-small font-semibold text-muted">Poin beredar</p>
              </div>
              <div data-reveal>
                <p className="tnum text-[26px] font-bold text-ink">
                  {formatNumber(stats.co2e_kg, 1)} kg
                </p>
                <p className="mt-1.5 text-small font-semibold text-muted">Estimasi reduksi CO2e</p>
              </div>
              <div data-reveal>
                <p className="tnum text-[26px] font-bold text-ink">
                  {formatNumber(stats.deposits)}
                </p>
                <p className="mt-1.5 text-small font-semibold text-muted">Setoran diverifikasi</p>
              </div>
            </div>

            <p className="mt-8 max-w-xl text-small leading-relaxed text-muted" data-reveal>
              Estimasi CO2e memakai satu faktor saja: {formatNumber(CO2E_FACTOR_PER_KG, 1)} kg CO2e
              per kg sampah.
            </p>
          </div>

          <div data-reveal>
            <div className="relative aspect-[4/5] overflow-hidden rounded-card">
              <Image
                src="/images/photos/sempervivum-montanum-close-up.jpg"
                alt="Daun hijau rapat dari tanaman sukulen, tumbuh melekat di tanah."
                fill
                sizes="(min-width: 1024px) 46vw, 100vw"
                className="animate-slow-zoom object-cover"
              />
            </div>
            <p className="mt-3 text-small text-muted">
              Daun, bukan sampah: bagian yang paling sering dilupakan dari kata daur ulang.
            </p>
          </div>
        </div>
      </section>

      {/* Bab 3 - dua modul pada skala poster */}
      <section className="field bg-mint-deep" aria-labelledby="modul">
        <Image
          src="/images/leaf-sprig.svg"
          alt=""
          width={220}
          height={320}
          className="animate-drift pointer-events-none absolute -bottom-8 -left-8 w-[160px] opacity-20 sm:w-[200px]"
          style={{ animationDelay: "-3s" }}
        />
        <div className="page-x py-16 sm:py-20">
          <h2 id="modul" className="text-chapter max-w-[18ch] font-extrabold text-ink" data-reveal>
            Dua modul, satu saldo
          </h2>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-soft" data-reveal>
            Poin dari sampah dipakai langsung di kantin. Tidak ada saldo terpisah dan tidak ada
            pencatatan manual.
          </p>

          <article className="mt-14 grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div className="order-2 lg:order-1" data-reveal>
              <h3 className="text-item font-extrabold text-ink">Bank Sampah berbasis poin</h3>
              <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink-soft">
                Siswa menyetorkan sampah yang sudah dipilah, petugas menimbangnya, lalu saldo poin
                dan total kilogram tercatat otomatis. Tidak ada buku catatan dan tidak ada rekap
                ulang.
              </p>

              <dl className="mt-8 space-y-3.5">
                {wasteTypes.map((type, index) => (
                  <div
                    key={type.code}
                    className="flex items-baseline justify-between gap-6" data-reveal
                  >
                    <dt className="text-[17px] text-ink-soft">{type.label}</dt>
                    <dd className="tnum text-[17px] font-bold text-eco-700">
                      {formatNumber(type.points_per_kg)} poin / {type.unit_label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="order-1 mx-auto w-full max-w-md lg:order-2 lg:max-w-none" data-reveal>
              <div className="rounded-full bg-eco-100/70 p-6 sm:p-10">
                <Image
                  src="/images/waste-bank.svg"
                  alt=""
                  width={560}
                  height={600}
                  className="mx-auto w-full max-w-[380px]"
                />
              </div>
            </div>
          </article>

          <div className="mt-14 grid gap-8 sm:grid-cols-2" data-reveal>
            <figure>
              <div className="relative aspect-[3/2] overflow-hidden rounded-card">
                <Image
                  src="/images/photos/waste-plastic-bottles.jpg"
                  alt="Pekerja mengangkat karung berisi botol plastik bekas ke atas truk pengangkut."
                  fill
                  sizes="(min-width: 640px) 46vw, 100vw"
                  className="animate-slow-zoom object-cover"
                />
              </div>
              <figcaption className="mt-3 text-small text-muted">
                Botol plastik hampir selalu jadi setoran terbanyak. Bilas dulu, lepas tutupnya.
              </figcaption>
            </figure>
            <figure>
              <div className="relative aspect-[3/2] overflow-hidden rounded-card">
                <Image
                  src="/images/photos/57-cardboard-waste-pile-for-recycling-collection.jpg"
                  alt="Tumpukan kardus bekas yang dilipat rata, siap disetor."
                  fill
                  sizes="(min-width: 640px) 46vw, 100vw"
                  className="animate-slow-zoom object-cover"
                />
              </div>
              <figcaption className="mt-3 text-small text-muted">
                Kardus dilipat dulu supaya satu setoran bisa membawa lebih banyak berat.
              </figcaption>
            </figure>
          </div>

          <article className="mt-16 grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <div className="mx-auto w-full max-w-md lg:max-w-none" data-reveal>
              <div className="rounded-full bg-white p-6 sm:p-10">
                <Image
                  src="/images/canteen-bowl.svg"
                  alt=""
                  width={480}
                  height={480}
                  className="mx-auto w-full max-w-[360px]"
                />
              </div>
            </div>

            <div data-reveal>
              <h3 className="text-item font-extrabold text-ink">Pre-Order Kantin Pintar</h3>
              <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink-soft">
                Pesanan dibuat sebelum istirahat dan dipisah per slot pengambilan, supaya tidak
                menumpuk di satu jam istirahat. Penjual menyiapkan sesuai urutan, siswa tinggal
                mengambil.
              </p>

              {featured ? (
                <div className="mt-8 rounded-card bg-white px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[17px] font-bold text-ink">{featured.name}</p>
                      <p className="mt-1 text-small text-muted">Contoh menu yang sedang dijual</p>
                    </div>
                    <div className="text-right">
                      <p className="tnum text-[17px] font-bold text-ink">
                        {formatRupiah(featured.price_idr)}
                      </p>
                      <p className="tnum text-small font-semibold text-eco-700">
                        {formatNumber(featured.points_price ?? 0)} poin
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <ul className="mt-8 space-y-4 text-[17px] leading-relaxed text-ink-soft">
                {[
                  "Slot tetap Istirahat 1 dan Istirahat 2, dipilih saat memesan.",
                  "Catatan untuk seluruh pesanan dan untuk tiap item, sampai tanpa sambal.",
                  "Kode booking dipakai penjual untuk memverifikasi sebelum pesanan diserahkan.",
                ].map((point) => (
                  <li key={point} className="flex gap-3.5">
                    <span
                      aria-hidden
                      className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-eco-500"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </section>

      {/* Bab 4 - alat hitung, satu-satunya hal interaktif di halaman ini */}
      <section className="field bg-white" aria-labelledby="hitung">
        <div className="page-x py-16 sm:py-20">
          <h2 id="hitung" className="text-chapter max-w-[22ch] font-extrabold text-ink" data-reveal>
            Hitung sendiri sebelum menyetor
          </h2>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-soft" data-reveal>
            Pilih jenis sampah dan beratnya. Tarif, voucher, dan harga menu di bawah ini dibaca
            langsung dari data kantin yang sedang berjalan.
          </p>

          <div className="mt-12" data-reveal>
            <PointSimulator
              wasteTypes={wasteTypes}
              voucherTiers={voucherTiers}
              menuItems={menuItems}
            />
          </div>
        </div>
      </section>

      {/* Bab 5 - cara kerja, sebagai daftar bertipe besar, bukan kartu kembar */}
      <section className="field bg-eco-50" aria-labelledby="cara-kerja">
        <div className="page-x grid gap-12 py-16 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div data-reveal>
            <LoopMotif
              strokeWidth={34}
              className="h-16 w-16 text-eco-600"
            />
            <h2 id="cara-kerja" className="mt-8 text-chapter max-w-[14ch] font-extrabold text-ink">
              Tiga langkah, berulang
            </h2>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">
              Alurnya sama setiap minggu, dan berputar kembali: sampah keluar dari kelas, poin masuk
              ke akun, makanan kembali ke meja.
            </p>
          </div>

          <ol className="space-y-10">
            {STEPS.map((step, index) => (
              <li key={step.title} className="grid gap-2 sm:grid-cols-[auto_1fr] sm:gap-8" data-reveal>
                <span className="tnum text-[26px] font-extrabold leading-none text-eco-300">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-item font-bold text-ink">{step.title}</h3>
                  <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-ink-soft">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Bab 6 - klasemen, bidang gelap lagi */}
      <section className="field on-field bg-eco-900 text-white" aria-labelledby="klasemen">
        <Image
          src="/images/leaf-sprig.svg"
          alt=""
          width={220}
          height={320}
          className="animate-drift pointer-events-none absolute -top-8 right-0 w-[140px] opacity-20 sm:w-[180px] lg:right-6"
          style={{ animationDelay: "-6s" }}
        />
        <div className="page-x py-16 sm:py-20">
          <h2 id="klasemen" className="text-chapter max-w-[16ch] font-extrabold" data-reveal>
            Setiap kilogram dihitung
          </h2>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/75" data-reveal>
            Klasemen diurutkan dari total kilogram yang sudah diverifikasi, jadi satu kelas bisa
            disalip dengan setoran yang lebih berat, bukan dengan jumlah setoran yang lebih banyak.
          </p>

          {top.length === 0 ? (
            <p className="mt-12 max-w-xl text-[17px] leading-relaxed text-white/80" data-reveal>
              Belum ada setoran yang tercatat. Klasemen akan terisi begitu petugas memverifikasi
              setoran pertama.
            </p>
          ) : (
            <ol className="mt-12 space-y-8">
              {top.map((row, index) => (
                <li
                  key={row.class_name}
                  className="flex items-center gap-5 sm:gap-8" data-reveal
                >
                  <span className="tnum w-7 shrink-0 text-[26px] font-extrabold leading-none text-white/45">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-bold text-white">
                      {row.class_name}
                    </span>
                    <span className="tnum mt-1 block text-small text-white/60">
                      {formatNumber(row.students)} siswa, {formatNumber(row.total_points)} poin
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-item font-extrabold text-white">
                    {formatKg(row.total_kg)}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <Link
            href={ROUTE.leaderboard}
            className="mt-12 inline-flex h-11 items-center gap-2 text-[17px] font-semibold text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white"
          >
            Lihat semua kelas
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      {/* Bab 7 - satu kata adalah tombolnya */}
      <section className="field on-field bg-eco-600 text-white">
        <Link
          href={ROUTE.register}
          aria-label="Daftar akun siswa SKAMUDA EcoHub"
          className="page-x group block py-16 text-center transition-colors hover:bg-eco-700 sm:py-20"
        >
          <span className="block text-[17px] font-semibold text-white/85" data-reveal>
            Gratis untuk siswa SMKN 1 Murung Pudak. Cukup satu email.
          </span>
          <span
            className="mt-4 block text-[clamp(3.5rem,14vw,11rem)] font-extrabold leading-[0.9] tracking-[-0.04em]" data-reveal
          >
            Daftar
            <ArrowRight
              aria-hidden
              className="ml-3 inline-block h-[0.62em] w-[0.62em] transition-transform group-hover:translate-x-2"
            />
          </span>
        </Link>
      </section>

      <PublicFooter />
    </RevealScope>
  );
}
