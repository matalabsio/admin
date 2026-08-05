import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminReliabilityClient } from "@/components/admin/admin-reliability-client";

export const metadata: Metadata = {
  title: "Reliability · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminReliabilityPage() {
  return (
    <AdminShell hidePageHeader>
      <AdminReliabilityClient />
    </AdminShell>
  );
}
