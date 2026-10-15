const TZ = "Asia/Makassar";

export function formatRupiah(value: number): string {
  return "Rp" + new Intl.NumberFormat("id-ID").format(Math.round(value));
}

export function formatNumber(value: number, maxFraction = 0): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: maxFraction,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatKg(value: number): string {
  return `${formatNumber(value, 2)} kg`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TZ,
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: TZ,
  }).format(new Date(iso));
}

export function isSameDayInTZ(iso: string, reference = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
  return fmt.format(new Date(iso)) === fmt.format(reference);
}

/** Inisial nama untuk avatar berbasis teks (tanpa foto/gambar orang). */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/**
 * Awal hari ini (00:00) di zona Asia/Makassar, dalam format ISO UTC.
 * Makassar memakai WITA (UTC+8) tanpa daylight saving.
 */
export function todayStartISO(): string {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${ymd}T00:00:00+08:00`).toISOString();
}
