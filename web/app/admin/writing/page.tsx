import type { Metadata } from "next";
import { AdminWritingClient } from "@/components/admin/admin-writing-client";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Writing evaluator · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminWritingPage() {
  return (
    <AdminShell hidePageHeader>
      <AdminWritingClient />
    </AdminShell>
  );
}
