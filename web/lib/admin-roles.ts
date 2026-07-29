const ADMIN_ROLES = new Set(["admin", "super_admin"]);

export function isAdminRole(role: string | undefined): boolean {
  return ADMIN_ROLES.has(role ?? "student");
}

/** Server-only: normalized ADMIN_ALLOWED_EMAIL (null if unset). */
export function adminAllowedEmail(): string | null {
  const email = process.env.ADMIN_ALLOWED_EMAIL?.trim().toLowerCase();
  return email || null;
}

/** Server-only: fail-closed when ADMIN_ALLOWED_EMAIL is unset. */
export function isAdminEmailAllowed(email: string | null | undefined): boolean {
  const allowed = adminAllowedEmail();
  if (!allowed) return false;
  return (email ?? "").trim().toLowerCase() === allowed;
}

export function adminLoginPath(nextPath = "/admin", error?: string): string {
  const next =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/admin";
  const params = new URLSearchParams({ next });
  if (error) params.set("error", error);
  return `/admin/login?${params.toString()}`;
}
