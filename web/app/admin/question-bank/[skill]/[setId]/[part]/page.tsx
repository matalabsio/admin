import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminListeningBuilderClient } from "@/components/admin/admin-listening-builder-client";
import { AdminReadingBuilderClient } from "@/components/admin/admin-reading-builder-client";
import { AdminWritingBuilderClient } from "@/components/admin/admin-writing-builder-client";
import { AdminSpeakingBuilderClient } from "@/components/admin/admin-speaking-builder-client";
import { AdminShell } from "@/components/admin/admin-shell";
import type { BuilderSkill } from "@/components/admin/admin-builder-source";

type Props = {
  params: Promise<{ skill: string; setId: string; part: string }>;
};

export const metadata: Metadata = {
  title: "Question bank builder · Admin · BandForge",
  robots: { index: false, follow: false },
};

const SKILLS = new Set(["listening", "reading", "writing", "speaking"]);

export default async function AdminBankBuilderPage({ params }: Props) {
  const { skill: skillRaw, setId, part: partRaw } = await params;
  const skill = skillRaw.toLowerCase() as BuilderSkill;
  if (!SKILLS.has(skill)) notFound();
  const part = Number(partRaw);
  const safePart = Number.isFinite(part) && part >= 1 ? part : 1;
  const source = { kind: "bank" as const, setId, skill };

  return (
    <AdminShell hidePageHeader>
      {skill === "listening" ? (
        <AdminListeningBuilderClient source={source} part={safePart} />
      ) : null}
      {skill === "reading" ? (
        <AdminReadingBuilderClient source={source} part={safePart} />
      ) : null}
      {skill === "writing" ? (
        <AdminWritingBuilderClient source={source} part={safePart} />
      ) : null}
      {skill === "speaking" ? (
        <AdminSpeakingBuilderClient source={source} part={safePart} />
      ) : null}
    </AdminShell>
  );
}
