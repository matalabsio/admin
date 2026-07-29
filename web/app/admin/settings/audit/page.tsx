import type { Metadata } from "next";
import { AdminAuditClient } from "@/components/admin/admin-audit-client";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Audit log · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminAuditPage() {
  return (
    <AdminShell title="Audit log">
      <p className="mb-4 text-meta text-ink/55">
        Super admin only — read-only log of admin mutations.
      </p>
      <AdminAuditClient />
    </AdminShell>
  );
}
