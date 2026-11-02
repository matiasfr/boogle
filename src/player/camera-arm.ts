// The camera's arm: from something it follows out to where it wants to be, kept out of solid things. Unreal's spring arm,
// Cinemachine's deoccluder and Godot's SpringArm3D do this; here the sweep is a sphere as big as the lens's near plane
// (docs/research/third-person-camera.md, rec 6). Any camera can have one, and nothing it should respect needs telling:
// anything static in `mask` counts, so a new building or cliff blocks it on the day it's added. Thin things (a trunk, a
// post: narrower than 1.6 m, see sweepSphere in src/physics/engine.ts, or a body's `seeThrough`) don't pull it in from
// afar, as a camera that zoomed for every palm would pump all the way along a beach; only one right at the lens moves it.
// What moves (players, the ball, a train) never blocks it. Local, render only.
//
// By default it pulls in at once and eases back out after a beat, and is exactly on the wanted spot when nothing's in the
// way, so walking in the open has no lag. `glide` eases it in as well, for a fast vehicle, where a jump hurts more than a
// moment with a rock at the edge; `min` keeps it that far out however close things get.
import * as THREE from 'three/webgpu';
import { sweepSphere } from '../physics/engine.ts';
import { camera } from '../render/scene.ts';

const THIN_NEAR = 0.7; // m back from the lens where thin things count
const HOLD_MS = 120; // how long it stays pulled in before easing out, so passing things don't make it pump
const RECOVER = 0.3; // s: its time constant easing out
const SETTLED = 0.01; // m
// The two sweeps' options, kept: a camera runs this every frame (npm run hitches). sweepSphere doesn't hold on to them.
const SOLID = { mask: 0, thin: 'skip' as const },
  THIN = { mask: 0, thin: 'only' as const };

export type Glide = { in: number; out: number; maxIn: number; maxOut: number }; // per s, per s, m/s, m/s
export type CameraArm = {
  /** Moves `to` along the line from `from` until it's clear of what's in `mask`. */
  solve(from: THREE.Vector3, to: THREE.Vector3, mask: number): void;
  /** Next solve starts afresh (after a teleport, or when this camera takes over). */
  reset(): void;
};

// Big enough to hold the near plane's corners from the lens, whatever the lens is set to now.
function lensRadius() {
  const half = camera.near * Math.tan((camera.fov * Math.PI) / 360);
  const corner = Math.hypot(camera.near, half, half * camera.aspect);
  return Math.max(0.25, corner + 0.05);
}

export function makeCameraArm({ min = 0, glide }: { min?: number; glide?: Glide } = {}): CameraArm {
  const dir = new THREE.Vector3(),
    a = new THREE.Vector3(),
    b = new THREE.Vector3();
  let at = Infinity, // m out along the arm now
    wasFull = 0,
    holdUntil = 0,
    last = 0;
  return {
    reset() {
      at = Infinity;
    },
    solve(from, to, mask) {
      const now = performance.now(),
        dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const full = dir.subVectors(to, from).length();
      if (full < 1e-3) return;
      dir.divideScalar(full);
      const r = lensRadius();

      let safe = full;
      SOLID.mask = THIN.mask = mask;
      const solid = sweepSphere(from, to, r, SOLID);
      if (solid >= 0) safe = solid;
      const start = Math.max(0, safe - THIN_NEAR);
      a.copy(from).addScaledVector(dir, start);
      b.copy(from).addScaledVector(dir, safe);
      const thin = sweepSphere(a, b, r, THIN);
      if (thin >= 0) safe = start + thin;
      safe = Math.min(full, Math.max(safe, min));

      const free = safe >= full && at >= wasFull - SETTLED; // nothing in the way, and not on the way back out
      wasFull = full;
      if (free || at === Infinity) at = safe;
      else if (glide) {
        const rate = 1 - Math.exp(-dt * (safe < at ? glide.in : glide.out));
        at += Math.max(-glide.maxIn * dt, Math.min(glide.maxOut * dt, (safe - at) * rate));
      } else if (safe < at) {
        at = safe;
        holdUntil = now + HOLD_MS;
      } else if (now >= holdUntil) at += (safe - at) * (1 - Math.exp(-dt / RECOVER));
      at = Math.min(at, full);
      to.copy(from).addScaledVector(dir, at);
    },
  };
}
