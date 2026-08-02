import type { Metadata } from "next";
import { AdminQuestionBankClient } from "@/components/admin/admin-question-bank-client";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Question bank · Admin · BandForge",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ skill?: string; tab?: string }>;
};

export default async function AdminQuestionBankPage({ searchParams }: Props) {
  const sp = await searchParams;
  const skill = (sp.skill || "listening").toLowerCase();
  const safeSkill =
    skill === "reading" || skill === "writing" || skill === "speaking"
      ? skill
      : "listening";
  const tab = sp.tab === "mocks" ? "mocks" : "practice";
  return (
    <AdminShell hidePageHeader>
      <AdminQuestionBankClient initialSkill={safeSkill} initialTab={tab} />
    </AdminShell>
  );
}
