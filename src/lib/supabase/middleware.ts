import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { PUBLIC_PATHS, ROLE_HOME } from "@/lib/constants";
import type { UserRole } from "@/types/database";

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Menyegarkan session Supabase dan menegakkan guard rute.
 * - Belum login + akses rute terlindungi  -> /login?next=...
 * - Sudah login + buka /login atau /register -> dashboard sesuai role
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    if (!isPublic(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Sudah login: cegah membuka halaman auth, arahkan ke dashboard peran.
  //
  // Daftarnya sengaja persis dua rute ini. `/lupa-password` tidak ikut karena
  // siswa yang sudah masuk tetap boleh minta tautan reset. Dan `/reset-password`
  // justru harus tidak ikut: pengguna yang baru mengeklik tautan reset sedang
  // memegang sesi recovery yang sah, dan kalau dilempar ke dashboard di sini ia
  // tidak akan pernah sampai ke halaman ganti sandinya.
  if (pathname === "/login" || pathname === "/register") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[(profile?.role as UserRole) ?? "student"] ?? "/siswa";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
