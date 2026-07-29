import { NextResponse } from "next/server";
import {
  applyAuthCookiesToResponse,
  applyAuthTokensToResponse,
  clearSessionHintOnResponse,
  collectSetCookieHeaders,
} from "@/lib/auth-cookies";
import type { AuthResponse } from "@/lib/auth";
import { refreshAuthSession } from "@/lib/auth-server";
import { getApiUrl, isApiUrlConfiguredForVercel, type ApiErrorBody } from "@/lib/api";
import { fetchWithTimeout } from "@/lib/fetch-server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/session";

async function proxyCoalescedRefresh(
  cookieHeader: string,
): Promise<NextResponse> {
  const refreshed = await refreshAuthSession(cookieHeader);
  if (!refreshed) {
    return NextResponse.json(
      { detail: "No refresh token." },
      { status: 401 },
    );
  }
  const body = JSON.stringify(refreshed.auth);
  const res = new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  applyAuthTokensToResponse(res, refreshed.auth, refreshed.setCookieHeaders);
  return res;
}

const AUTH_PATHS = new Set([
  "register",
  "collect-lead",
  "login",
  "send-otp",
  "verify-otp",
  "verify-email",
  "refresh",
  "restore",
  "logout",
  "forgot-password",
  "reset-password",
  "me",
  "profile",
  "profile/avatar",
]);

function isAuthPath(path: string): boolean {
  return AUTH_PATHS.has(path);
}

export async function proxyAuthRequest(
  req: Request,
  pathSegments: string[],
): Promise<NextResponse> {
  const path = pathSegments.join("/");
  if (!isAuthPath(path)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cookieHeader = req.headers.get("cookie") ?? "";

  if (path === "refresh" && req.method === "POST") {
    return proxyCoalescedRefresh(cookieHeader);
  }

  const backendUrl = `${getApiUrl()}/auth/${path}`;

  const contentType = req.headers.get("content-type") ?? "";
  const authorization = req.headers.get("authorization");
  const headers: Record<string, string> = { cookie: cookieHeader };
  if (authorization) {
    headers.Authorization = authorization;
  }
  if (contentType) {
    headers["Content-Type"] = contentType;
  } else if (req.method !== "GET" && req.method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (contentType.includes("multipart/form-data")) {
      init.body = await req.arrayBuffer();
    } else {
      init.body = await req.text();
    }
  }

  let backendRes: Response;
  try {
    backendRes = await fetchWithTimeout(backendUrl, {
      ...init,
      timeoutMs: 10_000,
    });
  } catch (e) {
    const config = isApiUrlConfiguredForVercel();
    const message =
      !config.ok
        ? config.detail
        : process.env.VERCEL === "1"
          ? `Backend API is not reachable at ${getApiUrl()}. Check Railway deploy and public domain Target Port.`
          : "Backend API is not reachable. Start it: cd backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000";
    return NextResponse.json({ error: message }, { status: 503 });
  }
  const body = await backendRes.text();
  const res = new NextResponse(body, {
    status: backendRes.status,
    headers: {
      "Content-Type":
        backendRes.headers.get("content-type") ?? "application/json",
    },
  });

  applyAuthCookiesToResponse(res, collectSetCookieHeaders(backendRes.headers));

  if (
    backendRes.ok &&
    (path === "restore" ||
      path === "login" ||
      path === "verify-otp" ||
      path === "verify-email")
  ) {
    try {
      const parsed = JSON.parse(body) as AuthResponse;
      applyAuthTokensToResponse(res, parsed);
    } catch {
      /* body may not be JSON */
    }
  }

  if (path === "logout") {
    const secure = process.env.NODE_ENV === "production";
    res.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
    res.cookies.set(REFRESH_COOKIE, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      secure,
      sameSite: "lax",
    });
    clearSessionHintOnResponse(res);
  }

  return res;
}

export async function proxyAuthJson<T>(
  req: Request,
  pathSegments: string[],
): Promise<{ response: NextResponse; data: T | ApiErrorBody }> {
  const proxied = await proxyAuthRequest(req, pathSegments);
  const data = (await proxied.json()) as T | ApiErrorBody;
  return { response: proxied, data };
}
