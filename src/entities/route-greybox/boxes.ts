// Legacy Bell/West descriptors adapt to records until step 7. No collider construction lives here.
import type { OwnedView } from '../../render/owned-view.ts';
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import type { Placement } from '../../prefab/types.ts';

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
export async function drawGreyBoxes(owner: OwnedView, boxes: readonly (GreyBox | Placement)[]) {
  const placements = boxes.map((b, i): Placement =>
    'prefab' in b
      ? b
      : {
          id: `legacy.massing.${i}`,
          prefab: b.hidden ? 'greybox.collider' : b.solid === false ? 'greybox.decoration' : 'greybox.box',
          pos: [b.x, b.y, b.z],
          rot: [b.yaw, -(b.pitch ?? 0), 0],
          scale: [b.w, b.h, b.d],
          params: { colour: b.colour ?? '#9c9ea1' },
        },
  );
  const shown = placements.filter((p) => p.prefab !== 'greybox.collider');
  const batch = createPrefabBatch('greybox.box', Math.max(1, shown.length), owner);
  batch.mesh.count = shown.length;
  let solids = 0,
    index = 0;
  for (const p of placements) {
    const instance = instantiate(p.prefab, p, {
      owner,
      ...(p.prefab === 'greybox.collider' ? {} : { batch: { target: batch, index: index++ } }),
    });
    instance.setEnabled(true);
    solids += instance.bodies.length;
  }
  batch.mesh.computeBoundingBox();
  batch.mesh.computeBoundingSphere();
  return { mesh: batch.mesh, solids };
}
