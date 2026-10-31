// Mushroom rules: the mush.plant and mush.water ops, the `mushrooms` state (the garden from ../../sim/mushrooms.ts) and
// its growth tick. Lockstep: everything here runs the same on every peer (see ./README.md).
import {
  createGarden,
  canPlant,
  plant,
  canWater,
  water,
  tickGarden,
  serializeGarden,
  loadGarden,
  hashGarden,
  PATCH,
  SPACING,
  MAX_PLOTS,
} from '../../sim/mushrooms.ts';
import { JUNK, bad } from './edit-gen.ts';
import type { SyncView, Land, Stream, Rules } from './types.ts';
import type { Garden } from '../../sim/mushrooms.ts';

export const name = 'mushrooms';

type Cell = { i: number; j: number };
type PlantEnv = { canPlantAt: (i: number, j: number) => boolean };

export function install(sync: SyncView, land: Land) {
  const { n } = land;
  const garden = createGarden();
  // Host check before a seed goes in: room in the garden, off the grid's edge, then env.canPlantAt (the host's render
  // side check for dry, open land: water, rocks, trees and caps are not lockstep state).
  const plantOk = (i: number, j: number, env: PlantEnv) =>
    canPlant(garden, i, j) && i >= 1 && j >= 1 && i <= n - 2 && j <= n - 2 && env.canPlantAt(i, j);
  sync.registerOp<Cell>('mush.plant', {
    validate: (e, ctx) => plantOk(e.i, e.j, ctx.env as PlantEnv),
    apply: (e) => plant(garden, e.i, e.j),
  });
  sync.registerOp<Cell>('mush.water', {
    validate: (e) => canWater(garden, e.i, e.j),
    apply: (e) => water(garden, e.i, e.j),
  });
  sync.registerState('mushrooms', {
    serialize: () => serializeGarden(garden),
    load: (json) => loadGarden(garden, json),
    hash: () => hashGarden(garden),
  });
  sync.onTick(() => tickGarden(garden), 'mushrooms');
  return { garden, plantOk, plant: (i: number, j: number) => plant(garden, i, j) };
}

// Replay-test generators (./README.md): seeds around the stall's patch, water on a dry plot, or junk.
export const edits = {
  'mush.plant': (r: Stream) =>
    r.chance(JUNK)
      ? bad(r, 'mush.plant')
      : {
          op: 'mush.plant',
          i: r.int(PATCH.i0 - 4, PATCH.i0 + PATCH.w + 4),
          j: r.int(PATCH.j0 - 4, PATCH.j0 + PATCH.h + 4),
        },
  'mush.water': (r: Stream, view: { rules: Rules }) => {
    if (r.chance(JUNK)) return bad(r, 'mush.water');
    const dry = view.rules.mushrooms.garden.plots.filter((p) => p.g === 0);
    const p = dry.length ? r.pick(dry) : null;
    return p && { op: 'mush.water', i: p.i, j: p.j };
  },
};

// Plots stay apart and within the cap.
export function invariants({ garden }: { garden: Garden }): string | null {
  const { plots } = garden;
  if (plots.length > MAX_PLOTS) return `${plots.length} plots`;
  for (let a = 0; a < plots.length; a++)
    for (let b = a + 1; b < plots.length; b++)
      if (Math.max(Math.abs(plots[a].i - plots[b].i), Math.abs(plots[a].j - plots[b].j)) < SPACING)
        return `plots ${a} and ${b} too close`;
  return null;
}
