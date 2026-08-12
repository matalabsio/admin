import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminVideosClient } from "@/components/admin/admin-videos-client";

export const metadata: Metadata = {
  title: "Videos · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default function AdminVideosPage() {
  return (
    <AdminShell hidePageHeader>
      <Suspense
        fallback={
          <p className="text-sm text-[#94A3B8]">Loading videos…</p>
        }
      >
        <AdminVideosClient />
      </Suspense>
    </AdminShell>
  );
}
