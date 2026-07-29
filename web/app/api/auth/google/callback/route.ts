import { NextResponse } from "next/server";
import {
  applyAuthCookiesToResponse,
  setSessionHintOnResponse,
} from "@/lib/auth-cookies";
import { exchangeGoogleCode } from "@/lib/auth-google";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/session";

function applyOAuthAuthCookies(
  res: NextResponse,
  setCookies: string[],
  data: { access_token?: string; refresh_token?: string | null },
): void {
  applyAuthCookiesToResponse(res, setCookies);

  const secure = process.env.NODE_ENV === "production";
  if (setCookies.length === 0 && data.access_token) {
    res.cookies.set(ACCESS_COOKIE, data.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
    if (data.refresh_token) {
      res.cookies.set(REFRESH_COOKIE, data.refresh_token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }
    setSessionHintOnResponse(res);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "Google sign-in was cancelled.");
    return NextResponse.redirect(loginUrl);
  }

  if (!code || !state) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "Missing Google authorization.");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { data, setCookies } = await exchangeGoogleCode(code, state);
    const nextPath = data.redirect_to || "/dashboard";
    const safeNext =
      nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : "/dashboard";

    if (data.pending_verification) {
      const bootstrapUrl = new URL("/auth/bootstrap", request.url);
      bootstrapUrl.searchParams.set("next", safeNext);
      const res = NextResponse.redirect(bootstrapUrl);
      applyOAuthAuthCookies(res, setCookies, data);
      return res;
    }

    // Fresh OAuth cookies are applied here. The client continuation can then
    // recover and sync a completed guest diagnostic before choosing the final
    // destination, without invoking the refresh/bootstrap loop.
    const continueUrl = new URL("/auth/continue", request.url);
    continueUrl.searchParams.set("next", safeNext);
    const res = NextResponse.redirect(continueUrl);
    applyOAuthAuthCookies(res, setCookies, data);
    return res;
  } catch (e) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "error",
      e instanceof Error ? e.message : "Google sign-in failed.",
    );
    return NextResponse.redirect(loginUrl);
  }
}
