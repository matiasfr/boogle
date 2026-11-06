// Sub-texel contacts never change the terrain bake. Owners add/remove only geometry that is actually present.
import { Vector4 } from 'three/webgpu';
import { uniform, uniformArray } from 'three/tsl';

import { TSL, type N } from './tsl.ts';
const CAPACITY = 512;
export type WaterContact = { x: number; z: number; radius: number; top: number };
const contacts = new Map<number, WaterContact>();
const records = Array.from({ length: CAPACITY }, () => new Vector4());
const data = uniformArray(records, 'vec4'),
  count = uniform(0);
let nextId = 0,
  revision = 0;
const sync = () => {
  let i = 0;
  for (const c of contacts.values()) records[i++]!.set(c.x, c.z, c.radius, c.top);
  count.value = i;
  revision++;
};
export function registerWaterContact(contact: WaterContact) {
  if (contacts.size >= CAPACITY) throw new Error(`Water contact capacity ${CAPACITY} exceeded`);
  const id = nextId++;
  contacts.set(id, contact);
  sync();
  return () => {
    if (contacts.delete(id)) sync();
  };
}
export const waterContacts = () => ({ revision, contacts: [...contacts.values()] });
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
