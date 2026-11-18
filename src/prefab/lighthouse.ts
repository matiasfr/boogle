// The lighthouse's shape from its record's authored dimensions (content/prefabs/pois.ts, `poi.lighthouse`): shared by
// its builder (the drawn tower, deck and stair) and its collider recipe, so the two can't drift apart. Local frame:
// the origin is the middle of the flat pad the plinth stands on; the stair's foot faces local -x.
// The colliders resolve here when the catalogue loads; the artifact keeps only the dimensions.
import * as THREE from 'three';
import type { ColliderDef, JsonObject } from './types.ts';

export type LighthouseDims = {
  plinthH: number;
  plinthR: number;
  towerH: number;
  rBottom: number;
  rTop: number;
  deckR: number;
  stairW: number;
  turns: number;
  /** Physics ramp segments. */
  segments: number;
  /** The first bit of stair has no railing, so it's easy to step on from the side. */
  railFrom: number;
  /** The deck is left open this high above the last stretch of stair (head room). */
  headroom: number;
};

export function lighthouseDims(params: JsonObject): LighthouseDims {
  const keys = [
    'plinthH',
    'plinthR',
    'towerH',
    'rBottom',
    'rTop',
    'deckR',
    'stairW',
    'turns',
    'segments',
    'railFrom',
    'headroom',
  ] as const;
  for (const key of keys) {
    const value = params[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
      throw new Error(`prefabs: invalid lighthouse ${key}`);
  }
  if (!Number.isInteger(params.segments)) throw new Error('prefabs: lighthouse segments must be integer');
  return params as unknown as LighthouseDims;
}

export function lighthouseShape(d: LighthouseDims) {
  const base = d.plinthH; // tower foot, stair start
  const deck = base + d.towerH; // walkable top of the gallery deck
  const startA = Math.PI; // the stair's foot faces inland (local -x)
  const gap = (d.headroom / (d.towerH / d.turns)) * Math.PI * 2;
  const endA = startA + d.turns * Math.PI * 2;
  const towerR = (y: number) => d.rBottom + (d.rTop - d.rBottom) * THREE.MathUtils.clamp((y - base) / d.towerH, 0, 1);
  const stairY = (u: number) => base + u * d.towerH;
  const stairA = (u: number) => startA + u * d.turns * Math.PI * 2;
  const at = (a: number, r: number, y: number) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  return {
    base,
    deck,
    startA,
    deckStart: endA % (Math.PI * 2),
    deckSpan: Math.PI * 2 - gap,
    towerR,
    stairY,
    stairA,
    at,
  };
}

// A box spanning from p to q (centre line), w wide (horizontal, perpendicular), t thick (vertical-ish).
function boxBetween(p0: THREE.Vector3, p1: THREE.Vector3, w: number, t: number) {
  const mid = p0.clone().add(p1).multiplyScalar(0.5);
  const dir = p1.clone().sub(p0);
  const len = dir.length();
  dir.normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const upv = new THREE.Vector3().crossVectors(dir, side).normalize(); // right-handed basis (side, upv, dir)
  const basis = new THREE.Matrix4().makeBasis(side, upv, dir);
  return { mid, quat: new THREE.Quaternion().setFromRotationMatrix(basis), size: new THREE.Vector3(w, t, len) };
}

/** The smooth helical ramp, its low outer wall and the deck ring with its railing; then the tower, lantern room and
 * plinth. Rotations go through three's YXZ Euler, as every record collider's does. */
export function lighthouseColliders(d: LighthouseDims): ColliderDef[] {
  const { base, deckStart, deckSpan, towerR, stairY, stairA, at } = lighthouseShape(d);
  const out: ColliderDef[] = [];
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const add = (b: ReturnType<typeof boxBetween>) => {
    euler.setFromQuaternion(b.quat, 'YXZ');
    out.push({
      shape: 'box',
      at: [b.mid.x, b.mid.y, b.mid.z],
      half: [b.size.x / 2, b.size.y / 2, b.size.z / 2],
      rot: [euler.y, euler.x, euler.z],
    });
  };
  for (let k = 0; k < d.segments; k++) {
    const u0 = k / d.segments,
      u1 = (k + 1) / d.segments;
    const r0 = towerR(stairY(u0)) + 0.03 + d.stairW / 2,
      r1 = towerR(stairY(u1)) + 0.03 + d.stairW / 2;
    const ramp = boxBetween(
      at(stairA(u0), r0, stairY(u0) - 0.14),
      at(stairA(u1), r1, stairY(u1) - 0.14),
      d.stairW,
      0.28,
    );
    ramp.size.z *= 1.12; // overlap so there are no seams to catch on
    add(ramp);
    const wall = boxBetween(
      at(stairA(u0), r0 + d.stairW / 2 + 0.05, stairY(u0) + 0.5),
      at(stairA(u1), r1 + d.stairW / 2 + 0.05, stairY(u1) + 0.5),
      0.1,
      1.2,
    );
    wall.size.z *= 1.1;
    if (u0 >= d.railFrom) add(wall);
  }
  const deck = base + d.towerH;
  for (let k = 0; k < 24; k++) {
    const a0 = deckStart + (k / 24) * deckSpan,
      a1 = deckStart + ((k + 1) / 24) * deckSpan;
    const seg = boxBetween(
      at(a0, (d.rTop + d.deckR) / 2, deck - 0.15),
      at(a1, (d.rTop + d.deckR) / 2, deck - 0.15),
      d.deckR - d.rTop + 0.2,
      0.3,
    );
    seg.size.z *= 1.15;
    add(seg);
    const rail = boxBetween(at(a0, d.deckR, deck + 0.6), at(a1, d.deckR, deck + 0.6), 0.1, 1.2);
    rail.size.z *= 1.1;
    add(rail);
  }
  const mid = base + d.towerH / 2;
  out.push(
    { shape: 'cylinder', at: [0, mid, 0], rTop: d.rTop, rBottom: d.rBottom, h: d.towerH, segments: 16 },
    { shape: 'cylinder', at: [0, mid + d.towerH / 2 + 1.5, 0], rTop: 1.45, rBottom: 1.45, h: 3, segments: 12 },
    {
      shape: 'cylinder',
      at: [0, mid - d.towerH / 2 - 0.45, 0],
      rTop: d.plinthR,
      rBottom: d.plinthR,
      h: d.plinthH + 0.6,
      segments: 10,
    },
  );
  return out;
}
