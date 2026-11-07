// The first path's lamps and solid walking approaches, owned and derived from T3 completion.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';

/** The two planks of each walking approach: grass up to the track's solid top, outside the 2.8 m bed, then a short landing
 * that stops at the sleepers' ends (they reach 1.15 m from the centre; the rails sit at 0.5 m), never across the track.
 * Pure, so the level check (dev/level/timber-track.ts) reads the same planks the game builds. */
export const APPROACH = { stops: [14, 30], foot: 4, shoulder: 1.6, landing: 1.2, width: 2.3, thick: 0.14, top: 0.1 };
export function approachPlanks(
  line: unknown,
  besideLine: (line: never, s: number, l: number) => { x: number; z: number },
  railY: (line: never, s: number) => number,
  ground: (x: number, z: number) => number,
) {
  const out: { ax: number; az: number; bx: number; bz: number; topA: number; topB: number }[] = [];
  for (const s of APPROACH.stops) {
    const foot = besideLine(line as never, s, APPROACH.foot),
      shoulder = besideLine(line as never, s, APPROACH.shoulder),
      landing = besideLine(line as never, s, APPROACH.landing);
    const top = railY(line as never, s) + APPROACH.top;
    out.push(
      { ax: foot.x, az: foot.z, bx: shoulder.x, bz: shoulder.z, topA: ground(foot.x, foot.z) - 0.02, topB: top },
      { ax: shoulder.x, az: shoulder.z, bx: landing.x, bz: landing.z, topA: top, topB: top },
    );
  }
  return out;
}

export async function createRailwayPath(owner: OwnedView) {
  const [{ LINKS, railY }, { besideLine }, { addStatic, plank, H }, { flat }, { pop }] = await Promise.all([
    import('../../proto/place/layout.ts'),
    import('../../proto/place/rail.ts'),
    import('../../proto/place/land.ts'),
    import('../../proto/flat.ts'),
    import('../../proto/minis/common.ts'),
  ]);
  const row = new THREE.Group();
  row.visible = false;
  const glow = readableUnlit(new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(3, 2.1, 0.9) }));
  const line = LINKS[0]!.line;
  const slots: { x: number; y: number; z: number }[] = [];
  for (let s = 116; s >= 60; s -= 7)
    for (const side of [-1, 1]) {
      const p = besideLine(line, s, side * 1.72),
        y = railY(line, s);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), flat('#5c4530'));
      post.position.set(p.x, y + 0.75, p.z);
      post.castShadow = true;
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), glow);
      light.position.set(p.x, y + 1.55, p.z);
      row.add(post, light);
      slots.push({ x: p.x, y: y + 0.75, z: p.z });
    }
  owner.add(row);
  owner.cleanup(() => glow.dispose());
  let placed = false;
  return {
    update(open: boolean, quiet = false) {
      row.visible = open;
      if (!open || placed) return;
      placed = true;
      // Join the grass beside the parked machine to the actual solid top (rail.ts TOP = 0.1).
      // Reach that height outside the 2.8 m bed before crossing its vertical side collider.
      for (const p of approachPlanks(line, besideLine, railY, H))
        plank(p.ax, p.az, p.bx, p.bz, p.topA, p.topB, APPROACH.width, '#8a6236', APPROACH.thick, owner);
      for (const at of slots) addStatic({ kind: 'box', hx: 0.06, hy: 0.75, hz: 0.06 }, at, undefined, undefined, owner);
      if (!quiet) pop(4, 0.25);
    },
  };
}
