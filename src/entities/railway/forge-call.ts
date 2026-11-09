// The forge's call: something waits on the pedestal by the forge. A tall pale steam plume while it waits, and a
// whistle that carries across the island on the frame it appears (docs/reviews/home-flow.md findings 2 and 3).
// The boiler and Split-rock's breaker share it. Local: it follows accepted state only, a live edge whistles and a
// restore never does.
import * as THREE from 'three/webgpu';
import { emit } from '../../render/particles.ts';
import { whistle } from '../../render/machine-sfx.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { reducedMotion } from '../../constants.ts';

/** Metres: the call reaches the pier's end and Far Head (about 600 m). */
export const FORGE_CALL_HEAR = 900;
const steam = new THREE.Color('#ffffff');

export function createForgeCall(at: { x: number; y: number; z: number }) {
  let waiting: boolean | null = null,
    puff = 0,
    k = 0;
  return {
    /** Snap to the state without a whistle (first frame, reload, late join, resync). */
    restore(now: boolean) {
      waiting = now;
      puff = 0;
    },
    update(dt: number, now: boolean) {
      if (waiting === null) waiting = now;
      if (now && !waiting) whistle(at.x, at.z, FORGE_CALL_HEAR);
      waiting = now;
      if (!now) return;
      puff -= dt;
      if (puff > 0) return;
      puff = reducedMotion ? 0.9 : 0.22;
      k++;
      // Big slow puffs: a column about 40 m tall, bright against the sky, that still reads from the pier.
      emit({
        x: at.x + Math.sin(k * 2.3) * 0.3,
        y: at.y + 2.2,
        z: at.z + Math.cos(k * 1.7) * 0.3,
        vx: 0.35 + Math.sin(k * 0.9) * 0.25,
        vy: 5.5,
        vz: Math.cos(k * 1.3) * 0.25,
        life: 10,
        size: 1.8,
        color: steam,
        intensity: readableIntensity() * 1.25,
        alpha: 0.95,
        drag: 0.06,
        grow: [1, 8],
        fade: 0.3,
        shape: 'dust',
        rotation: k,
        spin: 0.15,
      });
    },
    get waiting() {
      return !!waiting;
    },
  };
}
