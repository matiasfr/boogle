// Pure record-to-world scenery recipes. Preserve arithmetic order: these spheres predate prefabs.
import type { PrefabDef } from './types.ts';
export type Sphere = { x: number; y: number; z: number; r: number };
export type Lean = { angle: number; amount: number; height: number };
export type SceneryPose = { x: number; h: number; z: number; size?: number; lean?: Lean };
export function trunkPoints(x: number, h: number, z: number, lean: Lean, segments: number) {
  const points = [{ x, y: h - 0.3, z }];
  for (let k = 0; k < segments; k++) {
    const f = (k + 1) / segments;
    const off = lean.amount * f * f * lean.height;
    points.push({ x: x + Math.cos(lean.angle) * off, y: h + f * lean.height, z: z + Math.sin(lean.angle) * off });
  }
  return points;
}
export function collidersOf(def: PrefabDef, p: SceneryPose): Sphere[] {
  const size = p.size ?? 1;
  const out: Sphere[] = [];
  for (const c of def.colliders) {
    if (c.shape === 'sphere') {
      out.push({ x: p.x + c.at[0] * size, y: p.h + c.at[1] * size, z: p.z + c.at[2] * size, r: c.r * size });
    } else if (c.shape === 'trunk-chain') {
      if (!p.lean) throw new Error('prefabs: trunk-chain needs lean');
      const points = trunkPoints(p.x, p.h, p.z, p.lean, c.segments);
      for (let k = 0; k < c.segments; k++) out.push({ ...points[k]!, y: points[k]!.y + c.lift, r: c.r });
    } else throw new Error('prefabs: expected scenery sphere recipe');
  }
  return out;
}
export const footprintOf = (def: PrefabDef, p: SceneryPose) => {
  if (def.footprint === undefined) throw new Error('prefabs: scenery needs footprint');
  return def.footprint * (p.size ?? 1);
};
