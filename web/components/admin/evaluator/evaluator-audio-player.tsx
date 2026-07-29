"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const SPEEDS = [0.75, 1, 1.25] as const;

type Props = {
  audioUrl: string | null;
  partLabel?: string | null;
};

export function EvaluatorAudioPlayer({ audioUrl, partLabel }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = speed;
  }, [speed]);

  if (!audioUrl) {
    return (
      <section className="rounded-2xl bg-navy p-5 text-white sm:p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7FE3EF]">
          Recording{partLabel ? ` · ${partLabel}` : ""}
        </p>
        <p className="mt-3 text-sm font-light text-white/65">
          No audio available for this submission.
        </p>
      </section>
    );
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <section className="overflow-hidden rounded-2xl bg-navy p-5 text-white shadow-[0_12px_32px_rgba(13,31,60,0.28)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7FE3EF]">
          Recording{partLabel ? ` · ${partLabel}` : ""}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[#9FB0C8]">Speed</span>
          <div className="flex items-center gap-0.5 rounded-lg bg-white/8 p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  "cursor-pointer rounded-md px-2 py-1 font-mono text-[11px] transition-colors",
                  speed === s
                    ? "bg-cyan text-navy"
                    : "text-[#9FB0C8] hover:text-white",
                )}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="mt-5 flex h-16 items-end justify-center gap-px overflow-hidden sm:gap-[3px]"
        aria-hidden
      >
        {Array.from({ length: 48 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-[3px] shrink rounded-full transition-all duration-150",
              playing ? "bg-cyan" : "bg-white/25",
            )}
            style={{
              height: playing
                ? `${10 + Math.abs(Math.sin(i * 0.38 + progress * 0.03)) * 38}px`
                : `${8 + (i % 5) * 3}px`,
              opacity: playing ? 0.55 + (i % 7) * 0.06 : 0.35,
            }}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-cyan text-navy shadow-[0_4px_14px_rgba(0,188,212,0.45)] transition-transform hover:brightness-105"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="size-5" />
          ) : (
            <Play className="ml-0.5 size-5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/12">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan to-[#7FE3EF]"
              style={{ width: `${pct}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={(e) => {
                const el = audioRef.current;
                if (!el) return;
                const next = Number(e.target.value);
                el.currentTime = next;
                setProgress(next);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Playback position"
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[11px] text-[#9FB0C8]">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={() => setProgress(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="sr-only"
      />
    </section>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
