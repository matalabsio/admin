export function isPerfEnabled(): boolean {
  return (
    process.env.PERF_LOG === "1" ||
    process.env.NODE_ENV === "development"
  );
}

export function createTimer(label: string) {
  const start = performance.now();
  return {
    log(step: string) {
      if (!isPerfEnabled()) return;
      console.log(
        `[${label}] ${step}: ${(performance.now() - start).toFixed(2)}ms`,
      );
    },
    end() {
      if (!isPerfEnabled()) return;
      console.log(
        `[${label}] TOTAL: ${(performance.now() - start).toFixed(2)}ms`,
      );
    },
    elapsedMs(): number {
      return performance.now() - start;
    },
  };
}

/** Structured JSON perf line for SSR / proxy instrumentation. */
export function perfLog(
  event: string,
  fields: Record<string, unknown>,
): void {
  if (!isPerfEnabled()) return;
  console.info(
    JSON.stringify({
      event: "perf",
      ts: Date.now(),
      name: event,
      ...fields,
    }),
  );
}
