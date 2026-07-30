import type { Metadata } from "next";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ module?: string; part?: string }>;
};

export const metadata: Metadata = {
  title: "Ingest · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default async function AdminMockIngestPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const partRaw = Number(query.part || "1");
  const part = Number.isFinite(partRaw) && partRaw >= 1 && partRaw <= 4 ? partRaw : 1;
  const module = query.module?.trim();

  if (module === "reading") {
    redirect(`/admin/mocks/${id}/reading/${part}`);
  }
  if (module === "writing") {
    const writingPart = part === 2 ? 2 : 1;
    redirect(`/admin/mocks/${id}/writing/${writingPart}`);
  }

  // Listening now uses only the visual builder flow.
  redirect(`/admin/mocks/${id}/listening/${part}`);
}
