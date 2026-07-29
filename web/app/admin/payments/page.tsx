import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPaymentsClient } from "@/components/admin/admin-payments-client";

export const metadata: Metadata = {
  title: "Payments · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminPaymentsPage() {
  return (
    <AdminShell hidePageHeader>
      <AdminPaymentsClient initialTab="payments" />
    </AdminShell>
  );
}
