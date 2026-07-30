import type { Metadata } from "next";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Speaking Builder · Admin · BandForge",
  robots: { index: false, follow: false },
};

export default async function AdminSpeakingBuilderPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/mocks/${id}/speaking/1`);
}
