import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresher } from "@/components/realtime/RealtimeRefresher";
import { PageTitle } from "@/components/layout/PageTitle";
import { MenuManager } from "@/components/vendor/MenuManager";
import type { MenuItem } from "@/types/database";

export const metadata = { title: "Kelola Menu" };
export const revalidate = 0;

export default async function VendorMenuPage() {
  const { profile } = await requireRole(["canteen_vendor"]);
  const supabase = await createClient();

  const { data: stands } = await supabase
    .from("canteen_stands")
    .select("id, stand_name")
    .eq("vendor_id", profile.id)
    .order("stand_name", { ascending: true });

  const standIds = (stands ?? []).map((stand) => stand.id as string);

  let items: MenuItem[] = [];
  if (standIds.length > 0) {
    const { data } = await supabase
      .from("menu_items")
      .select("id, stand_id, name, price_idr, points_price, category, image_url, is_available, created_at")
      .in("stand_id", standIds)
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    items = (data ?? []) as MenuItem[];
  }

  return (
    <div>
      <RealtimeRefresher
        channelName={`vendor-menu-${profile.id}`}
        subscriptions={[{ table: "menu_items" }]}
      />

      <PageTitle
        title="Kelola Menu"
        description="Atur daftar menu, harga, dan ketersediaan. Perubahan langsung terlihat oleh siswa."
      />

      <div className="mt-5">
        <MenuManager
          stands={(stands ?? []) as Array<{ id: string; stand_name: string }>}
          items={items}
        />
      </div>
    </div>
  );
}
