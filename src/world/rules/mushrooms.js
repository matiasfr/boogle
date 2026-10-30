// Mushroom rules: the mush.plant and mush.water ops, the `mushrooms` state (the garden from ../../sim/mushrooms.js) and
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
} from '../../sim/mushrooms.js';
import { isLegacyCell, LEGACY_SHIFT } from '../legacy-grid.js';

export const name = 'mushrooms';

// Snapshots from before the island grew are bare arrays on the old 129-cell grid; move those cells. Current saves
// ({ v: 2, p }) pass through, so it is safe to run twice.
export function migrateGarden(json) {
  return Array.isArray(json)
    ? json.map((v, k) => (k % 3 < 2 && isLegacyCell(json[k - (k % 3)], json[k - (k % 3) + 1]) ? v + LEGACY_SHIFT : v))
    : json;
}

export function install(sync, land) {
  const { n } = land;
  const garden = createGarden();
  // Host check before a seed goes in: room in the garden, off the grid's edge, then env.canPlantAt (the host's render
  // side check for dry, open land: water, rocks, trees and caps are not lockstep state).
  const plantOk = (i, j, env) =>
    canPlant(garden, i, j) && i >= 1 && j >= 1 && i <= n - 2 && j <= n - 2 && env.canPlantAt(i, j);
  sync.registerOp('mush.plant', {
    validate: (e, ctx) => plantOk(e.i, e.j, ctx.env),
    apply: (e) => plant(garden, e.i, e.j),
  });
  sync.registerOp('mush.water', {
    validate: (e) => canWater(garden, e.i, e.j),
    apply: (e) => water(garden, e.i, e.j),
  });
  sync.registerState('mushrooms', {
    serialize: () => serializeGarden(garden),
    load: (json) => loadGarden(garden, migrateGarden(json)),
    hash: () => hashGarden(garden),
  });
  sync.onTick(() => tickGarden(garden), 'mushrooms');
  return { garden, plantOk, plant: (i, j) => plant(garden, i, j) };
}
