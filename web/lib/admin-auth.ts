import { redirect } from "next/navigation";
import {
  adminLoginPath,
  isAdminEmailAllowed,
  isAdminRole,
} from "@/lib/admin-roles";
import { getCachedCookieHeader, getCachedServerSession } from "@/lib/server-cache";

export { adminLoginPath, isAdminRole } from "@/lib/admin-roles";

export async function requireAdminSession(_nextPath = "/admin") {
  const cookieHeader = await getCachedCookieHeader();
  const user = await getCachedServerSession(cookieHeader);
  const loginNext = "/admin";

  if (!user) {
    redirect(adminLoginPath(loginNext));
  }

  if (
    !user.is_active ||
    !isAdminRole(user.role) ||
    !isAdminEmailAllowed(user.email)
  ) {
    redirect(adminLoginPath(loginNext, "access_denied"));
  }

  return user;
}
