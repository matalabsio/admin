import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  applyAuthCookiesToResponse,
  DEFAULT_MAX_AGE,
  setSessionHintOnResponse,
} from "@/lib/auth-cookies";
import { accessTokenExpired, refreshAuthSession } from "@/lib/auth-server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/session";

/** Refresh access token before RSC when access is missing/expired but refresh cookie exists. */
export async function middlewareRefreshAuth(
  request: NextRequest,
): Promise<NextResponse | null> {
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (access && !accessTokenExpired(access)) return null;

  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const refreshed = await refreshAuthSession(cookieHeader);
    if (!refreshed) return null;

    const response = NextResponse.next();
    if (refreshed.setCookieHeaders.length) {
      applyAuthCookiesToResponse(response, refreshed.setCookieHeaders);
    }

    const secure = process.env.NODE_ENV === "production";
    let applied = false;
    if (refreshed.auth.access_token) {
      response.cookies.set(ACCESS_COOKIE, refreshed.auth.access_token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: DEFAULT_MAX_AGE[ACCESS_COOKIE],
      });
      applied = true;
    }
    if (refreshed.auth.refresh_token) {
      response.cookies.set(REFRESH_COOKIE, refreshed.auth.refresh_token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: DEFAULT_MAX_AGE[REFRESH_COOKIE],
      });
      applied = true;
    }
    if (applied) setSessionHintOnResponse(response);

    return response;
  } catch {
    return null;
  }
}
