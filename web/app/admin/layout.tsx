import { headers } from "next/headers";
import { AppFontsShell } from "@/components/fonts/app-fonts-shell";
import { requireAdminSession } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname !== "/admin/login") {
    await requireAdminSession(pathname || "/admin");
  }
  return <AppFontsShell>{children}</AppFontsShell>;
}
