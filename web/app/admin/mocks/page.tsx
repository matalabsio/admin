import type { Metadata } from "next";
import { AdminMocksClient } from "@/components/admin/admin-mocks-client";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Mocks · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminMocksPage() {
  return (
    <AdminShell hidePageHeader>
      <AdminMocksClient />
    </AdminShell>
  );
}
