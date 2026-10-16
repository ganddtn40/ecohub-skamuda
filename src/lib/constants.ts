import type { OrderStatus, UserRole } from "@/types/database";

/** 6 jurusan resmi SMKN 1 Murung Pudak. */
export const JURUSAN = ["TKJ", "TKR", "MAPER", "HOTEL", "ASKEP", "FARMASI"] as const;

export const GRADES = ["X", "XI", "XII"] as const;

/** Slot jam istirahat untuk pengambilan pesanan kantin. */
export const PICKUP_SLOTS = ["Istirahat 1", "Istirahat 2"] as const;
export type PickupSlot = (typeof PICKUP_SLOTS)[number];

export const ROUTE = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/lupa-password",
  resetPassword: "/reset-password",
  checkEmail: "/cek-email",
  leaderboard: "/papan-skor",
  authCallback: "/auth/callback",
  student: "/siswa",
  studentQr: "/siswa/qr",
  studentCanteen: "/siswa/kantin",
  studentOrders: "/siswa/pesanan",
  studentHistory: "/siswa/riwayat",
  officer: "/petugas",
  officerHistory: "/petugas/riwayat",
  vendor: "/kantin",
  vendorScan: "/kantin/scan",
  vendorMenu: "/kantin/menu",
} as const;

/** Rute yang boleh diakses tanpa login. */
export const PUBLIC_PATHS = [
  ROUTE.home,
  ROUTE.login,
  ROUTE.register,
  ROUTE.forgotPassword,
  ROUTE.resetPassword,
  ROUTE.checkEmail,
  ROUTE.leaderboard,
  ROUTE.authCallback,
];

export const ROLE_HOME: Record<UserRole, string> = {
  student: ROUTE.student,
  waste_officer: ROUTE.officer,
  canteen_vendor: ROUTE.vendor,
};

export const ROLE_LABEL: Record<UserRole, string> = {
  student: "Siswa",
  waste_officer: "Petugas Bank Sampah",
  canteen_vendor: "Penjual Kantin",
};

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; hint: string }> = {
  awaiting_approval: {
    label: "Menunggu Diterima",
    hint: "Pesanan baru masuk, menunggu penjual menerima.",
  },
  processing: { label: "Disiapkan", hint: "Sedang disiapkan oleh penjual." },
  ready_for_pickup: { label: "Siap Diambil", hint: "Sudah siap, silakan ambil di stand." },
  completed: { label: "Selesai", hint: "Pesanan sudah diambil siswa." },
  cancelled: { label: "Ditolak", hint: "Pesanan ditolak penjual. Poinmu sudah dikembalikan." },
  unclaimed: {
    label: "Tidak Diambil",
    hint: "Pesanan tidak diambil sampai batas waktu.",
  },
  // Pensiunan: hanya muncul pada pesanan lama sebelum migrasi 002.
  pending: { label: "Menunggu", hint: "Pesanan baru masuk, belum diproses." },
};

/** Urutan transisi status pada papan kelola kantin. */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "awaiting_approval",
  "processing",
  "ready_for_pickup",
  "completed",
];

/**
 * Status yang berarti pesanan masih berjalan — belum selesai dan belum ditolak.
 *
 * Dipakai bersama oleh papan penjual dan daftar pesanan siswa supaya keduanya
 * tidak pernah berbeda pendapat soal pesanan mana yang masih berjalan. Dulu
 * masing-masing punya daftarnya sendiri, dan daftar milik siswa tertinggal saat
 * `awaiting_approval` ditambahkan ke enum: pesanan yang baru masuk hilang dari
 * tab "Aktif" justru di halaman yang paling butuh menampilkannya.
 *
 * `pending` ikut terdaftar karena itu nilai enum lama; sejak migrasi 003 tidak
 * ada pesanan baru yang lahir dengan status itu.
 */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "awaiting_approval",
  "pending",
  "processing",
  "ready_for_pickup",
];

/** Target daur ulang harian per siswa (kg) untuk circular progress di dashboard. */
export const DAILY_RECYCLE_TARGET_KG = 1;

/** Faktor estimasi emisi (kg CO2e per kg material campuran didaur ulang). */
export const CO2E_FACTOR_PER_KG = 2.5;

/** Warna badge untuk tiap status pesanan. */
export const STATUS_TONE: Record<
  OrderStatus,
  "neutral" | "green" | "amber" | "red" | "blue"
> = {
  awaiting_approval: "amber",
  processing: "blue",
  ready_for_pickup: "green",
  completed: "neutral",
  cancelled: "red",
  unclaimed: "red",
  pending: "amber",
};
