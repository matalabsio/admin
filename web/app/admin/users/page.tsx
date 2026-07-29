import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUsersClient } from "@/components/admin/admin-users-client";

export const metadata: Metadata = {
  title: "Users · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminUsersPage() {
  return (
    <AdminShell hidePageHeader>
      <AdminUsersClient />
    </AdminShell>
  );
}
