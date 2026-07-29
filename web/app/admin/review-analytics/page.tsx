import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminReviewAnalyticsClient } from "@/components/admin/admin-review-analytics-client";

export const metadata: Metadata = {
  title: "Review analytics · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminReviewAnalyticsPage() {
  return (
    <AdminShell hidePageHeader>
      <AdminReviewAnalyticsClient />
    </AdminShell>
  );
}
