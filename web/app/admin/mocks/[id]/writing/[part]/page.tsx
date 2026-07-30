import type { Metadata } from "next";
import { AdminWritingBuilderClient } from "@/components/admin/admin-writing-builder-client";
import { AdminShell } from "@/components/admin/admin-shell";

type Props = { params: Promise<{ id: string; part: string }> };

export const metadata: Metadata = {
  title: "Writing Builder · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default async function AdminWritingBuilderPage({ params }: Props) {
  const { id, part: partRaw } = await params;
  const part = Number(partRaw);
  const safePart = part === 2 ? 2 : 1;
  return (
    <AdminShell hidePageHeader>
      <AdminWritingBuilderClient mockId={id} part={safePart} />
    </AdminShell>
  );
}
