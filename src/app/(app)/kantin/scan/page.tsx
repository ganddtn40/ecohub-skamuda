import { requireRole } from "@/lib/auth";
import { RealtimeRefresher } from "@/components/realtime/RealtimeRefresher";
import { PageTitle } from "@/components/layout/PageTitle";
import { BookingVerifier } from "@/components/vendor/BookingVerifier";

export const metadata = { title: "Pindai Tiket" };
export const revalidate = 0;

export default async function VendorScanPage() {
  const { profile } = await requireRole(["canteen_vendor"]);

  return (
    <div>
      <RealtimeRefresher
        channelName={`vendor-scan-${profile.id}`}
        subscriptions={[{ table: "orders" }]}
      />

      <PageTitle
        title="Verifikasi Tiket Pesanan"
        description="Pindai QR pada tiket siswa atau masukkan kode booking, lalu perbarui status pesanan setelah diserahkan."
      />

      <div className="mt-5">
        <BookingVerifier />
      </div>
    </div>
  );
}
