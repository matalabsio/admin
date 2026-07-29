import type { Metadata } from "next";
import { AdminLoginClient } from "@/components/admin/admin-login-client";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Admin sign in · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <AuthShell
      title="Admin sign in"
      subtitle="Internal access only. Use your admin email and password to open the BandForge admin panel."
    >
      <AdminLoginClient />
    </AuthShell>
  );
}
