// A small pool of point lights shared by everything that glows (cave lanterns, the lighthouse lamp, ...).
//
// Every point light in the scene costs every lit pixel, so instead of one light per lantern there are POOL lights, and
// each frame they go to the active sources nearest the camera. Sources still draw their own glow (emissive meshes);
// the pool only adds real light where you are. Cosmetic and local.
import * as THREE from 'three';
import { scene, camera } from './scene.ts';
import { onFrame } from '../loop.ts';
import { registerGraphics } from '../graphics-settings.ts';
import { lightSources as sources, type LightSource } from './light-sources.ts';

export { addLightSource, removeLightSource, type LightSource } from './light-sources.ts';

const POOL = 2;
const pool: THREE.PointLight[] = [];
let enabled = true;


for (let k = 0; k < POOL; k++) {
  const l = new THREE.PointLight('#ffffff', 0, 10, 2);
  pool.push(l);
  scene.add(l);
}
registerGraphics({
  id: 'lights',
  label: 'Point lights',
  choices: [true, false],
  default: true,
  applyMode: 'rebuild',
  cost: 'lit pixels and CPU selection',
  skips: 'Skips source selection and excludes both pool lights from lit draws; source glows stay visible.',
  hitch: 'Changing light membership can compile material variants on first use.',
  read: () => enabled,
  apply(value) {
    enabled = value === true;
    for (const light of pool) light.visible = enabled;
  },
});

// The POOL best sources this frame, best first (ties keep the earlier source). Reused: the hot path allocates nothing.
type Pick = { s: LightSource | null; on: number; score: number };
const picks: Pick[] = Array.from({ length: POOL }, () => ({ s: null, on: 0, score: 0 }));
onFrame(
  () => {
    if (!enabled) return;
    for (let k = 0; k < POOL; k++) picks[k]!.s = null;
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i]!;
      const on = s.on ? s.on() : 1;
      if (on <= 0.01) continue;
      const d2 = s.position.distanceToSquared(camera.position);
      const reach = s.distance * 2.5;
      if (d2 > reach * reach) continue;
      const score = (s.intensity * on) / (1 + d2);
      let k = POOL;
      while (k > 0 && (!picks[k - 1]!.s || score > picks[k - 1]!.score)) k--;
      if (k >= POOL) continue;
      const p = picks[POOL - 1]!; // the one that drops out makes room
      for (let m = POOL - 1; m > k; m--) picks[m] = picks[m - 1]!;
      picks[k] = p;
      p.s = s;
      p.on = on;
      p.score = score;
    }
    for (let k = 0; k < POOL; k++) {
      const l = pool[k]!,
        p = picks[k]!,
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
