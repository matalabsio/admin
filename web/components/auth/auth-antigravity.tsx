"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Antigravity = dynamic(
  () => import("@/components/bandforge/antigravity"),
  { ssr: false },
);

const AUTH_COLORS = ["#0097a7", "#00bcd4", "#0d1f3c"] as const;

/** Match landing hero — full density on desktop. */
const DESKTOP_CAPSULES = 200;
const DESKTOP_SPHERES = 70;
const SMALL_CAPSULES = 64;
const SMALL_SPHERES = 20;

const SMALL_SCREEN_MQ = "(max-width: 1023px)";

/** Ambient antigravity particles for auth pages. */
export function AuthAntigravity() {
  const [isSmall, setIsSmall] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(SMALL_SCREEN_MQ);
    const update = () => {
      setIsSmall(mq.matches);
      setReady(true);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!ready) {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-0 motion-reduce:hidden"
        aria-hidden
      />
    );
  }

  const capsuleCount = isSmall ? SMALL_CAPSULES : DESKTOP_CAPSULES;
  const sphereCount = isSmall ? SMALL_SPHERES : DESKTOP_SPHERES;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden motion-reduce:hidden"
      aria-hidden
    >
      <div
        className={
          isSmall ? "absolute inset-0 scale-[1.08]" : "absolute inset-0"
        }
        style={{ transformOrigin: "center center" }}
      >
        <Antigravity
          key={`auth-ag-${capsuleCount}-${sphereCount}`}
          capsuleCount={capsuleCount}
          sphereCount={sphereCount}
          magnetRadius={isSmall ? 9 : 11}
          ringRadius={isSmall ? 5.5 : 7}
          waveSpeed={0.18}
          waveAmplitude={isSmall ? 0.65 : 0.85}
          particleSize={isSmall ? 0.55 : 0.8}
          lerpSpeed={0.022}
          colors={[...AUTH_COLORS]}
          autoAnimate
          particleVariance={isSmall ? 0.28 : 0.35}
          pulseSpeed={1.2}
          fieldStrength={isSmall ? 4 : 5}
          rotationSpeed={0.05}
        />
      </div>
    </div>
  );
}
