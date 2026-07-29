import {
  ApiError,
  parseApiError,
  parseJsonResponse,
  type ApiErrorBody,
} from "@/lib/api";
import { coalescedClientRefresh } from "@/lib/auth-refresh-coordinator";
import { getServerAuth, getServerSession as resolveServerSession } from "@/lib/auth-server";
import { isAuthEnabled } from "@/lib/flags";
import { accessTokenExpired } from "@/lib/jwt-expiry";
import {
  clearAuthStorage,
  clearLegacyRefreshToken,
  getAccessToken,
  getRefreshToken,
  GUEST_USER,
  hasSessionHintCookie,
  persistAuthTokens,
  type AuthUser,
  type SessionUser,
} from "@/lib/session";

export { GUEST_USER };

export type AuthResponse = {
  user: AuthUser;
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string | null;
};

export type MessageResponse = {
  ok?: boolean;
  message: string;
};

function clientAuthHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (typeof window !== "undefined") {
    const token = getAccessToken();
    if (token && !accessTokenExpired(token)) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return headers;
}

const CLIENT_AUTH_TIMEOUT_MS = 12_000;

async function authFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_AUTH_TIMEOUT_MS);
  try {
    const res = await fetch(`/api/auth/${path}`, {
      ...init,
      credentials: "include",
      signal: controller.signal,
      headers: clientAuthHeaders(init?.headers),
    });
    const body = await parseJsonResponse<T | ApiErrorBody>(res);
    if (!res.ok) {
      throw new ApiError(parseApiError(body as ApiErrorBody, res.status), res.status);
    }
    return body as T;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new ApiError("Authentication request timed out. Try again.", 408);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function storeAuthFromResponse(data: AuthResponse): void {
  // Access only in LS; refresh stays httpOnly via BFF Set-Cookie.
  persistAuthTokens(data.access_token);
}

export async function register(input: {
  email: string;
  password: string;
  full_name?: string;
}): Promise<MessageResponse> {
  return authFetch<MessageResponse>("register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Save phone/email to Supabase signup_leads (no MSG91 SMS yet). */
export async function collectLead(input: {
  phone?: string;
  email?: string;
  full_name?: string;
  channel?: string;
}): Promise<MessageResponse> {
  return authFetch<MessageResponse>("collect-lead", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const data = await authFetch<AuthResponse>("login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  storeAuthFromResponse(data);
  return data;
}

export async function sendOtp(phone: string): Promise<MessageResponse> {
  return authFetch<MessageResponse>("send-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(input: {
  phone: string;
  code: string;
}): Promise<AuthResponse> {
  const data = await authFetch<AuthResponse>("verify-otp", {
    method: "POST",
    body: JSON.stringify(input),
  });
  storeAuthFromResponse(data);
  return data;
}

export async function verifyEmail(token: string): Promise<AuthResponse> {
  const data = await authFetch<AuthResponse>("verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  storeAuthFromResponse(data);
  return data;
}

export async function refreshSession(): Promise<AuthResponse> {
  return coalescedClientRefresh(async () => {
    const data = await authFetch<AuthResponse>("refresh", { method: "POST" });
    storeAuthFromResponse(data);
    return data;
  });
}

/**
 * One-shot migrate: if a legacy LS refresh exists, restore cookies then clear LS.
 * New sessions never write refresh to localStorage.
 */
export async function restoreSessionFromStorage(): Promise<AuthResponse | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const data = await authFetch<AuthResponse>("restore", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
    });
    storeAuthFromResponse(data);
    clearLegacyRefreshToken();
    return data;
  } catch {
    clearLegacyRefreshToken();
    return null;
  }
}

function hasBrowserAuthCookies(): boolean {
  return hasSessionHintCookie();
}

/**
 * On app load: migrate legacy LS refresh if needed, then refresh via httpOnly cookies.
 */
export async function ensureSession(): Promise<AuthResponse | null> {
  const legacyRefresh = getRefreshToken();

  if (!hasBrowserAuthCookies() && legacyRefresh) {
    const restored = await restoreSessionFromStorage();
    if (restored) return restored;
  } else if (legacyRefresh) {
    clearLegacyRefreshToken();
  }

  try {
    return await refreshSession();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && legacyRefresh) {
      const restored = await restoreSessionFromStorage();
      if (restored) return restored;
      await logout();
      return null;
    }
    if (err instanceof ApiError && err.status === 401) {
      await logout();
      return null;
    }
    return null;
  }
}

/** Server: cookies present → bootstrap; no cookies → login (client may escalate to bootstrap). */
export function resolveAuthRedirectPath(
  nextPath: string,
  cookieHeader: string,
): string {
  return hasAuthCookies(cookieHeader)
    ? authBootstrapPath(nextPath)
    : loginPathWithNext(nextPath);
}

/** Server pages: cookie-aware redirect when session cannot be resolved. */
export function authGuardRedirectPath(
  nextPath: string,
  cookieHeader = "",
): string {
  return resolveAuthRedirectPath(nextPath, cookieHeader);
}

/** True if cookie header may contain stale BandForge session cookies. */
export function hasAuthCookies(cookieHeader: string): boolean {
  return /(?:^|;\s*)bf_(?:refresh|access)=/.test(cookieHeader);
}

export function loginPathWithNext(nextPath: string, sessionExpired = false): string {
  const next =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";
  const q = new URLSearchParams({ next });
  if (sessionExpired) q.set("session", "expired");
  return `/login?${q.toString()}`;
}

export async function logout(): Promise<void> {
  try {
    await authFetch<MessageResponse>("logout", { method: "POST" });
  } finally {
    clearAuthStorage();
  }
}

export async function forgotPassword(email: string): Promise<MessageResponse> {
  return authFetch<MessageResponse>("forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<MessageResponse> {
  return authFetch<MessageResponse>("reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getMe(): Promise<AuthUser> {
  return authFetch<AuthUser>("me", { method: "GET" });
}

/** Redirect target when a protected server page cannot resolve the user. */
export function authBootstrapPath(nextPath: string): string {
  const next =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";
  return `/auth/bootstrap?next=${encodeURIComponent(next)}`;
}

export async function getServerUser(cookieHeader: string): Promise<AuthUser | null> {
  const { user } = await getServerAuth(cookieHeader);
  return user;
}

export async function getServerSession(
  cookieHeader: string,
): Promise<SessionUser | null> {
  const { user } = await resolveServerSession(cookieHeader);
  return user;
}
