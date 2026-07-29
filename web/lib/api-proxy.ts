import { NextResponse } from "next/server";
import { getApiUrl, isApiUrlConfiguredForVercel } from "@/lib/api";
import type { AuthResponse } from "@/lib/auth";
import { logAuthMetric } from "@/lib/auth-metrics";
import { applyAuthCookiesToResponse, DEFAULT_MAX_AGE, setSessionHintOnResponse } from "@/lib/auth-cookies";
import { refreshAuthSession } from "@/lib/auth-server";
import { accessTokenExpired } from "@/lib/jwt-expiry";
import { isPerfEnabled, perfLog } from "@/lib/performance";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/session";

function backendUnreachableDetail(): string {
  const config = isApiUrlConfiguredForVercel();
  if (!config.ok) {
    return config.detail;
  }
  if (process.env.VERCEL === "1") {
    return (
      `Cannot reach the API at ${getApiUrl()}. ` +
      "Check Railway deploy health and Networking → Target Port (must match gunicorn bind port)."
    );
  }
  return (
    "Cannot reach the API. Start the backend: " +
    "uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
  );
}

function parseBearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token || null;
}

/** Prefer httpOnly cookie access when the client sent an expired bearer. */
function shouldPreferCookieAccess(
  cookieHeader: string,
  authorization: string | null,
): boolean {
  const cookieAccess = readCookieHeader(cookieHeader, ACCESS_COOKIE);
  const clientBearer = parseBearerToken(authorization);
  if (!cookieAccess || !clientBearer) return false;
  return accessTokenExpired(clientBearer) && !accessTokenExpired(cookieAccess);
}

/** Read a cookie value from the raw Cookie request header (Route Handlers). */
export function readCookieHeader(cookieHeader: string, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.slice(name.length + 1));
    }
  }
  return null;
}

function hasRefreshCookie(cookieHeader: string): boolean {
  return Boolean(readCookieHeader(cookieHeader, REFRESH_COOKIE));
}

const READING_AUTOSAVE_RE =
  /^\/api\/reading\/attempts\/[^/]+\/autosave$/;

function isReadingAutosaveRoute(
  backendPath: string,
  method: string,
): boolean {
  const path = backendPath.split("?")[0] ?? backendPath;
  return method === "POST" && READING_AUTOSAVE_RE.test(path);
}

function newRequestId(): string {
  return crypto.randomUUID();
}

function buildProxyHeaders(
  cookieHeader: string,
  authorization: string | null,
  options?: { contentType?: string; preferCookieAccess?: boolean },
): Record<string, string> {
  const access = readCookieHeader(cookieHeader, ACCESS_COOKIE);
  const headers: Record<string, string> = { cookie: cookieHeader };
  const preferCookie =
    Boolean(options?.preferCookieAccess && access) ||
    shouldPreferCookieAccess(cookieHeader, authorization);

  if (preferCookie && access) {
    headers.Authorization = `Bearer ${access}`;
  } else if (authorization) {
    headers.Authorization = authorization;
  } else if (access) {
    headers.Authorization = `Bearer ${access}`;
  }

  if (options?.contentType) {
    headers["Content-Type"] = options.contentType;
  }

  return headers;
}

async function readProxyBody(req: Request): Promise<{
  body: string | ArrayBuffer | undefined;
  contentType: string | undefined;
}> {
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  if (!hasBody) {
    return { body: undefined, contentType: undefined };
  }

  const contentType = req.headers.get("content-type") ?? "application/json";
  if (contentType.includes("multipart/form-data")) {
    return { body: await req.arrayBuffer(), contentType };
  }
  return { body: await req.text(), contentType };
}

async function fetchBackend(
  backend: string,
  req: Request,
  cookieHeader: string,
  body: string | ArrayBuffer | undefined,
  contentType: string | undefined,
  preferCookieAccess: boolean,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const headers = buildProxyHeaders(cookieHeader, req.headers.get("authorization"), {
    contentType: hasBody ? contentType : undefined,
    preferCookieAccess,
  });
  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
  }
  const range = req.headers.get("range");
  if (range) {
    headers.Range = range;
  }

  return fetch(backend, {
    method: req.method,
    headers,
    cache: "no-store",
    body: hasBody ? body : undefined,
  });
}

