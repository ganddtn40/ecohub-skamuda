"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      aria-label="Keluar dari akun"
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-control px-3 text-sm font-semibold text-white/90",
        "transition-colors hover:bg-white/15 disabled:opacity-60",
        className,
      )}
    >
      <LogOut size={18} />
      <span className="hidden sm:inline">Keluar</span>
    </button>
  );
}
