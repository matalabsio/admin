/**
 * Prepare a video for Cloudflare Stream: prefer already-compressed MP4s,
 * otherwise re-encode in-browser to ~720p / ~2.5 Mbps before tus upload.
 */

export const STREAM_SOFT_MAX_BYTES = 80 * 1024 * 1024;
export const STREAM_HARD_MAX_BYTES = 200 * 1024 * 1024;
export const STREAM_COMPRESS_THRESHOLD_BYTES = 40 * 1024 * 1024;
export const STREAM_TUS_CHUNK_BYTES = 5 * 1024 * 1024;

export function formatVideoBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function pickRecorderMime(): string | null {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm",
  ];
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

function loadVideo(file: File): Promise<{ video: HTMLVideoElement; revoke: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    const revoke = () => URL.revokeObjectURL(url);
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        revoke();
        reject(new Error("Could not read video duration."));
        return;
      }
      resolve({ video, revoke });
    };
    video.onerror = () => {
      revoke();
      reject(new Error("Could not load video for compression."));
    };
  });
}

/**
 * Re-encode to ~1280px-wide WebM at ~2.5 Mbps (Stream accepts WebM).
 * Uses canvas + MediaRecorder so we avoid ffmpeg.wasm memory spikes.
 */
async function compressViaMediaRecorder(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<File> {
  const mime = pickRecorderMime();
  if (!mime) {
    throw new Error(
      "This browser cannot compress video. Export a compressed 720p H.264 MP4 under 80 MB (HandBrake / ffmpeg), then upload that file.",
    );
  }

  const { video, revoke } = await loadVideo(file);
  try {
  const srcW = video.videoWidth || 1280;
  const srcH = video.videoHeight || 720;
  const maxW = 1280;
  const scale = srcW > maxW ? maxW / srcW : 1;
  const width = Math.max(2, Math.round((srcW * scale) / 2) * 2);
  const height = Math.max(2, Math.round((srcH * scale) / 2) * 2);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unavailable for video compression.");
  }

  const canvasStream = canvas.captureStream(30);
  let audioCtx: AudioContext | null = null;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AC) {
      audioCtx = new AC();
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      for (const track of dest.stream.getAudioTracks()) {
        canvasStream.addTrack(track);
      }
    }
  } catch {
    // Video-only compress is still useful if audio graph fails.
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(canvasStream, {
    mimeType: mime,
    videoBitsPerSecond: 2_500_000,
    audioBitsPerSecond: 128_000,
  });
  recorder.ondataavailable = (ev) => {
    if (ev.data.size > 0) chunks.push(ev.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mime.split(";")[0] || "video/webm" }));
    };
    recorder.onerror = () => reject(new Error("Video compression failed."));
  });

  video.currentTime = 0;
  await video.play();
  recorder.start(500);

  const duration = video.duration;
  let raf = 0;
  const draw = () => {
    if (video.ended || video.paused) return;
    ctx.drawImage(video, 0, 0, width, height);
    if (onProgress && duration > 0) {
      onProgress(Math.min(99, Math.round((video.currentTime / duration) * 100)));
    }
    raf = requestAnimationFrame(draw);
  };
  draw();

  await new Promise<void>((resolve) => {
    video.onended = () => resolve();
  });
  cancelAnimationFrame(raf);
  ctx.drawImage(video, 0, 0, width, height);
  if (recorder.state !== "inactive") recorder.stop();
  for (const track of canvasStream.getTracks()) track.stop();
  video.pause();
  video.removeAttribute("src");
  video.load();
  if (audioCtx) await audioCtx.close().catch(() => undefined);

  const blob = await done;
  onProgress?.(100);
  const base = file.name.replace(/\.[^.]+$/, "") || "skill-intro";
  return new File([blob], `${base}-compressed.webm`, {
    type: blob.type || "video/webm",
    lastModified: Date.now(),
  });
  } finally {
    revoke();
  }
}

export type PreparedStreamVideo = {
  file: File;
  compressed: boolean;
  originalBytes: number;
  finalBytes: number;
};

/**
 * Gate + optional compress for Stream upload.
 * Rejects huge masters; compresses mid-size files in-browser when possible.
 */
export async function prepareVideoForStreamUpload(
  file: File,
  onProgress?: (phase: "compress" | "ready", pct: number) => void,
): Promise<PreparedStreamVideo> {
  const originalBytes = file.size;
  if (originalBytes <= 0) {
    throw new Error("Empty video file.");
  }
  if (originalBytes > STREAM_HARD_MAX_BYTES) {
    throw new Error(
      `File is ${formatVideoBytes(originalBytes)}. Max for admin upload is ${formatVideoBytes(STREAM_HARD_MAX_BYTES)}. Compress to 720p H.264 MP4 (CRF ~23) under ~80 MB, then upload.`,
    );
  }

  if (originalBytes <= STREAM_COMPRESS_THRESHOLD_BYTES) {
    onProgress?.("ready", 100);
    return {
      file,
      compressed: false,
      originalBytes,
      finalBytes: originalBytes,
    };
  }

  onProgress?.("compress", 0);
  try {
    const compressed = await compressViaMediaRecorder(file, (pct) =>
      onProgress?.("compress", pct),
    );
    if (compressed.size >= originalBytes * 0.95) {
      // Compression did not help — still allow if under soft max.
      if (originalBytes <= STREAM_SOFT_MAX_BYTES) {
        onProgress?.("ready", 100);
        return {
          file,
          compressed: false,
          originalBytes,
          finalBytes: originalBytes,
        };
      }
      throw new Error(
        `Could not shrink ${formatVideoBytes(originalBytes)}. Export a compressed 720p MP4 under ${formatVideoBytes(STREAM_SOFT_MAX_BYTES)} and retry.`,
      );
    }
    onProgress?.("ready", 100);
    return {
      file: compressed,
      compressed: true,
      originalBytes,
      finalBytes: compressed.size,
    };
  } catch (err) {
    if (originalBytes <= STREAM_SOFT_MAX_BYTES) {
      onProgress?.("ready", 100);
      return {
        file,
        compressed: false,
        originalBytes,
        finalBytes: originalBytes,
      };
    }
    throw err instanceof Error
      ? err
      : new Error("Compression failed. Upload a compressed MP4 under 80 MB.");
  }
}
