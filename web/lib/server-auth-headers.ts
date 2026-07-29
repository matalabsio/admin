import { ACCESS_COOKIE } from "@/lib/session";

/** Cookie + Bearer for faster /auth/me when access token is in bf_access cookie. */
export function serverAuthHeaders(cookieHeader: string): Record<string, string> {
  const headers: Record<string, string> = { cookie: cookieHeader };
  if (!cookieHeader.trim()) return headers;

  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ACCESS_COOKIE}=([^;]*)`),
  );
  const token = match?.[1] ? decodeURIComponent(match[1].trim()) : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  return headers;
}
