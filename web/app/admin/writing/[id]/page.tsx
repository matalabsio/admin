import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminWritingDetailClient } from "@/components/admin/admin-writing-detail-client";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Writing review · Admin · BandForge",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string }>;
};

export default async function AdminWritingDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const source = sp.source === "diagnostic" ? "diagnostic" : sp.source === "mock" ? "mock" : null;
  if (!source) {
    notFound();
  }

  return (
    <AdminShell hidePageHeader>
      <AdminWritingDetailClient reviewId={id} source={source} />
    </AdminShell>
  );
}
