import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROUTE } from "@/lib/constants";

/**
 * Menangani callback Supabase Auth (konfirmasi email / OAuth).
 * Mendukung PKCE (code) maupun verifyOtp (token_hash).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? ROUTE.student;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email",
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Gagal. Tautan reset yang tidak bisa ditukar harus mendarat di halaman yang
  // bisa menjelaskan dirinya sendiri, bukan di halaman masuk dengan pesan
  // "verifikasi email gagal" yang tidak ada hubungannya dengan yang dialami
  // pengguna. Penyebab tersering: tautannya sudah dipakai sekali, sudah lewat
  // masa berlaku, atau dibuka di peramban lain tempat kode PKCE-nya tidak ada.
  const recovery = type === "recovery" || next === ROUTE.resetPassword;
  if (recovery) {
    return NextResponse.redirect(`${origin}${ROUTE.resetPassword}?error=kedaluwarsa`);
  }

  return NextResponse.redirect(`${origin}${ROUTE.login}?error=verifikasi`);
}
