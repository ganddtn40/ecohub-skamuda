import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/constants";
import type { Profile, UserRole } from "@/types/database";

export interface SessionProfile {
  userId: string;
  email: string | null;
  profile: Profile;
}

const PROFILE_COLUMNS =
  "id, full_name, class_name, role, points_balance, total_recycled_kg, qr_code_token, created_at, updated_at";

/** Ambil user + profile dari session cookie. Null bila belum login / profile hilang. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  return { userId: user.id, email: user.email ?? null, profile: data as unknown as Profile };
}

/** Wajib login. Redirect ke /login bila tidak ada session. */
export async function requireProfile(): Promise<SessionProfile> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  return session;
}

/** Wajib login + role tertentu. Role lain dialihkan ke dashboard miliknya. */
export async function requireRole(roles: UserRole[]): Promise<SessionProfile> {
  const session = await requireProfile();
  if (!roles.includes(session.profile.role)) {
    redirect(ROLE_HOME[session.profile.role]);
  }
  return session;
}
