import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAiOpsClient } from "@/components/admin/admin-ai-ops-client";

export const metadata: Metadata = {
  title: "AI ops · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminAiOpsPage() {
  return (
    <AdminShell hidePageHeader>
      <AdminAiOpsClient />
    </AdminShell>
  );
}
