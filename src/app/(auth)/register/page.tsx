import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { createClient } from "@/lib/supabase/server";
import type { SchoolClass } from "@/types/database";

export const metadata: Metadata = { title: "Daftar Siswa" };

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("name, grade, jurusan, rombel")
    .order("name", { ascending: true });

  return <RegisterForm classes={(data ?? []) as SchoolClass[]} />;
}
