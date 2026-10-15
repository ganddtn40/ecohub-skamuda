import { requireProfile } from "@/lib/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { ROLE_LABEL } from "@/lib/constants";

/**
 * Shell untuk semua dashboard yang terlindungi.
 * Guard utama ada di middleware; requireProfile() di sini memastikan profil
 * benar-benar ada sebelum render.
 *
 * Catatan: kirim `role` (string, serializable) saja, bukan objek nav berisi
 * komponen ikon. Server Component tidak boleh mengirim fungsi ke Client
 * Component; masing-masing nav meresolve ikonnya sendiri dari NAV_BY_ROLE.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();

  return (
    <div className="flex min-h-dvh flex-col bg-mint">
      <AppHeader
        role={profile.role}
        fullName={profile.full_name}
        roleLabel={ROLE_LABEL[profile.role]}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-28 pt-5 sm:px-8 md:pb-14">
        {children}
      </main>
      <BottomNav role={profile.role} />
    </div>
  );
}
