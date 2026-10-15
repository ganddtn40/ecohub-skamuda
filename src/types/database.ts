export type UserRole = "student" | "waste_officer" | "canteen_vendor";

export type OrderStatus =
  | "pending"
  | "processing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  class_name: string | null;
  role: UserRole;
  points_balance: number;
  total_recycled_kg: number;
  qr_code_token: string;
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
  notes: string | null;
  stand_name: string | null;
  created_at?: string;
  items: TicketItem[];
}
