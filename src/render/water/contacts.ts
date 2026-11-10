// Sub-texel contacts never change the terrain bake. Owners add/remove only geometry that is actually present.
// The sea's shader loops over the contacts it is sent for every water pixel within 180 m of the camera (surface.ts), so
// it is sent only the nearest LIMIT that can reach such a pixel, re-picked when the camera has moved MOVE metres or a
// contact comes or goes. All of them were sent before: about 160 trestle legs at Far Head, every pixel, every frame
// (the 9 November iPhone froze there). Spray (spray.ts) still reads every contact.
import { Vector4 } from 'three/webgpu';
import { uniform, uniformArray } from 'three/tsl';

import { TSL, type N } from './tsl.ts';
const CAPACITY = 512;
const LIMIT = 64; // 48 were within reach at most, at the Head with trains running (9 November)
const REACH = 180 + 0.65; // surface.ts: the contact loop's camera range, plus the foam ring's width
const MOVE = 4;
export type WaterContact = { x: number; z: number; radius: number; top: number };
const contacts = new Map<number, WaterContact>();
const records = Array.from({ length: CAPACITY }, () => new Vector4());
const data = uniformArray(records, 'vec4');
let nextId = 0,
  revision = 0,
  limit = LIMIT,
  reach = REACH;
let pickedAt = { x: Infinity, z: Infinity, revision: -1, limit, reach };
const near: { c: WaterContact; d: number }[] = [];
function pick(x: number, z: number) {
  near.length = 0;
  for (const c of contacts.values()) {
    const d = Math.hypot(c.x - x, c.z - z) - c.radius;
    if (d < reach + MOVE) near.push({ c, d });
  }
  near.sort((a, b) => a.d - b.d);
  const n = Math.min(near.length, limit);
  for (let i = 0; i < n; i++) {
    const { c } = near[i]!;
    records[i]!.set(c.x, c.z, c.radius, c.top);
  }
  pickedAt = { x, z, revision, limit, reach };
  return n;
}
let picked = 0;
// Read once per render that draws the sea, from that render's camera; a camera that is not a view (none here today)
// keeps the last pick.
const count = uniform(0).onRenderUpdate(({ camera }) => {
  if (!(camera as { isPerspectiveCamera?: boolean } | null)?.isPerspectiveCamera) return picked;
  const { x, z } = camera!.position;
  if (
    pickedAt.revision !== revision ||
    pickedAt.limit !== limit ||
    pickedAt.reach !== reach ||
    Math.hypot(x - pickedAt.x, z - pickedAt.z) > MOVE
  )
    picked = pick(x, z);
  return picked;
});
export function registerWaterContact(contact: WaterContact) {
  if (contacts.size >= CAPACITY) throw new Error(`Water contact capacity ${CAPACITY} exceeded`);
  const id = nextId++;
  contacts.set(id, contact);
  revision++;
  return () => {
    if (contacts.delete(id)) revision++;
  };
}
/** For A/B cost evals (dev/look): send at most `n` contacts (0 turns the loop off) from within `metres` of the camera;
 *  setWaterContactLimit(512, Infinity) is the old behaviour, every contact everywhere. */
export function setWaterContactLimit(n = LIMIT, metres = REACH) {
  limit = Math.max(0, Math.min(CAPACITY, Math.round(n)));
  reach = metres;
}
export const waterContacts = () => ({ revision, contacts: [...contacts.values()], sent: picked });
export const waterContactRevision = () => revision;
export function contactDistance(xz: N) {
  return TSL.Fn(() => {
    const distance = TSL.float(1e5).toVar();
    TSL.Loop(count, ({ i }: { i: N }) => {
      const c: N = data.element(i);
      distance.assign(TSL.min(distance, TSL.length(xz.sub(c.xy)).sub(c.z)));
    });
    return distance;
  })();
}
