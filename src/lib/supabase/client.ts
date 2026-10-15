import { createBrowserClient } from "@supabase/ssr";

/**
 * Klien Supabase untuk komponen Client (Realtime, aksi interaktif).
 * Membaca env resmi NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
