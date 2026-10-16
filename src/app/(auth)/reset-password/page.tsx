import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Kata Sandi Baru" };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 rounded-card" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
