import type { Metadata } from "next";
import { AdminSpeakingBuilderClient } from "@/components/admin/admin-speaking-builder-client";
import { AdminShell } from "@/components/admin/admin-shell";

type Props = { params: Promise<{ id: string; part: string }> };

export const metadata: Metadata = {
  title: "Speaking Builder · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default async function AdminSpeakingBuilderPartPage({ params }: Props) {
  const { id, part: partRaw } = await params;
  const part = Number(partRaw);
  const safePart = Number.isFinite(part) && part >= 1 && part <= 3 ? part : 1;
  return (
    <AdminShell hidePageHeader>
      <AdminSpeakingBuilderClient mockId={id} part={safePart} />
    </AdminShell>
  );
}
