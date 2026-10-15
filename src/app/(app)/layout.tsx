import { requireProfile } from "@/lib/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { NAV_BY_ROLE } from "@/components/layout/nav";
import { ROLE_LABEL } from "@/lib/constants";

/**
 * Shell untuk semua dashboard yang terlindungi.
 * Guard utama ada di middleware; requireProfile() di sini memastikan profil
 * benar-benar ada sebelum render.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  const nav = NAV_BY_ROLE[profile.role];

  return (
    <div className="flex min-h-dvh flex-col bg-mint">
      <AppHeader
        nav={nav}
        fullName={profile.full_name}
        roleLabel={ROLE_LABEL[profile.role]}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-14">
        {children}
      </main>
      <BottomNav nav={nav} />
    </div>
  );
}
