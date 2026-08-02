import type { Metadata } from "next";
import { AdminWritingClient } from "@/components/admin/admin-writing-client";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Writing evaluator · Admin · BandForge",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminWritingPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <AdminShell hidePageHeader>
      <AdminWritingClient initialStatus={sp.status} />
    </AdminShell>
  );
}
