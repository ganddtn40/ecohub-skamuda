/**
 * Menentukan item nav mana yang menyala untuk sebuah rute.
 *
 * Satu rute turunan cocok dengan dua item sekaligus: `/siswa/qr` cocok dengan
 * `/siswa` sebagai induknya DAN dengan `/siswa/qr` sendiri. Kalau keduanya
 * dinyalakan, dua pil putih muncul bersamaan di header - persis yang terlihat
 * pada tangkapan layar di halaman QR. Karena itu pemenangnya ditentukan lebih
 * dulu: item dengan awalan terpanjang.
 *
 * Dipakai `AppHeader` dan `BottomNav` supaya nav desktop dan nav bawah tidak
 * pernah berbeda aturan. `hrefs` biasanya `NAV_BY_ROLE[role].map((item) =>
 * item.href)`, tapi fungsi ini sengaja tidak mengimpornya agar bisa diperiksa
 * langsung oleh Node tanpa perkakas tambahan.
 */
export function activeNavHref(pathname: string, hrefs: readonly string[]): string | null {
  let active: string | null = null;

  for (const href of hrefs) {
    // Batasnya garis miring, bukan sekadar awalan teks: `/siswa/qrcode` bukan
    // bagian dari `/siswa/qr`.
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (active === null || href.length > active.length)) {
      active = href;
    }
  }

  return active;
}
