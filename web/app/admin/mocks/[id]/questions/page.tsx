import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminQuestionsTreeClient } from "@/components/admin/admin-questions-tree-client";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminBtnSecondary, adminLink } from "@/components/admin/admin-ui";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Questions · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default async function AdminQuestionsTreePage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell hidePageHeader>
      <AdminPageHeader
        eyebrow="Content / Question bank"
        title="Question bank"
        subtitle="Browse and edit questions for this mock."
        actions={
          <Link href={`/admin/mocks/${id}`} className={adminBtnSecondary}>
            Back to mock
          </Link>
        }
      />
      <Link href="/admin/mocks" className={`mb-4 mt-4 inline-block text-sm ${adminLink}`}>
        ← Back to mocks
      </Link>
      <AdminQuestionsTreeClient mockId={id} />
    </AdminShell>
  );
}
