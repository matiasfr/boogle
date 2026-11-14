// Static massing uses compiled placements. GreyBox/span remain only for the dynamic leg's descriptor API.
import type { OwnedView } from '../../render/owned-view.ts';
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import type { Placement } from '../../prefab/types.ts';
import { compiled } from '../../prefab/catalogue.ts';

export type GreyBox = {
  x: number;
  y: number;
  z: number;
  /** Across, up and along (its local x, y, z), metres. */
  w: number;
  h: number;
  d: number;
  yaw: number;
  /** Radians about its local x: positive lifts its +z end. */
  pitch?: number;
  colour?: string;
  solid?: boolean;
  hidden?: boolean;
};

/** A box between two points (the middle of its top face runs from `a` to `b`), `w` wide and `h` thick. */
export function span(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  w: number,
  h: number,
  colour: string,
  solid = true,
): GreyBox {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    dy = b.y - a.y,
    run = Math.hypot(dx, dz),
    pitch = Math.atan2(dy, run);
  return {
    x: (a.x + b.x) / 2,
    // The top face passes through a and b: the centre is half a thickness down its own normal.
    y: (a.y + b.y) / 2 - (h / 2) * Math.cos(pitch),
    z: (a.z + b.z) / 2,
    w,
    h,
    d: Math.hypot(run, dy),
    yaw: Math.atan2(dx, dz),
    pitch,
    colour,
    solid,
  };
}

/** Draw all visible records in one shared batch, preserving body and instance insertion order. */
export async function drawGreyBoxes(owner: OwnedView, placements: readonly Placement[]) {
  const slots = (p: Placement) => {
    const visual = compiled.prefabs[p.prefab]!.visual;
    return 'builder' in visual ? (visual.instances?.length ?? 1) : 0;
  };
  const count = placements.reduce((n, p) => n + slots(p), 0);
  const batch = createPrefabBatch('greybox.box', Math.max(1, count), owner);
  batch.mesh.count = count;
  let solids = 0,
    index = 0;
  for (const p of placements) {
    const instance = instantiate(p.prefab, p, {
      owner,
      ...(slots(p) ? { batch: { target: batch, index } } : {}),
    });
    index += slots(p);
    instance.setEnabled(true);
    solids += instance.bodies.length;
  }
  batch.mesh.computeBoundingBox();
  batch.mesh.computeBoundingSphere();
  return { mesh: batch.mesh, solids };
}
