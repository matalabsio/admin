export const ACCESS_COOKIE = "bf_access";
export const REFRESH_COOKIE = "bf_refresh";
/** Readable by JS — signals httpOnly auth cookies may exist (no token value). */
export const SESSION_HINT_COOKIE = "bf_has_session";

/** localStorage keys — survives browser restarts (unlike in-memory session). */
export const LS_ACCESS_TOKEN = "bf_access_token";
export const LS_REFRESH_TOKEN = "bf_refresh_token";

let accessTokenMemory: string | null = null;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function setAccessToken(token: string | null): void {
  accessTokenMemory = token;
  if (!canUseStorage()) return;
  if (token) {
    window.localStorage.setItem(LS_ACCESS_TOKEN, token);
  } else {
    window.localStorage.removeItem(LS_ACCESS_TOKEN);
  }
}

export function getAccessToken(): string | null {
  if (accessTokenMemory) return accessTokenMemory;
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(LS_ACCESS_TOKEN);
}

export function setRefreshToken(token: string | null): void {
  // Refresh JWTs must not live in localStorage (XSS). Only allow clear for migration.
  if (!canUseStorage()) return;
  if (token) return;
  window.localStorage.removeItem(LS_REFRESH_TOKEN);
}

/** Legacy LS refresh — read for one-shot cookie restore migration only. */
export function getRefreshToken(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(LS_REFRESH_TOKEN);
}

export function clearLegacyRefreshToken(): void {
  setRefreshToken(null);
}

export function persistAuthTokens(
  accessToken: string,
  _refreshToken?: string | null,
): void {
  setAccessToken(accessToken);
  // Never persist refresh to localStorage — httpOnly bf_refresh + BFF only.
  clearLegacyRefreshToken();
}

export function clearAccessToken(): void {
  accessTokenMemory = null;
  if (!canUseStorage()) return;
  window.localStorage.removeItem(LS_ACCESS_TOKEN);
}

export function clearAuthStorage(): void {
  clearAccessToken();
  clearLegacyRefreshToken();
}

/** True when document.cookie contains the non-httpOnly session hint. */
export function hasSessionHintCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => {
    const name = c.trim().split("=")[0];
    return name === SESSION_HINT_COOKIE;
  });
}

/** True when the browser may have a restorable session (avoids noisy /api/auth calls on login). */
export function hasLikelyClientSession(): boolean {
  if (typeof document === "undefined") return false;
  return (
    hasSessionHintCookie() ||
    Boolean(getRefreshToken()) || // legacy migrate-once
    Boolean(getAccessToken())
  );
}

export type AuthUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  avatar_url?: string | null;
  avatar_display_url?: string | null;
  target_band?: number | null;
  role?: string;
  is_active?: boolean;
};

/** Minimal authenticated user for shell rendering (layout, auth guards). */
export type SessionUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  avatar_display_url: string | null;
  is_active: boolean;
};

/** Used when NEXT_PUBLIC_AUTH_ENABLED is false (local UI / mock dev). */
export const GUEST_USER: AuthUser = {
  id: "00000000-0000-0000-0000-000000000000",
  email: null,
  full_name: "Guest",
  phone: null,
  email_verified: false,
  phone_verified: false,
};

export const GUEST_SESSION: SessionUser = {
  id: GUEST_USER.id,
  full_name: GUEST_USER.full_name,
  email: GUEST_USER.email,
  role: "student",
  avatar_display_url: null,
  is_active: true,
};
