import { requireRole } from "@/lib/auth";
import { PageTitle } from "@/components/layout/PageTitle";
import { QrPass } from "@/components/student/QrPass";

export const metadata = { title: "QR Saya" };

export default async function StudentQrPage() {
  const { profile } = await requireRole(["student"]);

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle
        title="QR Saya"
        description="QR ini mewakili identitasmu di Bank Sampah. Petugas akan memindainya setiap kali kamu menyetor sampah."
      />

      <div className="mt-5">
        <QrPass
          token={profile.qr_code_token}
          fullName={profile.full_name}
          className={profile.class_name}
        />
      </div>
    </div>
  );
}
