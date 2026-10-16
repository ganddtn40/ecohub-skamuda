import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Lupa Kata Sandi" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
