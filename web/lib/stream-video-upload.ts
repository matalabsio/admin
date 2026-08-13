/**
 * Prepare a video for Cloudflare Stream.
 * Files ≤ 150MB go through as-is (tus). Larger files must be uploaded
 * in the Cloudflare panel, then assigned in BandForge.
 */

export const STREAM_DIRECT_MAX_BYTES = 150 * 1024 * 1024;
/** @deprecated Use STREAM_DIRECT_MAX_BYTES — same 150MB cap, no in-browser compress. */
export const STREAM_SOFT_MAX_BYTES = STREAM_DIRECT_MAX_BYTES;
export const STREAM_HARD_MAX_BYTES = STREAM_DIRECT_MAX_BYTES;
export const STREAM_TUS_CHUNK_BYTES = 5 * 1024 * 1024;

export function formatVideoBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export type PreparedStreamVideo = {
  file: File;
  compressed: boolean;
  originalBytes: number;
  finalBytes: number;
};

/**
 * Size gate only. No in-browser re-encode — Stream transcodes after tus upload.
 */
export async function prepareVideoForStreamUpload(
  file: File,
  onProgress?: (phase: "compress" | "ready", pct: number) => void,
): Promise<PreparedStreamVideo> {
  const originalBytes = file.size;
  if (originalBytes <= 0) {
    throw new Error("Empty video file.");
  }
  if (originalBytes > STREAM_DIRECT_MAX_BYTES) {
    throw new Error(
      `File is ${formatVideoBytes(originalBytes)}. Admin upload max is ${formatVideoBytes(STREAM_DIRECT_MAX_BYTES)}. Upload it in the Cloudflare Stream panel, then assign it here.`,
    );
  }
  onProgress?.("ready", 100);
  return {
    file,
    compressed: false,
    originalBytes,
    finalBytes: originalBytes,
  };
}
