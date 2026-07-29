/** Seconds before exp when exam guard should refresh (15 min access → refresh ~9 min in). */
export const EXAM_ACCESS_REFRESH_MARGIN_SEC = 6 * 60;

/** True when JWT access token is missing or past expiry (default 30s skew). */
export function accessTokenExpired(token: string, skewSeconds = 30): boolean {
  try {
    const part = token.split(".")[1];
    if (!part) return true;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(
      typeof atob !== "undefined"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8"),
    ) as { exp?: number };
    if (typeof json.exp !== "number") return true;
    return Date.now() / 1000 >= json.exp - skewSeconds;
  } catch {
    return true;
  }
}
