import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresher } from "@/components/realtime/RealtimeRefresher";
import { PageTitle } from "@/components/layout/PageTitle";
import { StudentOrderList, type StudentOrder } from "@/components/student/StudentOrderList";
import type { OrderStatus } from "@/types/database";

export const metadata = { title: "Pesanan Saya" };
export const revalidate = 0;

interface RawOrderItem {
  quantity: number;
  unit_price: number;
  item_notes: string | null;
  menu_items: { name: string } | null;
}

interface RawOrder {
  id: string;
  booking_code: string;
  status: OrderStatus;
  pickup_time_slot: string;
  total_price: number;
  discount_applied: number;
  notes: string | null;
  created_at: string;
  canteen_stands: { stand_name: string } | null;
  order_items: RawOrderItem[] | null;
}

export default async function StudentOrdersPage() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(
      "id, booking_code, status, pickup_time_slot, total_price, discount_applied, notes, created_at, canteen_stands(stand_name), order_items(quantity, unit_price, item_notes, menu_items(name))",
    )
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(40);

  const orders: StudentOrder[] = ((data ?? []) as unknown as RawOrder[]).map((order) => ({
    id: order.id,
    booking_code: order.booking_code,
    pickup_time_slot: order.pickup_time_slot,
    status: order.status,
    total_price: order.total_price,
    discount_applied: order.discount_applied,
    notes: order.notes,
    stand_name: order.canteen_stands?.stand_name ?? null,
    created_at: order.created_at,
    items: (order.order_items ?? []).map((item) => ({
      name: item.menu_items?.name ?? "Menu",
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_notes: item.item_notes,
    })),
  }));

  return (
    <div>
      <RealtimeRefresher
        channelName={`student-orders-${profile.id}`}
        subscriptions={[{ table: "orders", filter: `student_id=eq.${profile.id}` }]}
      />

      <PageTitle
        title="Pesanan Saya"
        description="Semua tiket booking kantinmu ada di sini. Status diperbarui otomatis saat penjual memproses pesanan."
      />

      <div className="mt-5">
        <StudentOrderList orders={orders} />
      </div>
    </div>
  );
}
