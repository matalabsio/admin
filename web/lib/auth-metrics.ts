export type AuthMetricEvent =
  | "auth_refresh_success"
  | "auth_refresh_failure"
  | "proxy_retry_success"
  | "proxy_retry_failure";

/** Structured auth metrics for log aggregation (first week post-deploy). */
export function logAuthMetric(
  event: AuthMetricEvent,
  fields?: Record<string, string | number | boolean | null | undefined>,
): void {
  console.info(
    JSON.stringify({
      event,
      ts: Date.now(),
      ...fields,
    }),
  );
}
