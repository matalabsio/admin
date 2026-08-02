import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUsersClient } from "@/components/admin/admin-users-client";

export const metadata: Metadata = {
  title: "Users · Admin · BandForge",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ view?: string }> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <AdminShell hidePageHeader>
      <AdminUsersClient initialView={sp.view} />
    </AdminShell>
  );
}
