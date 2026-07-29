import type { NextResponse } from "next/server";
import type { AuthResponse } from "@/lib/auth";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SESSION_HINT_COOKIE,
} from "@/lib/session";

/** Default max-age when backend Set-Cookie omits Max-Age (seconds). */
export const DEFAULT_MAX_AGE: Record<string, number> = {
  [ACCESS_COOKIE]: 15 * 60,
  [REFRESH_COOKIE]: 30 * 24 * 60 * 60,
  [SESSION_HINT_COOKIE]: 30 * 24 * 60 * 60,
};

export type ParsedSetCookie = {
  name: string;
  value: string;
  maxAge?: number;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
};

/** Parse a single Set-Cookie header value from the backend. */
export function parseSetCookieHeader(header: string): ParsedSetCookie | null {
  const parts = header.split(";").map((p) => p.trim());
  if (parts.length === 0) return null;

  const [nameValue, ...attrs] = parts;
  const eq = nameValue.indexOf("=");
  if (eq <= 0) return null;

  const name = nameValue.slice(0, eq).trim();
  const value = nameValue.slice(eq + 1).trim();
  const parsed: ParsedSetCookie = { name, value };

  for (const attr of attrs) {
    const lower = attr.toLowerCase();
    if (lower === "httponly") parsed.httpOnly = true;
    else if (lower.startsWith("max-age=")) {
      const n = Number.parseInt(attr.split("=")[1] ?? "", 10);
      if (!Number.isNaN(n)) parsed.maxAge = n;
    } else if (lower.startsWith("samesite=")) {
      const v = attr.split("=")[1]?.toLowerCase();
      if (v === "lax" || v === "strict" || v === "none") parsed.sameSite = v;
    }
  }

  return parsed;
}

/** Non-httpOnly hint so client JS can detect an auth session without reading tokens. */
export function setSessionHintOnResponse(
  res: NextResponse,
  maxAge: number = DEFAULT_MAX_AGE[SESSION_HINT_COOKIE],
): void {
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(SESSION_HINT_COOKIE, "1", {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export function clearSessionHintOnResponse(res: NextResponse): void {
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(SESSION_HINT_COOKIE, "", {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Apply backend Set-Cookie headers onto a Next.js response for the site origin. */
export function applyAuthCookiesToResponse(
  res: NextResponse,
  setCookieHeaders: string[],
): void {
  const secure = process.env.NODE_ENV === "production";
  let applied = false;

  for (const raw of setCookieHeaders) {
    const c = parseSetCookieHeader(raw);
    if (!c || (c.name !== ACCESS_COOKIE && c.name !== REFRESH_COOKIE)) continue;

    res.cookies.set(c.name, c.value, {
      httpOnly: true,
      secure,
      sameSite: c.sameSite ?? "lax",
      path: "/",
      maxAge: c.maxAge ?? DEFAULT_MAX_AGE[c.name],
    });
    applied = true;
  }

  if (applied) setSessionHintOnResponse(res);
}

export function collectSetCookieHeaders(headers: Headers): string[] {
  const out: string[] =
    typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  if (out.length === 0) {
    const single = headers.get("set-cookie");
    if (single) out.push(single);
  }
  return out;
}

/** Mirror auth JSON tokens onto httpOnly cookies (login, restore, guest session). */
export function applyAuthTokensToResponse(
  res: NextResponse,
  auth: AuthResponse,
  setCookieHeaders: string[] = [],
): void {
  applyAuthCookiesToResponse(res, setCookieHeaders);
  const secure = process.env.NODE_ENV === "production";
  let applied = false;
  if (auth.access_token) {
    res.cookies.set(ACCESS_COOKIE, auth.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: DEFAULT_MAX_AGE[ACCESS_COOKIE],
    });
    applied = true;
  }
  if (auth.refresh_token) {
    res.cookies.set(REFRESH_COOKIE, auth.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: DEFAULT_MAX_AGE[REFRESH_COOKIE],
    });
    applied = true;
  }
  if (applied) setSessionHintOnResponse(res);
}
