import type { Metadata } from "next";
import { AdminQuestionEditClient } from "@/components/admin/admin-question-edit-client";
import { AdminShell } from "@/components/admin/admin-shell";

type Props = { params: Promise<{ id: string; questionId: string }> };

export const metadata: Metadata = {
  title: "Edit question · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default async function AdminQuestionEditPage({ params }: Props) {
  const { id, questionId } = await params;
  return (
    <AdminShell title="Edit question">
      <AdminQuestionEditClient mockId={id} questionId={questionId} />
    </AdminShell>
  );
}
