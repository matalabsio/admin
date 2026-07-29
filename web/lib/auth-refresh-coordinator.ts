import type { AuthResponse } from "@/lib/auth";
import { logAuthMetric } from "@/lib/auth-metrics";
import { REFRESH_COOKIE } from "@/lib/session";

export type RefreshAuthSessionResult = {
  cookieHeader: string;
  setCookieHeaders: string[];
  auth: AuthResponse;
};

/** Key concurrent refreshes by refresh cookie value (per Node process / per browser tab). */
export function refreshCoalesceKey(cookieHeader: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${REFRESH_COOKIE}=`)) {
      return part.slice(REFRESH_COOKIE.length + 1);
    }
  }
  return null;
}

const serverInflight = new Map<
  string,
  Promise<RefreshAuthSessionResult | null>
>();

let clientInflight: Promise<AuthResponse> | null = null;

/**
 * Server: dedupe parallel refresh calls (e.g. autosave + submit 401 at once).
 * Waits for an in-flight refresh with the same bf_refresh cookie when present.
 */
export async function coalescedServerRefresh(
  cookieHeader: string,
  refreshFn: (header: string) => Promise<RefreshAuthSessionResult | null>,
): Promise<RefreshAuthSessionResult | null> {
  const key = refreshCoalesceKey(cookieHeader);
  if (!key) return refreshFn(cookieHeader);

  const existing = serverInflight.get(key);
  if (existing) return existing;

  const promise = refreshFn(cookieHeader)
    .then((result) => {
      logAuthMetric(result ? "auth_refresh_success" : "auth_refresh_failure", {
        scope: "server",
        coalesced: false,
      });
      return result;
    })
    .catch(() => {
      logAuthMetric("auth_refresh_failure", {
        scope: "server",
        reason: "exception",
      });
      return null;
    })
    .finally(() => {
      serverInflight.delete(key);
    });

  serverInflight.set(key, promise);
  return promise;
}

/**
 * Client: dedupe timer refresh vs ensureSession / AuthSessionProvider racing.
 */
export async function coalescedClientRefresh(
  refreshFn: () => Promise<AuthResponse>,
): Promise<AuthResponse> {
  if (clientInflight) return clientInflight;

  clientInflight = refreshFn()
    .then((data) => {
      logAuthMetric("auth_refresh_success", { scope: "client", coalesced: false });
      return data;
    })
    .catch((err) => {
      logAuthMetric("auth_refresh_failure", { scope: "client" });
      throw err;
    })
    .finally(() => {
      clientInflight = null;
    });

  return clientInflight;
}
