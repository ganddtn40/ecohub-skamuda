export type UserRole = "student" | "waste_officer" | "canteen_vendor";

export type OrderStatus =
  | "awaiting_approval"
  | "processing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "unclaimed"
  /**
   * Pensiunan. Nilainya masih ada di tipe enum Postgres dan masih dibaca untuk
   * pesanan lama, tetapi tidak pernah dibuat lagi sejak migrasi 002. Dibiarkan
   * ada supaya pesanan warisan tetap bisa dirender.
   */
  | "pending";

/** Cara pesanan dibayar: tunai di kantin, atau lunas penuh dengan poin. */
export type OrderPaymentMode = "cash" | "points";

export interface Profile {
  id: string;
  full_name: string;
  class_name: string | null;
  role: UserRole;
  points_balance: number;
  total_recycled_kg: number;
  qr_code_token: string;
  /** Jumlah pelanggaran "tidak diambil" berjalan. Pelanggaran ke-2 memicu blokir. */
  unclaimed_orders_count: number;
  /** Batas akhir blokir pre-order. Null berarti tidak sedang diblokir. */
  preorder_blocked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolClass {
  name: string;
  grade: "X" | "XI" | "XII";
  jurusan: string;
  rombel: number;
}

export interface WasteItemType {
  code: string;
  label: string;
  unit_label: string;
  points_per_kg: number;
  is_active: boolean;
}

export interface VoucherTier {
  points_cost: number;
  discount_idr: number;
  label: string;
  is_active: boolean;
}

export interface CanteenStand {
  id: string;
  vendor_id: string;
  stand_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  stand_id: string;
  name: string;
  price_idr: number;
  points_price: number | null;
  category: string;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
}

export interface WasteDeposit {
  id: string;
  student_id: string;
  officer_id: string | null;
  item_type: string;
  quantity: number;
  weight_kg: number;
  points_earned: number;
  created_at: string;
}

export interface Voucher {
  id: string;
  student_id: string;
  discount_amount: number;
  points_spent: number;
  is_used: boolean;
  code: string;
  created_at: string;
  used_at: string | null;
  /** Pesanan yang memakai voucher ini, supaya pengembaliannya bisa dilacak. */
  order_id: string | null;
  /** Diisi saat poin voucher dikembalikan ke siswa. */
  refunded_at: string | null;
}

export interface Order {
  id: string;
  student_id: string;
  stand_id: string;
  booking_code: string;
  pickup_time_slot: string;
  total_price: number;
  discount_applied: number;
  status: OrderStatus;
  notes: string | null;
  payment_mode: OrderPaymentMode;
  /**
   * Poin yang didebit saat checkout. Untuk mode cash berisi biaya voucher,
   * untuk mode points berisi harga penuh. Karena itu pengembaliannya selalu
   * sebesar kolom ini, tanpa perlu bercabang per mode.
   */
  points_paid: number;
  /** Poin yang sudah dikembalikan ke siswa. */
  points_refunded: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  item_notes: string | null;
}

/** Baris pesanan + relasi, dipakai dashboard kantin. */
export interface OrderWithRelations extends Order {
  profiles: Pick<Profile, "full_name" | "class_name"> | null;
  order_items: Array<OrderItem & { menu_items: Pick<MenuItem, "name"> | null }>;
  canteen_stands: Pick<CanteenStand, "stand_name"> | null;
}

/** Setoran + relasi, dipakai tabel riwayat petugas. */
export interface DepositWithStudent extends WasteDeposit {
  profiles: Pick<Profile, "full_name" | "class_name"> | null;
}

export interface ClassLeaderboardRow {
  class_name: string;
  grade: string;
  jurusan: string;
  students: number;
  total_kg: number;
  total_points: number;
}

export interface ImpactStats {
  total_kg: number;
  total_points: number;
  students: number;
  deposits: number;
  co2e_kg: number;
}

/** Satu baris item di dalam tiket booking. */
export interface TicketItem {
  name: string;
  quantity: number;
  unit_price: number;
  item_notes: string | null;
}

/** Data lengkap yang ditampilkan pada Tiket Booking (QR + ringkasan). */
export interface TicketData {
  booking_code: string;
  pickup_time_slot: string;
  status: OrderStatus;
  total_price: number;
  discount_applied: number;
  payment_mode: OrderPaymentMode;
  /** Poin yang benar-benar dipotong. Nol untuk pesanan tunai. */
  points_paid: number;
  notes: string | null;
  stand_name: string | null;
  created_at?: string;
  items: TicketItem[];
}

/** Hasil RPC get_preorder_status(): keadaan pre-order satu siswa. */
export interface PreorderStatus {
  is_blocked: boolean;
  blocked_until: string | null;
  unclaimed_count: number;
  active_order_id: string | null;
  active_order_status: OrderStatus | null;
  active_booking_code: string | null;
}
