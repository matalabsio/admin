import { adminApi, type StreamVideoItem } from "@/lib/admin-api";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export type StreamStatusKind = "ready" | "error" | "processing" | "empty";

export function streamStatusKind(
  status: string | null | undefined,
): StreamStatusKind {
  const value = (status || "").trim().toLowerCase();
  if (!value) return "empty";
  if (value === "ready" || value === "complete") return "ready";
  if (value === "error" || value === "failed") return "error";
  return "processing";
}

export function liveStreamStatus(
  assignedStatus: string | null | undefined,
  libraryStatus: string | null | undefined,
): string {
  if (libraryStatus) return libraryStatus;
  return assignedStatus || "processing";
}

export async function waitForStreamReady(
  uid: string,
  options?: {
    timeoutMs?: number;
    intervalMs?: number;
    minMs?: number;
    signal?: AbortSignal;
  },
): Promise<"ready" | "error" | "timeout"> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const intervalMs = options?.intervalMs ?? 2000;
  const minMs = options?.minMs ?? 1200;
  const started = Date.now();
  let outcome: "ready" | "error" | "timeout" = "timeout";

  while (Date.now() - started < timeoutMs) {
    if (options?.signal?.aborted) break;
    const { items } = await adminApi.listStreamLibrary();
    const hit = items.find((row) => row.uid === uid);
    const kind = streamStatusKind(hit?.status);
    if (kind === "ready" || kind === "error") {
      outcome = kind;
      break;
    }
    await sleep(intervalMs);
  }

  const elapsed = Date.now() - started;
  if (elapsed < minMs) {
    await sleep(minMs - elapsed);
  }
  return outcome;
}

export function upsertStreamItem(
  items: StreamVideoItem[],
  next: StreamVideoItem,
): StreamVideoItem[] {
  return [next, ...items.filter((row) => row.tag !== next.tag)];
}
