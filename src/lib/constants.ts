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
  pending: { label: "Menunggu", hint: "Pesanan baru masuk, belum diproses." },
  processing: { label: "Disiapkan", hint: "Sedang disiapkan oleh penjual." },
  ready_for_pickup: { label: "Siap Diambil", hint: "Sudah siap, silakan ambil di stand." },
  completed: { label: "Selesai", hint: "Pesanan sudah diambil siswa." },
  cancelled: { label: "Dibatalkan", hint: "Pesanan dibatalkan." },
};

/** Urutan transisi status pada papan kelola kantin. */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "processing",
  "ready_for_pickup",
  "completed",
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
  pending: "amber",
  processing: "blue",
  ready_for_pickup: "green",
  completed: "neutral",
  cancelled: "red",
};
