import type { Metadata } from "next";
import { AdminSpeakingClient } from "@/components/admin/admin-speaking-client";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Evaluator portal · Admin · BandForge",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminSpeakingPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <AdminShell hidePageHeader>
      <AdminSpeakingClient initialStatus={sp.status} />
    </AdminShell>
  );
}
