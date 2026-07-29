import { collectSetCookieHeaders, parseSetCookieHeader } from "@/lib/auth-cookies";
import type { AuthResponse } from "@/lib/auth";
import { coalescedServerRefresh } from "@/lib/auth-refresh-coordinator";
import { getApiUrl } from "@/lib/api";
import { fetchWithTimeout } from "@/lib/fetch-server";
import { serverAuthHeaders } from "@/lib/server-auth-headers";
import { isAuthEnabled } from "@/lib/flags";
import { accessTokenExpired } from "@/lib/jwt-expiry";
import {
  ACCESS_COOKIE,
  GUEST_SESSION,
  GUEST_USER,
  REFRESH_COOKIE,
  type AuthUser,
  type SessionUser,
} from "@/lib/session";

export { accessTokenExpired };

function mergeAuthCookieHeader(
  existing: string,
  setCookieHeaders: string[],
  tokens?: { access_token?: string; refresh_token?: string | null },
): string {
  const jar = new Map<string, string>();
  for (const segment of existing.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    jar.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  for (const raw of setCookieHeaders) {
    const parsed = parseSetCookieHeader(raw);
    if (parsed) jar.set(parsed.name, parsed.value);
  }
  if (tokens?.access_token) jar.set(ACCESS_COOKIE, tokens.access_token);
  if (tokens?.refresh_token) jar.set(REFRESH_COOKIE, tokens.refresh_token);

  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function refreshAuthSessionOnce(
  cookieHeader: string,
): Promise<{
  cookieHeader: string;
  setCookieHeaders: string[];
  auth: AuthResponse;
} | null> {
  const res = await fetchWithTimeout(`${getApiUrl()}/auth/refresh`, {
    method: "POST",
    headers: { cookie: cookieHeader },
    cache: "no-store",
    timeoutMs: 8_000,
  });
  if (!res.ok) return null;

  const setCookieHeaders = collectSetCookieHeaders(res.headers);
  const auth = (await res.json()) as AuthResponse;
  const nextHeader = mergeAuthCookieHeader(
    cookieHeader,
    setCookieHeaders,
    auth,
  );
  return { cookieHeader: nextHeader, setCookieHeaders, auth };
}

/** Rotate session when refresh cookie is valid (for RSC and API route handlers). */
export async function refreshAuthSession(
  cookieHeader: string,
): Promise<{
  cookieHeader: string;
  setCookieHeaders: string[];
  auth: AuthResponse;
} | null> {
  if (!/(?:^|;\s*)bf_refresh=/.test(cookieHeader)) return null;

  try {
    return await coalescedServerRefresh(cookieHeader, refreshAuthSessionOnce);
  } catch {
    return null;
  }
}

/** Rotate session on EC2 when refresh cookie is valid. */
export async function refreshServerAuth(
  cookieHeader: string,
): Promise<{ user: AuthUser; cookieHeader: string } | null> {
  const refreshed = await refreshAuthSession(cookieHeader);
  if (!refreshed) return null;
  return { user: refreshed.auth.user, cookieHeader: refreshed.cookieHeader };
}

function authUserToSessionUser(user: AuthUser): SessionUser {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role ?? "student",
    avatar_display_url: user.avatar_display_url ?? null,
    is_active: user.is_active ?? true,
  };
}

async function fetchAuthedResource<T>(
  cookieHeader: string,
  path: string,
  parseOk: (res: Response) => Promise<T>,
  fromRefreshedUser: (user: AuthUser) => T,
): Promise<{ value: T | null; cookieHeader: string }> {
  let header = cookieHeader;
  try {
    const res = await fetchWithTimeout(`${getApiUrl()}${path}`, {
      headers: serverAuthHeaders(header),
      cache: "no-store",
      timeoutMs: 8_000,
    });
    if (res.ok) {
      return { value: await parseOk(res), cookieHeader: header };
    }
    if (res.status === 401) {
      const refreshed = await refreshAuthSession(header);
      if (refreshed) {
        return {
          value: fromRefreshedUser(refreshed.auth.user),
          cookieHeader: refreshed.cookieHeader,
        };
      }
    }
    return { value: null, cookieHeader: header };
  } catch {
    return { value: null, cookieHeader: header };
  }
}

/** Resolve user for RSC; refreshes access token server-side when /auth/me returns 401. */
export async function getServerAuth(
  cookieHeader: string,
): Promise<{ user: AuthUser | null; cookieHeader: string }> {
  if (!isAuthEnabled()) {
    return { user: GUEST_USER, cookieHeader };
  }
  if (!cookieHeader.trim()) {
    return { user: null, cookieHeader };
  }

  const { value, cookieHeader: header } = await fetchAuthedResource(
    cookieHeader,
    "/auth/me",
    async (res) => (await res.json()) as AuthUser,
    (user) => user,
  );
  return { user: value, cookieHeader: header };
}

/** Resolve shell session for RSC; refreshes when /auth/session returns 401. */
export async function getServerSession(
  cookieHeader: string,
): Promise<{ user: SessionUser | null; cookieHeader: string }> {
  if (!isAuthEnabled()) {
    return { user: GUEST_SESSION, cookieHeader };
  }
  if (!cookieHeader.trim()) {
    return { user: null, cookieHeader };
  }

  const { value, cookieHeader: header } = await fetchAuthedResource(
    cookieHeader,
    "/auth/session",
    async (res) => (await res.json()) as SessionUser,
    authUserToSessionUser,
  );
  return { user: value, cookieHeader: header };
}
