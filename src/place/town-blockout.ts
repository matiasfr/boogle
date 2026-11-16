// Where the Round's blockout stands (docs/plans/home-flip.md, B3). The level's placements (content/levels/
// town-blockout.ts) are in each building's own frame: x across its front, z out of its door, y above its ground. This
// stands each at its `TOWN_BLOCKS` or `TOWN_FOOTING` row, on the ground under that building's centre (the plots' level
// pads; the green's floor under the footing). Pure: the view and the tests share it.
import { TOWN_BLOCKS, TOWN_FOOTING, TOWN_STATUE, TOWN_STATUE_WORKS, toWorld } from './layout.ts';
import { townLocal } from './town-plan.ts';

/** Restore the eight solid spacing blocks for a layout walk (town-economy-visible, N1). */
export const PLOT_BLOCKS: boolean = false;

type Frame = { x: number; z: number; yaw: number; w: number; d: number };
type Vec3 = readonly [number, number, number];
const FRAMES = new Map<string, Frame>([
  ...TOWN_BLOCKS.map((b): [string, Frame] => [`town.block.${b.id}`, b]),
  ['town.footing', TOWN_FOOTING],
  ['town.statue', TOWN_STATUE],
]);

/** The plan row a blockout placement belongs to: its own id, or its block's for a door panel or mat. */
export function blockoutFrame(id: string): Frame {
  const frame = FRAMES.get(id.replace(/\.(door|mat|outline\.[0-3])$/, ''));
  if (!frame) throw new Error(`town blockout: no plan row for ${id}`);
  return frame;
}

/** The placements in world metres, yawed with their buildings. The unfinished statue takes its own, squared frame. */
export function standBlockout<P extends { id: string; prefab?: string; pos: readonly number[] }>(
  placements: readonly P[],
  ground: (wx: number, wz: number) => number,
  plotBlocks = PLOT_BLOCKS,
): (Omit<P, 'pos'> & { pos: Vec3; rot: Vec3 })[] {
  return placements
    .filter((p) => {
      if (!p.id.startsWith('town.block.')) return true;
      if (p.id.includes('.outline.')) return !plotBlocks;
      return plotBlocks || p.id.endsWith('.mat');
    })
    .map((p) => {
      const frame = p.prefab === 'town.statue-works' ? TOWN_STATUE_WORKS : blockoutFrame(p.id),
        at = townLocal(frame, p.pos[0]!, p.pos[2]!);
      return {
        ...p,
        pos: [toWorld(at.x), ground(toWorld(frame.x), frame.z) + p.pos[1]!, at.z],
        rot: [frame.yaw, 0, 0],
      };
    });
}

/** The footprints the little guys walk round (src/place/sites.ts `addFoot`): one per solid piece, since they steer
 * by footprints and not by colliders. Takes the stood placements; the marks have no footprint. The monument at G has
 * one: the footing's, which encloses the statue's plinth. A second, turned footprint for the statue overlapped it and
 * left a villager pacing between their corners (review, 14 November; test/town-statue-folk.test.ts). */
export function blockoutFeet(stood: readonly { id: string; pos: readonly number[] }[]) {
  return stood
    .filter((p) => !/\.(door|mat|outline\.[0-3])$/.test(p.id) && p.id !== 'town.statue')
    .map((p) => {
      const frame = blockoutFrame(p.id);
      return { x: p.pos[0]!, z: p.pos[2]!, yaw: frame.yaw, hw: frame.w / 2, hd: frame.d / 2 };
    });
}
