"use client";

/* eslint-disable react/no-unknown-property */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type ParticleShape = "capsule" | "sphere" | "box" | "tetrahedron";

export type AntigravityProps = {
  count?: number;
  /** Capsule instances (used with sphereCount for mixed shapes). */
  capsuleCount?: number;
  /** Sphere instances (used with capsuleCount for mixed shapes). */
  sphereCount?: number;
  magnetRadius?: number;
  ringRadius?: number;
  waveSpeed?: number;
  waveAmplitude?: number;
  particleSize?: number;
  lerpSpeed?: number;
  color?: string;
  /** Per-particle palette — one solid-color mesh per color (updates reliably). */
  colors?: string[];
  autoAnimate?: boolean;
  particleVariance?: number;
  rotationSpeed?: number;
  depthFactor?: number;
  pulseSpeed?: number;
  particleShape?: ParticleShape;
  fieldStrength?: number;
};

type Particle = {
  t: number;
  factor: number;
  speed: number;
  xFactor: number;
  yFactor: number;
  zFactor: number;
  mx: number;
  my: number;
  mz: number;
  cx: number;
  cy: number;
  cz: number;
  vx: number;
  vy: number;
  vz: number;
  randomRadiusOffset: number;
};

type ParticleLayer = {
  id: string;
  shape: ParticleShape;
  color: string;
  particles: Particle[];
};

function createParticles(
  count: number,
  width: number,
  height: number,
): Particle[] {
  const temp: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * width;
    const y = (Math.random() - 0.5) * height;
    const z = (Math.random() - 0.5) * 20;
    temp.push({
      t: Math.random() * 100,
      factor: 20 + Math.random() * 100,
      speed: 0.01 + Math.random() / 200,
      xFactor: -50 + Math.random() * 100,
      yFactor: -50 + Math.random() * 100,
      zFactor: -50 + Math.random() * 100,
      mx: x,
      my: y,
      mz: z,
      cx: x,
      cy: y,
      cz: z,
      vx: 0,
      vy: 0,
      vz: 0,
      randomRadiusOffset: (Math.random() - 0.5) * 2,
    });
  }
  return temp;
}

function partitionByColor(
  particles: Particle[],
  palette: string[],
  shape: ParticleShape,
  prefix: string,
): ParticleLayer[] {
  const buckets: Particle[][] = palette.map(() => []);
  particles.forEach((p, i) => {
    buckets[i % palette.length]!.push(p);
  });
  return buckets
    .map((group, i) => ({
      id: `${prefix}-${palette[i]}-${i}`,
      shape,
      color: palette[i]!,
      particles: group,
    }))
    .filter((layer) => layer.particles.length > 0);
}

type AnimProps = {
  magnetRadius: number;
  ringRadius: number;
  waveSpeed: number;
  waveAmplitude: number;
  particleSize: number;
  lerpSpeed: number;
  autoAnimate: boolean;
  particleVariance: number;
  rotationSpeed: number;
  depthFactor: number;
  pulseSpeed: number;
  fieldStrength: number;
};

