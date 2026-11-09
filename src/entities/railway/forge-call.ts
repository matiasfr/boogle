// The forge's call: something waits on the pedestal by the forge. A tall pale steam plume while it waits, and a
// whistle that carries across the island on the frame it appears (docs/reviews/home-flow.md findings 2 and 3).
// The boiler and Split-rock's breaker share it. Local: it follows accepted state only, a live edge whistles and a
// restore never does.
//
// The plume is its own instanced mesh of puffs, not the shared particle pool: at the pier the pool turns over about
// 440 particles a second, so a 10 s puff from the forge is recycled within 2 s and the column never reached the sky
// (measured 9 November, `railway-works-at.ts` `worksprobe=1`). One draw, no shadows.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { material } from '../../render/materials.ts';
import { whistle } from '../../render/machine-sfx.ts';
import { reducedMotion } from '../../constants.ts';

/** Metres: the call reaches the pier's end and Far Head (about 600 m). */
export const FORGE_CALL_HEAR = 900;
/** Puffs in the column, the seconds one takes to rise, and the column's height and lean (metres). */
const PLUME = { puffs: 22, rise: 11, height: 62, lean: 8 } as const;

export function createForgeCall(at: { x: number; y: number; z: number }, owner: OwnedView) {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const puffs = new THREE.InstancedMesh(geometry, material('stone', { colour: '#f7f5f0' }), PLUME.puffs);
  geometry.dispose();
  puffs.frustumCulled = false;
  puffs.castShadow = false;
  puffs.count = 0;
  owner.add(puffs);
  const m = new THREE.Matrix4(),
    p = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    s = new THREE.Vector3();
  let waiting: boolean | null = null,
    clock = 0,
    // Seconds the plume has been rising: a new call grows its column from the pedestal up, it doesn't appear whole.
    shown = 0;
  function draw(dt: number) {
    clock += dt * (reducedMotion ? 0.3 : 1);
    shown = waiting ? shown + dt : 0;
    let n = 0;
    for (let i = 0; i < PLUME.puffs; i++) {
      const age = (clock + (i / PLUME.puffs) * PLUME.rise) % PLUME.rise;
      // Puffs older than the column itself are not out yet.
      if (!waiting || age > shown) continue;
      const u = age / PLUME.rise;
      // Fast off the pedestal, slowing and swelling as it climbs; it swells in at the bottom and thins out at the top.
      const up = 1 - (1 - u) * (1 - u);
      const r = (1.2 + u * 6) * Math.min(1, u * 8) * Math.min(1, (1 - u) * 3.5);
      p.set(
        at.x + up * PLUME.lean + Math.sin(i * 2.1 + clock * 0.7) * 0.5 * u,
        at.y + 2 + up * PLUME.height,
        at.z + Math.cos(i * 1.7 + clock * 0.5) * 0.5 * u,
      );
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, i * 1.3);
      puffs.setMatrixAt(n++, m.compose(p, q, s.set(r, r * 0.85, r)));
    }
    puffs.count = n;
    puffs.instanceMatrix.needsUpdate = true;
  }
  return {
    /** Snap to the state without a whistle (first frame, reload, late join, resync): a waiting call shows whole. */
    restore(now: boolean) {
      waiting = now;
      shown = now ? PLUME.rise : 0;
    },
    update(dt: number, now: boolean) {
      if (waiting === null) {
        waiting = now;
        shown = now ? PLUME.rise : 0;
      }
      if (now && !waiting) whistle(at.x, at.z, FORGE_CALL_HEAR);
      waiting = now;
      draw(dt);
    },
    get waiting() {
      return !!waiting;
    },
  };
}
