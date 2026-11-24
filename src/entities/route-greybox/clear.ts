// A laid deck's slabs switching on where a player stands (route-greybox/leg-view.ts solidDeck: new geometry where
// people already are): lift or wait, never push sideways (orchestrator's calls, 24 November). If the body's feet are
// within STEP of the highest top among the slabs that hold it, and the whole body fits standing there, it is lifted
// onto that top (a lay over the unlaid bed lifts a body standing there, as leg 2's bed meant); otherwise every slab
// that holds it waits, neither solid nor drawn, as one set, until it is clear of them all. An area's mount is not
// this: it happens far from anyone (route-greybox/index.ts). Local presentation of accepted state: no state, no sync.
import * as THREE from 'three/webgpu';
import { HEAD_OFFSET, PLAYER_R } from '../../constants.ts';
import { me } from '../../player/player.ts';
import type { Shape } from '../../physics/engine.ts';
import { compiled } from '../../prefab/catalogue.ts';
import type { Placement } from '../../prefab/types.ts';
import type { GreyBox } from './boxes.ts';

/** The most a body's feet may be under a solid's top and still be lifted onto it. */
const STEP = 0.3,
  /** A sphere this far into a solid is resting on it, not in it. */
  CONTACT = 0.02;
const toLocal = new THREE.Quaternion(),
  rel = new THREE.Vector3(),
  top = new THREE.Vector3(),
  euler = new THREE.Euler(0, 0, 0, 'YXZ');
type P = { x: number; y: number; z: number };

/** A greybox box (yaw, then pitch about its x, as its collider is built) as a physics shape. */
export function boxShape(b: GreyBox): Shape {
  const q = new THREE.Quaternion().setFromEuler(euler.set(-(b.pitch ?? 0), b.yaw, 0));
  return {
    kind: 'box',
    hx: b.w / 2,
    hy: b.h / 2,
    hz: b.d / 2,
    offset: { x: b.x, y: b.y, z: b.z },
    rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
  };
}
const SPHERE_Y = [0, HEAD_OFFSET] as const;
/** `(x, y, z)` in shape `s`'s own frame (into `rel`). */
function local(s: Shape, x: number, y: number, z: number) {
  const o = s.offset,
    r = s.rotation;
  toLocal.set(r?.x ?? 0, r?.y ?? 0, r?.z ?? 0, r?.w ?? 1).invert();
  return rel.set(x - (o?.x ?? 0), y - (o?.y ?? 0), z - (o?.z ?? 0)).applyQuaternion(toLocal);
}
/** The lowest face of trimesh `s` straight over local point `l`, and how many faces are over it (odd: inside). */
function over(s: Extract<Shape, { kind: 'trimesh' }>, l: THREE.Vector3) {
  const v = s.vertices,
    ix = s.indices;
  let lowest = Infinity,
    count = 0;
  for (let t = 0; t < ix.length; t += 3) {
    const a = 3 * ix[t]!,
      b = 3 * ix[t + 1]!,
      c = 3 * ix[t + 2]!;
    const ax = v[a]!,
      az = v[a + 2]!,
      bx = v[b]! - ax,
      bz = v[b + 2]! - az,
      cx = v[c]! - ax,
      cz = v[c + 2]! - az,
      px = l.x - ax,
      pz = l.z - az,
      det = bx * cz - bz * cx;
    if (Math.abs(det) < 1e-9) continue; // a wall: seen edge-on from above
    const u = (px * cz - pz * cx) / det,
      w = (bx * pz - bz * px) / det;
    if (u < 0 || w < 0 || u + w > 1) continue;
    const y = v[a + 1]! + u * (v[b + 1]! - v[a + 1]!) + w * (v[c + 1]! - v[a + 1]!);
    if (y <= l.y) continue;
    count++;
    lowest = Math.min(lowest, y);
  }
  return { lowest, count };
}
/** If your body (either sphere) is in solid `s`, the height of the solid's top over it; else null. Boxes and
 * trimeshes (a closed prism, or one open underneath as the lands' are); other kinds never hold. */