export async function proxyToBackend(
  req: Request,
  backendPath: string,
): Promise<NextResponse> {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const backend = `${getApiUrl()}${backendPath.startsWith("/") ? backendPath : `/${backendPath}`}${url.search}`;
  let cookieHeader = req.headers.get("cookie") ?? "";
  const { body, contentType } = await readProxyBody(req);

  const readingAutosave = isReadingAutosaveRoute(backendPath, req.method);
  const requestId = readingAutosave ? newRequestId() : null;
  const proxyHeaders =
    requestId !== null ? { "X-Request-Id": requestId } : undefined;

  let authRefreshCookies: string[] | null = null;
  let refreshAuth: AuthResponse | null = null;
  let authRefreshMs = 0;
  let backendMs = 0;

  let res: Response;
  try {
    const backendStart = Date.now();
    res = await fetchBackend(
      backend,
      req,
      cookieHeader,
      body,
      contentType,
      false,
      proxyHeaders,
    );
    backendMs += Date.now() - backendStart;
  } catch {
    console.info(
      JSON.stringify({
        route: backendPath,
        duration_ms: Date.now() - startedAt,
        cache_hit: false,
        cache_layer: "none",
        status: 503,
      }),
    );
    return NextResponse.json({ detail: backendUnreachableDetail() }, { status: 503 });
  }

  if (res.status === 401 && hasRefreshCookie(cookieHeader)) {
    const refreshStart = Date.now();
    const refreshed = await refreshAuthSession(cookieHeader);
    authRefreshMs += Date.now() - refreshStart;
    if (refreshed) {
      cookieHeader = refreshed.cookieHeader;
      authRefreshCookies = refreshed.setCookieHeaders;
      refreshAuth = refreshed.auth;
      try {
        const retryStart = Date.now();
        res = await fetchBackend(
          backend,
          req,
          cookieHeader,
          body,
          contentType,
          true,
          proxyHeaders,
        );
        backendMs += Date.now() - retryStart;
        logAuthMetric(res.ok ? "proxy_retry_success" : "proxy_retry_failure", {
          route: backendPath,
          status: res.status,
        });
      } catch {
        logAuthMetric("proxy_retry_failure", {
          route: backendPath,
          reason: "backend_unreachable",
        });
        console.info(
          JSON.stringify({
            route: backendPath,
            duration_ms: Date.now() - startedAt,
            cache_hit: false,
            cache_layer: "none",
            status: 503,
            auth_refresh: true,
          }),
        );
        return NextResponse.json(
          {
            detail:
              "Cannot reach the API. Start the backend: uvicorn app.main:app --reload --host 127.0.0.1 --port 8000",
          },
          { status: 503 },
        );
      }
    } else {
      logAuthMetric("proxy_retry_failure", {
        route: backendPath,
        reason: "refresh_failed",
      });
    }
  }

  const responseContentType = res.headers.get("content-type") ?? "application/json";
  const isBinary =
    responseContentType.startsWith("audio/") ||
    responseContentType.startsWith("application/octet-stream");

  if (isBinary) {
    const passthroughHeaders: Record<string, string> = {
      "Content-Type": responseContentType,
    };
    for (const name of ["Content-Length", "Content-Range", "Accept-Ranges", "Cache-Control"]) {
      const value = res.headers.get(name);
      if (value) passthroughHeaders[name] = value;
    }
    const response = new NextResponse(res.body, {
      status: res.status,
      headers: passthroughHeaders,
    });
    if (refreshAuth) {
      if (authRefreshCookies?.length) {
        applyAuthCookiesToResponse(response, authRefreshCookies);
      }
      const secure = process.env.NODE_ENV === "production";
      if (refreshAuth.access_token) {
        response.cookies.set(ACCESS_COOKIE, refreshAuth.access_token, {
          httpOnly: true,
          secure,
          sameSite: "lax",
          path: "/",
          maxAge: DEFAULT_MAX_AGE[ACCESS_COOKIE],
        });
      }
      if (refreshAuth.refresh_token) {
        response.cookies.set(REFRESH_COOKIE, refreshAuth.refresh_token, {
          httpOnly: true,
          secure,
          sameSite: "lax",
          path: "/",
          maxAge: DEFAULT_MAX_AGE[REFRESH_COOKIE],
        });
      }
      if (refreshAuth.access_token || refreshAuth.refresh_token) {
        setSessionHintOnResponse(response);
      }
    }
    console.info(
      JSON.stringify({
        route: backendPath,
        duration_ms: Date.now() - startedAt,
        cache_hit: false,
        cache_layer: "none",
        status: res.status,
        auth_refresh: Boolean(refreshAuth),
        binary: true,
      }),
    );
    return response;
  }

  const responseBody = await res.text();
  const totalMs = Date.now() - startedAt;
  console.info(
    JSON.stringify({
      route: backendPath,
      duration_ms: totalMs,
      cache_hit: false,
      cache_layer: "none",
      status: res.status,
      auth_refresh: Boolean(refreshAuth),
    }),
  );

  if (readingAutosave && requestId && isPerfEnabled()) {
    perfLog("reading-autosave-proxy", {
      request_id: requestId,
      route: backendPath,
      auth_refresh_ms: authRefreshMs,
      backend_ms: backendMs,
      total_ms: totalMs,
      status: res.status,
    });
  }

  const response = new NextResponse(responseBody, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
      ...(requestId ? { "X-Request-Id": requestId } : {}),
    },
  });

  if (refreshAuth) {
    if (authRefreshCookies?.length) {
      applyAuthCookiesToResponse(response, authRefreshCookies);
    }
    const secure = process.env.NODE_ENV === "production";
    if (refreshAuth.access_token) {
      response.cookies.set(ACCESS_COOKIE, refreshAuth.access_token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: DEFAULT_MAX_AGE[ACCESS_COOKIE],
      });
    }
    if (refreshAuth.refresh_token) {
      response.cookies.set(REFRESH_COOKIE, refreshAuth.refresh_token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: DEFAULT_MAX_AGE[REFRESH_COOKIE],
      });
    }
    if (refreshAuth.access_token || refreshAuth.refresh_token) {
      setSessionHintOnResponse(response);
    }
  }

  return response;
}
