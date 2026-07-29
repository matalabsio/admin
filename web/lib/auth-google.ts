import {
  DEFAULT_RAILWAY_API_URL,
  getApiUrl,
  parseApiError,
  parseJsonResponse,
  type ApiErrorBody,
} from "@/lib/api";
import { collectSetCookieHeaders } from "@/lib/auth-cookies";
import { fetchWithTimeout } from "@/lib/fetch-server";

function formatBackendFetchError(e: unknown): string {
  if (!(e instanceof Error)) return "Google sign-in failed.";
  const cause = e.cause as NodeJS.ErrnoException | undefined;
  const code = cause?.code ?? "";
  const api = getApiUrl();
  if (code === "ENOTFOUND" || e.message === "fetch failed") {
    return (
      `Cannot reach the API at ${api}. On Vercel set NEXT_PUBLIC_API_URL to your Railway URL and redeploy.`
    );
  }
  if (code === "ECONNREFUSED" || code === "ECONNRESET") {
    return `API refused connection (${api}). Check Railway deploy logs and API_PORT=\${{PORT}}.`;
  }
  if (e.name === "AbortError") {
    return `API timed out (${api}). Railway may be cold-starting — try again.`;
  }
  return e.message || "Google sign-in failed.";
}

export type GoogleAuthResult = {
  user?: {
    id: string;
    email: string | null;
    full_name: string | null;
  };
  access_token?: string;
  refresh_token?: string;
  redirect_to: string;
  pending_verification?: boolean;
  message?: string;
};

/** Exchange Google OAuth code via backend; returns Set-Cookie headers for the BFF route. */
export async function exchangeGoogleCode(
  code: string,
  state: string,
): Promise<{ data: GoogleAuthResult; setCookies: string[] }> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${getApiUrl()}/auth/google/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
      cache: "no-store",
      timeoutMs: 15_000,
    });
  } catch (e) {
    throw new Error(formatBackendFetchError(e));
  }
  const data = await parseJsonResponse<GoogleAuthResult & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(parseApiError(data, res.status));
  }
  return {
    data,
    setCookies: collectSetCookieHeaders(res.headers),
  };
}

export async function fetchGoogleAuthorizationUrl(
  next: string,
): Promise<string> {
  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${getApiUrl()}/auth/google/authorize?next=${encodeURIComponent(next)}`,
      { cache: "no-store", timeoutMs: 15_000 },
    );
  } catch (e) {
    throw new Error(formatBackendFetchError(e));
  }
  const body = await parseJsonResponse<{
    authorization_url?: string;
  } & ApiErrorBody>(res);
  if (!res.ok || !body.authorization_url) {
    const detail = parseApiError(body, res.status);
    if (detail.includes("Application not found")) {
      throw new Error(
        `Railway API not found at ${getApiUrl()}. In Vercel set API_URL=${DEFAULT_RAILWAY_API_URL} (Production + Preview).`,
      );
    }
    throw new Error(
      body.authorization_url
        ? "Google sign-in is not available."
        : detail,
    );
  }
  return body.authorization_url;
}
