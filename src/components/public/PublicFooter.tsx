import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { ROUTE } from "@/lib/constants";

const PLACES = [
  { label: "Papan Skor", href: ROUTE.leaderboard },
  { label: "Modul", href: "/#modul" },
  { label: "Cara kerja", href: "/#cara-kerja" },
  { label: "Masuk", href: ROUTE.login },
  { label: "Daftar", href: ROUTE.register },
];

/**
 * Foto yang benar-benar dipakai di situs ini, lengkap dengan pemilik karya dan
 * lisensinya. Semuanya dari koleksi terbuka Wikimedia Commons.
 */
const PHOTO_CREDITS = [
  {
    who: "Lanrupacoco",
    what: "Botol plastik bekas",
    licence: "CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:Waste_Plastic_Bottles.jpg",
    licenceHref: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  {
    who: "Marek Ślusarczyk",
    what: "Kardus bekas",
    licence: "CC BY 3.0",
    href: "https://commons.wikimedia.org/wiki/File:57_Cardboard_waste_pile_for_recycling_collection_in_Kuala_Lumpur,_Malaysia_-_Creative_Commons_Attribution.jpg",
    licenceHref: "https://creativecommons.org/licenses/by/3.0",
  },
  {
    who: "Mister rf",
    what: "Daun hijau",
    licence: "CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:Sempervivum_montanum_-_close_up.jpg",
    licenceHref: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  {
    who: "Radulf del Maresme",
    what: "Kaleng aluminium",
    licence: "CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:Cans_recycling.jpg",
    licenceHref: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  {
    who: "Piotrus",
    what: "Botol kaca",
    licence: "CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:Soju_bottles_in_a_glass_recycling_bin,_near_apartment_complex,_in_Korea.jpg",
    licenceHref: "https://creativecommons.org/licenses/by-sa/4.0",
  },
];

/**
 * Kaki halaman: nama dulu, baru tempat-tempat di dalam produk, lalu baris
 * kredit untuk foto koleksi terbuka yang benar-benar dipakai.
 */
export function PublicFooter() {
  return (
    <footer className="field on-field bg-eco-900 text-white">
      <div className="page-x py-14 sm:py-16">
        <div className="reveal">
          <BrandMark tone="light" />
        </div>

        <nav aria-label="Tautan kaki halaman" className="reveal mt-8" data-i="1">
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {PLACES.map((place) => (
              <li key={place.label}>
                <Link
                  href={place.href}
                  className="inline-flex h-11 items-center text-[15px] font-semibold text-white/80 transition-colors hover:text-white"
                >
                  {place.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="reveal mt-12" data-i="2">
          <p className="text-small text-white/80">
            Ekosistem digital SMKN 1 Murung Pudak, Kabupaten Tabalong, Kalimantan Selatan.
          </p>

          <p className="mt-6 max-w-3xl text-small font-semibold text-white/80">
            Foto koleksi terbuka
          </p>
          <ul className="mt-3 flex max-w-3xl flex-wrap gap-x-6 gap-y-2">
            {PHOTO_CREDITS.map((item) => (
              <li key={item.who} className="text-small text-white/70">
                <a
                  href={item.href}
                  className="font-semibold text-white/85 underline decoration-white/25 underline-offset-2 transition-colors hover:text-white"
                >
                  {item.what}
                </a>{" "}
                oleh {item.who},{" "}
                <a
                  href={item.licenceHref}
                  className="underline decoration-white/25 underline-offset-2 transition-colors hover:text-white"
                >
                  {item.licence}
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-4 max-w-3xl text-small text-white/70">
            Ilustrasi bank sampah, mangkuk kantin, dan motif daur ulang digambar khusus untuk
            situs ini.
          </p>
        </div>
      </div>
    </footer>
  );
}
