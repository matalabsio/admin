import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUserDetailClient } from "@/components/admin/admin-user-detail-client";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "User detail · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell hidePageHeader>
      <Link
        href="/admin/users"
        className="mb-[22px] inline-flex items-center gap-[7px] text-sm font-semibold text-teal hover:text-cyan"
      >
        <ArrowLeft className="size-4" />
        Back to users
      </Link>
      <AdminUserDetailClient userId={id} />
    </AdminShell>
  );
}
