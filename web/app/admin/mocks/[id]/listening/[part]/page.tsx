import type { Metadata } from "next";
import { AdminListeningBuilderClient } from "@/components/admin/admin-listening-builder-client";
import { AdminShell } from "@/components/admin/admin-shell";

type Props = { params: Promise<{ id: string; part: string }> };

export const metadata: Metadata = {
  title: "Listening Builder · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default async function AdminListeningBuilderPage({ params }: Props) {
  const { id, part: partRaw } = await params;
  const part = Number(partRaw);
  const safePart = Number.isFinite(part) && part >= 1 && part <= 4 ? part : 1;
  return (
    <AdminShell hidePageHeader>
      <AdminListeningBuilderClient
        source={{ kind: "mock", mockId: id }}
        part={safePart}
      />
    </AdminShell>
  );
}
