import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/layout/PageTitle";
import { MenuCatalog } from "@/components/student/MenuCatalog";
import type { CanteenStand, MenuItem, VoucherTier } from "@/types/database";

export const metadata = { title: "Kantin" };
export const revalidate = 0;

export default async function StudentCanteenPage() {
  const { profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const [standsRes, menuRes, tiersRes] = await Promise.all([
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
  ]);

  return (
    <div>
      <PageTitle
        title="Pre-Order Kantin"
        description="Pilih stand, susun pesanan, lalu tentukan slot pengambilan. Poin bisa langsung ditukar jadi potongan harga."
      />

      <div className="mt-5">
        <MenuCatalog
          stands={(standsRes.data ?? []) as CanteenStand[]}
          menuItems={(menuRes.data ?? []) as MenuItem[]}
          tiers={(tiersRes.data ?? []) as VoucherTier[]}
          pointsBalance={profile.points_balance}
        />
      </div>
    </div>
  );
}
