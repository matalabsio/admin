import type { Metadata } from "next";
import { AdminDiagnosticsClient } from "@/components/admin/admin-diagnostics-client";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Diagnostics · Evaluator · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminDiagnosticsPage() {
  return (
    <AdminShell hidePageHeader>
      <AdminDiagnosticsClient />
    </AdminShell>
  );
}
