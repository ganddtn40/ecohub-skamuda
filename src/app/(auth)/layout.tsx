import Link from "next/link";
import Image from "next/image";
import { BrandMark } from "@/components/layout/BrandMark";
import { LoopMotif } from "@/components/art/LoopMotif";
import { ROUTE } from "@/lib/constants";

/**
 * Tiga material yang paling sering ditimbang di Bank Sampah sekolah. Dipakai
 * sebagai penutup halaman supaya orang tahu apa yang sedang mereka masuki.
 */
const MATERIALS = [
  {
    src: "/images/photos/cans-recycling.jpg",
    alt: "Kaleng aluminium bekas yang dikumpulkan untuk didaur ulang.",
  },
  {
    src: "/images/photos/waste-plastic-bottles.jpg",
    alt: "Pekerja mengangkat karung berisi botol plastik bekas ke atas truk pengangkut.",
  },
  {
    src: "/images/photos/soju-bottles-in-a-glass-recycling-bin.jpg",
    alt: "Botol-botol kaca di dalam wadah pengumpulan kaca.",
  },
];

/**
 * Rangka halaman autentikasi: kolom kerja di kiri (kepala gelap, lembar form,
 * kaki), dan kolom foto sungguhan di kanan mulai lebar tablet. Di layar sempit
 * kolom foto turun ke bawah sebagai penutup.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-mint md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-h-dvh flex-col">
        <header className="field on-field relative overflow-hidden bg-eco-900 text-white">
          <LoopMotif className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 text-eco-600/25" />
          <div className="page-x relative mx-auto w-full max-w-lg py-5 md:max-w-none md:px-8 lg:px-12">
            <Link
              href={ROUTE.home}
              aria-label="Kembali ke beranda SKAMUDA EcoHub"
              className="inline-block animate-fade-up"
            >
              <BrandMark tone="light" />
            </Link>
          </div>
        </header>

        <main className="-mt-7 flex min-h-0 flex-1 flex-col overflow-y-auto md:mt-0">
          {/* Pemusatan yang aman terhadap luapan. `justify-center` pada kolom
              flex memotong bagian atas kartu begitu isinya lebih tinggi dari
              layar, dan potongan itu tidak bisa dijangkau gulir. Auto-margin
              pada kartunya memberi hasil yang sama saat memang ada ruang
              kosong, lalu runtuh jadi nol saat tidak ada — dan karena tinggi
              kolomnya mengikuti isi, halaman yang menggulir, bukan kartunya
              yang terpotong.

              Tingginya memakai dvh, bukan vh, supaya ikut menyesuaikan bilah
              peramban HP yang muncul-hilang saat digulir. Keyboard bukan
              urusan tinggi di sini: yang menjaga tombol kirim tetap terlihat
              saat sebuah kolom difokuskan adalah `scroll-mb-32` pada kolom
              isian (lihat `components/ui/Input.tsx`). */}
          <div className="page-x mx-auto my-auto w-full max-w-lg px-4 py-7 md:max-w-none md:px-8 md:py-10 lg:px-12">
            {children}
          </div>
        </main>

        <footer
          className="page-x mx-auto w-full max-w-lg animate-fade-up pb-10 text-small text-muted md:max-w-none md:px-8 md:pb-8 lg:px-12"
          style={{ animationDelay: "300ms" }}
        >
          SKAMUDA EcoHub &middot; SMKN 1 Murung Pudak
        </footer>
      </div>

      <aside className="field on-field relative overflow-hidden bg-eco-900 px-5 pb-10 pt-9 text-white md:flex md:min-h-dvh md:flex-col md:gap-5 md:px-7 md:py-10 lg:px-8">
        <LoopMotif className="pointer-events-none absolute -right-28 -top-32 h-[26rem] w-[26rem] text-eco-600/25 md:h-[30rem] md:w-[30rem] lg:h-[34rem] lg:w-[34rem]" />

        <div className="relative hidden min-h-0 flex-1 overflow-hidden rounded-card md:block">
          <Image
            src="/images/photos/57-cardboard-waste-pile-for-recycling-collection.jpg"
            alt="Tumpukan kardus bekas yang dilipat rata, siap diangkut ke pengepul."
            fill
            sizes="48vw"
            className="animate-slow-zoom object-cover"
          />
          <Image
            src="/images/leaf-sprig.svg"
            alt=""
            width={200}
            height={300}
            className="animate-drift pointer-events-none absolute -left-5 bottom-6 w-[132px] opacity-30"
          />
        </div>

        <p
          className="page-x relative mx-auto mt-0 w-full max-w-lg animate-fade-up text-display font-extrabold md:mx-0 md:max-w-xl md:px-0"
          style={{ animationDelay: "60ms" }}
        >
          Sampah jadi poin.
        </p>

        <p
          className="page-x relative mx-auto mt-4 w-full max-w-lg animate-fade-up text-[17px] leading-relaxed text-white/75 md:mx-0 md:max-w-md md:px-0"
          style={{ animationDelay: "140ms" }}
        >
          Pisahkan dari rumah, timbang di sekolah, lalu tukar jadi makan siang di kantin.
        </p>

        <ul className="page-x relative mx-auto mt-6 grid w-full max-w-lg grid-cols-3 gap-3 sm:gap-4 md:mx-0 md:mt-0 md:max-w-none md:px-0">
          {MATERIALS.map((material, index) => (
            <li
              key={material.src}
              className="relative aspect-[4/3] animate-fade-up overflow-hidden rounded-card"
              style={{ animationDelay: `${220 + index * 90}ms` }}
            >
              <Image
                src={material.src}
                alt={material.alt}
                fill
                sizes="(min-width: 768px) 16vw, 30vw"
                className="animate-slow-zoom object-cover"
                style={{ animationDelay: `${index * -3}s` }}
              />
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