function AntigravityInner({
  count = 300,
  capsuleCount,
  sphereCount,
  magnetRadius = 10,
  ringRadius = 10,
  waveSpeed = 0.4,
  waveAmplitude = 1,
  particleSize = 2,
  lerpSpeed = 0.1,
  color = "#FF9FFC",
  colors,
  autoAnimate = false,
  particleVariance = 1,
  rotationSpeed = 0,
  depthFactor = 1,
  pulseSpeed = 3,
  particleShape = "capsule",
  fieldStrength = 10,
}: AntigravityProps) {
  const { viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);

  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastMouseMoveTime = useRef(0);
  const virtualMouse = useRef({ x: 0, y: 0 });

  const paletteKey = colors?.length ? colors.join("|") : color;
  const palette = useMemo(
    () => (colors?.length ? [...colors] : [color]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paletteKey],
  );

  const layers = useMemo(() => {
    const width = viewport.width || 100;
    const height = viewport.height || 100;
    const hasMixed =
      typeof capsuleCount === "number" || typeof sphereCount === "number";

    if (hasMixed) {
      const caps = createParticles(capsuleCount ?? 0, width, height);
      const spheres = createParticles(sphereCount ?? 0, width, height);
      return [
        ...partitionByColor(caps, palette, "capsule", "cap"),
        ...partitionByColor(spheres, palette, "sphere", "sph"),
      ];
    }

    const all = createParticles(count, width, height);
    return partitionByColor(all, palette, particleShape, "all");
  }, [
    count,
    capsuleCount,
    sphereCount,
    viewport.width,
    viewport.height,
    palette,
    particleShape,
  ]);

  const anim: AnimProps = {
    magnetRadius,
    ringRadius,
    waveSpeed,
    waveAmplitude,
    particleSize,
    lerpSpeed,
    autoAnimate,
    particleVariance,
    rotationSpeed,
    depthFactor,
    pulseSpeed,
    fieldStrength,
  };

  useFrame((state) => {
    const { viewport: v, pointer: m } = state;

    const mouseDist = Math.sqrt(
      Math.pow(m.x - lastMousePos.current.x, 2) +
        Math.pow(m.y - lastMousePos.current.y, 2),
    );

    if (mouseDist > 0.001) {
      lastMouseMoveTime.current = Date.now();
      lastMousePos.current = { x: m.x, y: m.y };
    }

    let destX = (m.x * v.width) / 2;
    let destY = (m.y * v.height) / 2;

    if (anim.autoAnimate && Date.now() - lastMouseMoveTime.current > 2000) {
      const time = state.clock.getElapsedTime();
      destX = Math.sin(time * 0.5) * (v.width / 4);
      destY = Math.cos(time * 0.5 * 2) * (v.height / 4);
    }

    const smoothFactor = 0.05;
    virtualMouse.current.x += (destX - virtualMouse.current.x) * smoothFactor;
    virtualMouse.current.y += (destY - virtualMouse.current.y) * smoothFactor;

    const targetX = virtualMouse.current.x;
    const targetY = virtualMouse.current.y;
    const globalRotation = state.clock.getElapsedTime() * anim.rotationSpeed;

    layers.forEach((layer, layerIndex) => {
      const mesh = meshRefs.current[layerIndex];
      if (!mesh) return;

      layer.particles.forEach((particle, i) => {
        let { t, speed, mx, my, mz, cz, randomRadiusOffset } = particle;

        t = particle.t += speed / 2;

        const projectionFactor = 1 - cz / 50;
        const projectedTargetX = targetX * projectionFactor;
        const projectedTargetY = targetY * projectionFactor;

        const dx = mx - projectedTargetX;
        const dy = my - projectedTargetY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const targetPos = { x: mx, y: my, z: mz * anim.depthFactor };

        if (dist < anim.magnetRadius) {
          const angle = Math.atan2(dy, dx) + globalRotation;
          const wave =
            Math.sin(t * anim.waveSpeed + angle) * (0.5 * anim.waveAmplitude);
          const deviation =
            randomRadiusOffset * (5 / (anim.fieldStrength + 0.1));
          const currentRingRadius = anim.ringRadius + wave + deviation;

          targetPos.x = projectedTargetX + currentRingRadius * Math.cos(angle);
          targetPos.y = projectedTargetY + currentRingRadius * Math.sin(angle);
          targetPos.z =
            mz * anim.depthFactor +
            Math.sin(t) * (1 * anim.waveAmplitude * anim.depthFactor);
        }

        particle.cx += (targetPos.x - particle.cx) * anim.lerpSpeed;
        particle.cy += (targetPos.y - particle.cy) * anim.lerpSpeed;
        particle.cz += (targetPos.z - particle.cz) * anim.lerpSpeed;

        dummy.position.set(particle.cx, particle.cy, particle.cz);
        dummy.lookAt(projectedTargetX, projectedTargetY, particle.cz);
        dummy.rotateX(Math.PI / 2);

        const currentDistToMouse = Math.sqrt(
          Math.pow(particle.cx - projectedTargetX, 2) +
            Math.pow(particle.cy - projectedTargetY, 2),
        );
        const distFromRing = Math.abs(currentDistToMouse - anim.ringRadius);
        let scaleFactor = 1 - distFromRing / 10;
        scaleFactor = Math.max(0, Math.min(1, scaleFactor));

        const finalScale =
          scaleFactor *
          (0.8 + Math.sin(t * anim.pulseSpeed) * 0.2 * anim.particleVariance) *
          anim.particleSize;
        dummy.scale.set(finalScale, finalScale, finalScale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });

      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <>
      {layers.map((layer, index) => (
        <instancedMesh
          key={layer.id}
          ref={(el) => {
            meshRefs.current[index] = el;
          }}
          args={[undefined, undefined, layer.particles.length]}
        >
          {layer.shape === "capsule" && (
            <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
          )}
          {layer.shape === "sphere" && <sphereGeometry args={[0.2, 16, 16]} />}
          {layer.shape === "box" && <boxGeometry args={[0.3, 0.3, 0.3]} />}
          {layer.shape === "tetrahedron" && (
            <tetrahedronGeometry args={[0.3]} />
          )}
          <meshBasicMaterial color={layer.color} toneMapped={false} />
        </instancedMesh>
      ))}
    </>
  );
}

export default function Antigravity(props: AntigravityProps) {
  const remountKey = [
    props.colors?.join("|") ?? props.color,
    props.capsuleCount,
    props.sphereCount,
    props.count,
    props.particleShape,
  ].join(":");

  return (
    <Canvas
      key={remountKey}
      camera={{ position: [0, 0, 50], fov: 35 }}
      gl={{ alpha: true, antialias: true }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <AntigravityInner {...props} />
    </Canvas>
  );
}