export function heldTop(s: Shape, body: P = me.body!.position): number | null {
  if (s.kind === 'box') {
    let inside = false;
    for (const up of SPHERE_Y) {
      const l = local(s, body.x, body.y + up, body.z);
      const d = Math.hypot(
        Math.max(0, Math.abs(l.x) - s.hx),
        Math.max(0, Math.abs(l.y) - s.hy),
        Math.max(0, Math.abs(l.z) - s.hz),
      );
      if (d < PLAYER_R - CONTACT) {
        inside = true;
        break;
      }
    }
    if (!inside) return null;
    // The top face's height over the body: its local point at the body's (x, z), back in the world.
    const l = local(s, body.x, body.y, body.z),
      r = s.rotation;
    top
      .set(Math.max(-s.hx, Math.min(s.hx, l.x)), s.hy, Math.max(-s.hz, Math.min(s.hz, l.z)))
      .applyQuaternion(toLocal.set(r?.x ?? 0, r?.y ?? 0, r?.z ?? 0, r?.w ?? 1));
    return top.y + (s.offset?.y ?? 0);
  }
  if (s.kind === 'trimesh') {
    // In it: a sphere's centre under an odd number of faces, or its bottom less than a radius under the top.
    for (const up of SPHERE_Y) {
      const l = local(s, body.x, body.y + up - PLAYER_R + CONTACT, body.z),
        { lowest, count } = over(s, l);
      if (count % 2 === 1) return lowest + (s.offset?.y ?? 0);
    }
  }
  return null;
}
/** What switching `solids` on means for your body: `clear` (none holds it), `lifted` (its feet were within STEP of
 * the highest top among those that hold it, and the whole body fits standing there: it now stands on that top) or
 * `wait` (keep every solid that holds it off until it is clear). `held` lists the indices of the solids that hold it.
 * `world`: the scenery around (placedShapes), which must leave the lifted body room too (headroom). */
export function liftOrWait(
  solids: readonly Shape[],
  world: readonly Shape[] = [],
): { kind: 'clear' | 'lifted' | 'wait'; held: number[] } {
  const body = me.body;
  if (!body) return { kind: 'clear', held: [] };
  const p = body.position,
    held: number[] = [];
  let highest = -Infinity;
  solids.forEach((s, i) => {
    const t = heldTop(s, p);
    if (t === null) return;
    held.push(i);
    highest = Math.max(highest, t);
  });
  if (!held.length) return { kind: 'clear', held };
  if (p.y - PLAYER_R < highest - STEP) return { kind: 'wait', held };
  const y = highest + PLAYER_R + CONTACT,
    at = { x: p.x, y, z: p.z };
  // The destination must be clear: nothing of the set or of the scenery around holds the body standing there.
  if (solids.some((s) => heldTop(s, at) !== null) || world.some((s) => heldTop(s, at) !== null))
    return { kind: 'wait', held };
  p.set(p.x, y, p.z);
  body.interpolatedPosition?.set(p.x, y, p.z);
  body.velocity?.set(0, 0, 0);
  return { kind: 'lifted', held };
}
/** The solids of compiled placements (their prefabs' boxes and trimeshes, scaled, turned and placed as instantiate
 * builds them: rot is yaw, pitch, roll in YXZ order), for liftOrWait's `world`. A collider's own offset or turn is
 * not read: the greybox records have none. */
export function placedShapes(placements: readonly Placement[]): Shape[] {
  const q = new THREE.Quaternion();
  return placements.flatMap((p) => {
    const [yaw = 0, pitch = 0, roll = 0] = p.rot ?? [],
      [sx = 1, sy = 1, sz = 1] = p.scale ?? [];
    q.setFromEuler(euler.set(pitch, yaw, roll));
    const placed = { offset: { x: p.pos[0], y: p.pos[1], z: p.pos[2] }, rotation: { x: q.x, y: q.y, z: q.z, w: q.w } };
    return (compiled.prefabs[p.prefab]?.colliders ?? []).flatMap((c): Shape[] =>
      c.shape === 'box'
        ? [{ kind: 'box', hx: c.half[0] * sx, hy: c.half[1] * sy, hz: c.half[2] * sz, ...placed }]
        : c.shape === 'trimesh'
          ? [
              {
                kind: 'trimesh',
                vertices: c.vertices.map((v, i) => v * [sx, sy, sz][i % 3]!),
                indices: c.indices,
                ...placed,
              },
            ]
          : [],
    );
  });
}
