import type { Metadata } from "next";
import { AdminMockDetailClient } from "@/components/admin/admin-mock-detail-client";
import { AdminShell } from "@/components/admin/admin-shell";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Mock detail · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default async function AdminMockDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell hidePageHeader>
      <AdminMockDetailClient mockId={id} />
    </AdminShell>
  );
}
