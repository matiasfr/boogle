// Before a greybox solid goes on (a laid deck's slab, a resident area's boxes), a player standing in it is moved clear
// by the shared clearance (src/place/site-clearance.ts siteExit, moving out of the box's footprint with sites.ts
// outOf): onto its top when only the feet are in it (a lay over the unlaid bed lifts a body standing there), else
// sideways out of it. A player resting on it or against it stays put. Local presentation of accepted state: no state.
import * as THREE from 'three/webgpu';
import { HEAD_OFFSET, PLAYER_R } from '../../constants.ts';
import { me } from '../../player/player.ts';
import { siteExit } from '../../place/site-clearance.ts';
import { outOf } from '../../place/sites.ts';
import type { GreyBox } from './boxes.ts';
import { compiled } from '../../prefab/catalogue.ts';
import type { Placement } from '../../prefab/types.ts';

const euler = new THREE.Euler(0, 0, 0, 'YXZ'),
  toBox = new THREE.Quaternion(),
  rel = new THREE.Vector3();
/** A point in box `b`'s own frame (pitch and all, as its collider is built). */
function local(b: GreyBox, p: { x: number; y: number; z: number }) {
  toBox.setFromEuler(euler.set(-(b.pitch ?? 0), b.yaw, 0)).invert();
  return rel.set(p.x - b.x, p.y - b.y, p.z - b.z).applyQuaternion(toBox);
}
/** Metres from `p` to box `b`, 0 inside. */
export function boxDistance(b: GreyBox, p: { x: number; y: number; z: number }) {
  const l = local(b, p);
  return Math.hypot(
    Math.max(0, Math.abs(l.x) - b.w / 2),
    Math.max(0, Math.abs(l.y) - b.h / 2),
    Math.max(0, Math.abs(l.z) - b.d / 2),
  );
}
/** The footprint the shared clearance moves a body out of. */
const footOf = (b: GreyBox) => ({ x: b.x, z: b.z, c: Math.cos(b.yaw), s: Math.sin(b.yaw), hw: b.w / 2, hd: b.d / 2 });
/** Where the shared clearance would move your body out of box `b` (its two spheres overlap it), or null if clear. */
export function exitFrom(b: GreyBox, contact = 0.02) {
  if (!me.body) return null;
  return siteExit(me.body.position, footOf(b), b.y, [], outOf, undefined, contact, (p) => boxDistance(b, p));
}
/** The most a body's feet may be under box `b`'s top and still be lifted onto it rather than moved out sideways. */
const STEP = 0.3;
/** Moves your body clear of box `b` before its collider goes on: onto its top if only the feet are in it, else out of
 * its footprint at the same height. True if it moved you. */
export function clearOf(b: GreyBox) {
  const body = me.body;
  if (!body) return false;
  const p = body.position,
    overlaps = [0, HEAD_OFFSET].some((up) => boxDistance(b, { x: p.x, y: p.y + up, z: p.z }) < PLAYER_R - 0.02);
  if (!overlaps) return false;
  const l = local(b, p),
    pitch = b.pitch ?? 0,
    top = b.y + (b.h / 2) * Math.cos(pitch) + l.z * Math.sin(pitch),
    inside = Math.abs(l.x) <= b.w / 2 && Math.abs(l.z) <= b.d / 2;
  let to: { x: number; y: number; z: number } | null = null;
  if (inside && p.y - PLAYER_R >= top - STEP) to = { x: p.x, y: top + PLAYER_R + 0.02, z: p.z };
  else {
    const exit = exitFrom(b);
    if (exit) to = { x: exit.x, y: p.y, z: exit.z };
  }
  if (!to) return false;
  p.set(to.x, to.y, to.z);
  body.interpolatedPosition?.set(to.x, to.y, to.z);
  body.velocity?.set(0, 0, 0);
  return true;
}
/** The solid boxes among compiled placements (a prefab whose one collider is its unit box at its origin, as
 * `greybox.box` and `greybox.collider`), as boxes in the world: the solids an area's mount turns on. */
export function placedBoxes(placements: readonly Placement[]): GreyBox[] {
  return placements.flatMap((p) => {
    const c = compiled.prefabs[p.prefab]?.colliders;
    if (c?.length !== 1 || c[0]!.shape !== 'box' || c[0]!.at.some((v) => v !== 0) || c[0]!.rot) return [];
    const [hx, hy, hz] = c[0]!.half,
      [sx = 1, sy = 1, sz = 1] = p.scale ?? [];
    return [
      {
        x: p.pos[0],
        y: p.pos[1],
        z: p.pos[2],
        w: 2 * hx * sx,
        h: 2 * hy * sy,
        d: 2 * hz * sz,
        yaw: p.rot?.[0] ?? 0,
        pitch: -(p.rot?.[1] ?? 0),
      },
    ];
  });
}
