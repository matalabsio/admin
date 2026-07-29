import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPaymentsClient } from "@/components/admin/admin-payments-client";

export const metadata: Metadata = {
  title: "Subscriptions · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminSubscriptionsPage() {
  return (
    <AdminShell hidePageHeader>
      <AdminPaymentsClient initialTab="subscriptions" />
    </AdminShell>
  );
}
