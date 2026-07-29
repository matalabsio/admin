import type { Metadata } from "next";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Admin · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <AdminShell hidePageHeader>
      <AdminDashboardClient />
    </AdminShell>
  );
}
