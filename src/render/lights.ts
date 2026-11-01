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

const picks: { s: LightSource; on: number; score: number }[] = [];
onFrame(
  () => {
    picks.length = 0;
    for (const s of sources) {
      const on = s.on ? s.on() : 1;
      if (on <= 0.01) continue;
      const d2 = s.position.distanceToSquared(camera.position);
      if (d2 > (s.distance * 2.5) ** 2) continue;
      picks.push({ s, on, score: (s.intensity * on) / (1 + d2) });
    }
    picks.sort((a, b) => b.score - a.score);
    pool.forEach((l, k) => {
      const p = picks[k];
      if (!p) {
        l.intensity = 0;
        return;
      }
      l.position.copy(p.s.position);
      l.color.copy(p.s.color);
      l.distance = p.s.distance;
      // Fade in with distance so a light switching sources never pops.
      const d = Math.sqrt(p.s.position.distanceToSquared(camera.position));
      l.intensity = p.s.intensity * p.on * (1 - THREE.MathUtils.smoothstep(d, p.s.distance * 1.6, p.s.distance * 2.5));
    });
  },
  { phase: 'late' },
);
