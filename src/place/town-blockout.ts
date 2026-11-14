// Where the Round's blockout stands (docs/plans/home-flip.md, B3). The level's placements (content/levels/
// town-blockout.ts) are in each building's own frame: x across its front, z out of its door, y above its ground. This
// stands each at its `TOWN_BLOCKS` or `TOWN_FOOTING` row, on the ground under that building's centre (the plots' level
// pads; the green's floor under the footing). Pure: the view and the tests share it.
import { TOWN_BLOCKS, TOWN_FOOTING, toWorld } from './layout.ts';
import { townLocal } from './town-plan.ts';

type Frame = { x: number; z: number; yaw: number; w: number; d: number };
type Vec3 = readonly [number, number, number];
const FRAMES = new Map<string, Frame>([
  ...TOWN_BLOCKS.map((b): [string, Frame] => [`town.block.${b.id}`, b]),
  ['town.footing', TOWN_FOOTING],
]);

/** The plan row a blockout placement belongs to: its own id, or its block's for a door panel or mat. */
export function blockoutFrame(id: string): Frame {
  const frame = FRAMES.get(id.replace(/\.(door|mat)$/, ''));
  if (!frame) throw new Error(`town blockout: no plan row for ${id}`);
  return frame;
}

/** The placements in world metres, yawed with their buildings. */
export function standBlockout<P extends { id: string; pos: readonly number[] }>(
  placements: readonly P[],
  ground: (wx: number, wz: number) => number,
): (Omit<P, 'pos'> & { pos: Vec3; rot: Vec3 })[] {
  return placements.map((p) => {
    const frame = blockoutFrame(p.id),
      at = townLocal(frame, p.pos[0]!, p.pos[2]!);
    return {
      ...p,
      pos: [toWorld(at.x), ground(toWorld(frame.x), frame.z) + p.pos[1]!, at.z],
      rot: [frame.yaw, 0, 0],
    };
  });
}
