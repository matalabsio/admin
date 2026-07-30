import type { Metadata } from "next";
import { AdminReadingBuilderClient } from "@/components/admin/admin-reading-builder-client";
import { AdminShell } from "@/components/admin/admin-shell";

type Props = { params: Promise<{ id: string; part: string }> };

export const metadata: Metadata = {
  title: "Reading Builder · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default async function AdminReadingBuilderPage({ params }: Props) {
  const { id, part: partRaw } = await params;
  const part = Number(partRaw);
  const safePart = Number.isFinite(part) && part >= 1 && part <= 4 ? part : 1;
  return (
    <AdminShell hidePageHeader>
      <AdminReadingBuilderClient mockId={id} part={safePart} />
    </AdminShell>
  );
}
