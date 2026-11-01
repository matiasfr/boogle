// A small pool of point lights shared by everything that glows (cave lanterns, the lighthouse lamp, ...).
//
// Every point light in the scene costs every lit pixel, so instead of one light per lantern there are POOL lights, and
// each frame they go to the active sources nearest the camera. Sources still draw their own glow (emissive meshes);
// the pool only adds real light where you are. Cosmetic and local.
import * as THREE from 'three';
import { scene, camera } from './scene.ts';
import { onFrame } from '../loop.ts';

const POOL = 2;
/** Something that glows: the pool lights the nearest few. on() scales it, 0..1. */
export type LightSource = {
  position: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
  distance: number;
  on?: () => number;
};
const pool: THREE.PointLight[] = [];
const sources: LightSource[] = [];

// source: { position: Vector3, color, intensity, distance, on?: () => 0..1 }. Returns it (change fields freely).
export function addLightSource(spec: Omit<LightSource, 'color'> & { color?: THREE.ColorRepresentation }) {
  const src = spec as LightSource; // the caller's own object: it may change its fields later
  src.color = new THREE.Color(spec.color ?? '#ffcf8a');
  sources.push(src);
  return src;
}

for (let k = 0; k < POOL; k++) {
  const l = new THREE.PointLight('#ffffff', 0, 10, 2);
  pool.push(l);
  scene.add(l);
}

// The POOL best sources this frame, best first (ties keep the earlier source). Reused: the hot path allocates nothing.
type Pick = { s: LightSource | null; on: number; score: number };
const picks: Pick[] = Array.from({ length: POOL }, () => ({ s: null, on: 0, score: 0 }));
onFrame(
  () => {
    for (let k = 0; k < POOL; k++) picks[k].s = null;
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      const on = s.on ? s.on() : 1;
      if (on <= 0.01) continue;
      const d2 = s.position.distanceToSquared(camera.position);
      const reach = s.distance * 2.5;
      if (d2 > reach * reach) continue;
      const score = (s.intensity * on) / (1 + d2);
      let k = POOL;
      while (k > 0 && (!picks[k - 1].s || score > picks[k - 1].score)) k--;
      if (k >= POOL) continue;
      const p = picks[POOL - 1]; // the one that drops out makes room
      for (let m = POOL - 1; m > k; m--) picks[m] = picks[m - 1];
      picks[k] = p;
      p.s = s;
      p.on = on;
      p.score = score;
    }
    for (let k = 0; k < POOL; k++) {
      const l = pool[k],
        p = picks[k],
        s = p.s;
      if (!s) {
        l.intensity = 0;
        continue;
      }
      l.position.copy(s.position);
      l.color.copy(s.color);
      l.distance = s.distance;
      // Fade in with distance so a light switching sources never pops.
      const d = Math.sqrt(s.position.distanceToSquared(camera.position));
      l.intensity = s.intensity * p.on * (1 - THREE.MathUtils.smoothstep(d, s.distance * 1.6, s.distance * 2.5));
    }
  },
  { phase: 'late' },
);
