import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { middlewareRefreshAuth } from "@/lib/auth-middleware-refresh";
import { isAuthEnabled } from "@/lib/flags";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isAuthEnabled()) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return response;
  }

  // Admin login uses email/password — no session cookie required yet.
  if (pathname === "/admin/login") {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return response;
  }

  const isAdminPanel =
    pathname === "/admin" || pathname.startsWith("/admin/");

  if (!isAdminPanel) {
    return NextResponse.next();
  }

  const hasCookie = Boolean(
    request.cookies.get(REFRESH_COOKIE)?.value ||
      request.cookies.get(ACCESS_COOKIE)?.value,
  );

  if (!hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", "/admin");
    return NextResponse.redirect(url);
  }

  const refreshed = await middlewareRefreshAuth(request);
  if (refreshed) {
    refreshed.headers.set("x-pathname", pathname);
    return refreshed;
  }

  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
