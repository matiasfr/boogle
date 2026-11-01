// The era's sky and fog (docs/research/era-progression.md, recs 1, 3 and 11): a Local tint over whatever the day and
// night cycle (src/render/sky.ts) set this frame, so it follows sunrise and night like the rest of the sky. Each era's
// kit (./blocks.ts `sky`) names a dome top and horizon tint, how far toward them, and how far the fog reaches: the
// wood age is clear and fresh, steam is an amber haze with the fog closer in. Only with ?proto=era (this chunk loads
// behind the flag); the global sky is untouched otherwise. Called each frame by ./index.ts, after updateSky.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { skyColors, atmosphere } from '../../render/sky.ts';
import { ERAS } from './blocks.ts';

type Tint = { top: THREE.Color; horizon: THREE.Color; amount: number; near: number; far: number };
const tint = (e: number): Tint => {
  const s = ERAS[e].sky;
  return { ...s, top: new THREE.Color(s.top), horizon: new THREE.Color(s.horizon) };
};
const A = tint(1),
  B = tint(2);
const top = new THREE.Color(),
  horizon = new THREE.Color(),
  tmp = new THREE.Color();

const luma = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
// Moves `c` toward the tint's hue at c's own brightness, so night stays dark and a sunset stays a sunset.
function toward(c: THREE.Color, t: THREE.Color, amount: number): void {
  const k = luma(c) / Math.max(1e-4, luma(t));
  c.lerp(tmp.copy(t).multiplyScalar(k), amount);
}

/** mix: 0 shows era 1's look, 1 era 2's, between while the swap crosses over. */
export function updateAtmosphere(mix: number): void {
  const fog = scene.fog as THREE.Fog | null;
  top.copy(A.top).lerp(B.top, mix);
  horizon.copy(A.horizon).lerp(B.horizon, mix);
  const amount = A.amount + (B.amount - A.amount) * mix;
  toward(skyColors.top, top, amount);
  toward(skyColors.horizon, horizon, amount);
  if (!fog || atmosphere.underground > 0) return; // the caves keep their own fog
  fog.color.copy(skyColors.horizon);
  fog.near *= A.near + (B.near - A.near) * mix;
  fog.far *= A.far + (B.far - A.far) * mix;
}
