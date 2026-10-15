import { Store } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresher } from "@/components/realtime/RealtimeRefresher";
import { PageTitle } from "@/components/layout/PageTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderBoard, type VendorOrder } from "@/components/vendor/OrderBoard";
import type { OrderStatus } from "@/types/database";

export const metadata = { title: "Pesanan Masuk" };
export const revalidate = 0;

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
  profiles: { full_name: string; class_name: string | null } | null;
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    item_notes: string | null;
    menu_items: { name: string } | null;
  }> | null;
}

export default async function VendorOrdersPage() {
  const { profile } = await requireRole(["canteen_vendor"]);
  const supabase = await createClient();

  const { data: stands } = await supabase
    .from("canteen_stands")
    .select("id")
    .eq("vendor_id", profile.id);

  const standIds = (stands ?? []).map((stand) => stand.id as string);

  let orders: VendorOrder[] = [];
  if (standIds.length > 0) {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, booking_code, status, pickup_time_slot, total_price, discount_applied, notes, created_at, canteen_stands(stand_name), profiles(full_name, class_name), order_items(id, quantity, unit_price, item_notes, menu_items(name))",
      )
      .in("stand_id", standIds)
      .order("created_at", { ascending: false })
      .limit(120);

    orders = ((data ?? []) as unknown as RawOrder[]).map((order) => ({
      id: order.id,
      booking_code: order.booking_code,
      status: order.status,
      pickup_time_slot: order.pickup_time_slot,
      total_price: order.total_price,
      discount_applied: order.discount_applied,
      notes: order.notes,
      created_at: order.created_at,
      student_name: order.profiles?.full_name ?? null,
      student_class: order.profiles?.class_name ?? null,
      stand_name: order.canteen_stands?.stand_name ?? null,
      items: (order.order_items ?? []).map((item) => ({
        id: item.id,
        name: item.menu_items?.name ?? "Menu",
        quantity: item.quantity,
        unit_price: item.unit_price,
        item_notes: item.item_notes,
      })),
    }));
  }

  return (
    <div>
      <RealtimeRefresher
        channelName={`vendor-orders-${profile.id}`}
        subscriptions={[{ table: "orders" }, { table: "order_items" }]}
      />

      <PageTitle
        title="Pesanan Masuk"
        description="Pesanan baru muncul otomatis tanpa refresh. Kelola statusnya dan baca catatan khusus dari siswa."
      />

      <div className="mt-5">
        {standIds.length === 0 ? (
          <EmptyState
            icon={<Store size={22} />}
            title="Belum ada stand kantin"
            description="Hubungi admin sekolah untuk mendaftarkan stand pada akun kamu sebelum menerima pesanan."
          />
        ) : (
          <OrderBoard orders={orders} />
        )}
      </div>
    </div>
  );
}
