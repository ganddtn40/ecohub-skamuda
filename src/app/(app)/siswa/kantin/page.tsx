import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresher } from "@/components/realtime/RealtimeRefresher";
import { PageTitle } from "@/components/layout/PageTitle";
import { MenuCatalog } from "@/components/student/MenuCatalog";
import { PreorderGate } from "@/components/student/PreorderGate";
import { unwrap } from "@/lib/query";
import type {
  CanteenStand,
  MenuItem,
  OrderStatus,
  PreorderStatus,
  TicketData,
  VoucherTier,
} from "@/types/database";

export const metadata = { title: "Kantin" };
export const revalidate = 0;

interface RawActiveOrder {
  booking_code: string;
  status: OrderStatus;
  pickup_time_slot: string;
  total_price: number;
  discount_applied: number;
  payment_mode: TicketData["payment_mode"];
  points_paid: number;
  notes: string | null;
  canteen_stands: { stand_name: string } | null;
  order_items: Array<{
    quantity: number;
    unit_price: number;
    item_notes: string | null;
    menu_items: { name: string } | null;
  }> | null;
}

export default async function StudentCanteenPage() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const [standsRes, menuRes, tiersRes, statusRes] = await Promise.all([
    supabase
      .from("canteen_stands")
      .select("id, vendor_id, stand_name, description, is_active, created_at")
      .eq("is_active", true)
      .order("stand_name", { ascending: true }),
    supabase
      .from("menu_items")
      .select("id, stand_id, name, price_idr, points_price, category, image_url, is_available, created_at")
      .eq("is_available", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("voucher_tiers")
      .select("points_cost, discount_idr, label, is_active")
      .eq("is_active", true)
      .order("points_cost", { ascending: true }),
    supabase.rpc("get_preorder_status"),
  ]);

  const stands = unwrap(standsRes) as CanteenStand[];
  const menuItems = unwrap(menuRes) as MenuItem[];
  const tiers = unwrap(tiersRes) as VoucherTier[];
  const status = unwrap(statusRes) as PreorderStatus;

  // Pesanan aktif diambil terpisah dari Promise.all di atas: id-nya baru
  // diketahui setelah RPC-nya selesai. RLS mengizinkan siswa membaca pesanannya
  // sendiri, jadi tidak perlu fungsi tambahan.
  let activeOrder: TicketData | null = null;
  if (status.active_order_id) {
    const { data } = await supabase
      .from("orders")
      .select(
        "booking_code, status, pickup_time_slot, total_price, discount_applied, payment_mode, points_paid, notes, canteen_stands(stand_name), order_items(quantity, unit_price, item_notes, menu_items(name))",
      )
      .eq("id", status.active_order_id)
      .maybeSingle();

    if (data) {
      const row = data as unknown as RawActiveOrder;
      activeOrder = {
        booking_code: row.booking_code,
        pickup_time_slot: row.pickup_time_slot,
        status: row.status,
        total_price: row.total_price,
        discount_applied: row.discount_applied,
        payment_mode: row.payment_mode,
        points_paid: row.points_paid,
        notes: row.notes,
        stand_name: row.canteen_stands?.stand_name ?? null,
        items: (row.order_items ?? []).map((item) => ({
          name: item.menu_items?.name ?? "Menu",
          quantity: item.quantity,
          unit_price: item.unit_price,
          item_notes: item.item_notes,
        })),
      };
    }
  }

  return (
    <div>
      {/* Halaman ini server-rendered dan blokirnya berakhir sendiri; tanpa
          langganan ini, siswa yang sedang membuka halaman tetap melihat dirinya
          diblokir sampai ia memuat ulang sendiri. */}
      <RealtimeRefresher
        channelName={`student-canteen-${profile.id}`}
        subscriptions={[
          { table: "profiles", filter: `id=eq.${profile.id}` },
          { table: "orders", filter: `student_id=eq.${profile.id}` },
        ]}
      />

      <PageTitle
        title="Pre-Order Kantin"
        description="Pilih stand, susun pesanan, lalu tentukan slot pengambilan. Poin bisa langsung ditukar jadi potongan harga."
      />

      <div className="mt-5">
        <PreorderGate status={status} activeOrder={activeOrder}>
          <MenuCatalog
            stands={stands}
            menuItems={menuItems}
            tiers={tiers}
            pointsBalance={profile.points_balance}
          />
        </PreorderGate>
      </div>
    </div>
  );
}
