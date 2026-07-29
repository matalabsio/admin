import type { Metadata } from "next";
import { AdminDiagnosticDetailClient } from "@/components/admin/admin-diagnostic-detail-client";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Diagnostic review · Evaluator · BandForge",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function AdminDiagnosticDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell hidePageHeader>
      <AdminDiagnosticDetailClient diagnosticId={id} />
    </AdminShell>
  );
}
