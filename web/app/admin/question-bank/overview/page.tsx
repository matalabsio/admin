import type { Metadata } from "next";
import { AdminQuestionBankOverviewClient } from "@/components/admin/admin-question-bank-overview-client";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Question bank overview · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminQuestionBankOverviewPage() {
  return (
    <AdminShell hidePageHeader>
      <AdminQuestionBankOverviewClient />
    </AdminShell>
  );
}
