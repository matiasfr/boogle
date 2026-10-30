// Terrain rules: the dig, pile and flatten ops and the `terrain` state (the sand layer from ../terrain-logic.js) on the
// island's base heights. Lockstep: everything here runs the same on every peer (see ./README.md).
import { CELL, HALF, HOME, COURT } from '../grid.js';
import { createTerrainState, TERRAIN_OPS, EDIT_MIN_CM, EDIT_MAX_CM } from '../terrain-logic.js';
import { migrateTerrainDeltas } from '../legacy-grid.js';
import { PATCH } from '../../sim/mushrooms.js';
import { JUNK, bad, pickCell } from './edit-gen.js';

export const name = 'terrain';

// Which cells players may dig: sand (the beach band, or the court, which is sand even above the band) inside the home
// square (where the shared water runs), but not the mushroom garden. 1 = editable. Cell centres sit on a 0.25 m grid,
// so the squared court distance is exact (no Math.hypot, which browsers may round differently).
export function editableMask(base, n) {
  const mask = new Uint8Array(n * n);
  const r = COURT.r + 3;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const idx = i * n + j;
      const x = i * CELL - HALF,
        z = HALF - j * CELL;
      const dx = x - COURT.x,
        dz = z - COURT.z;
      const onCourt = dx * dx + dz * dz <= r * r;
      const home = x > HOME.x0 + 2 && x < HOME.x1 - 2 && z > HOME.z0 + 2 && z < HOME.z1 - 2;
      const inGarden =
        i >= PATCH.i0 - 4 && i <= PATCH.i0 + PATCH.w + 1 && j >= PATCH.j0 - 2 && j <= PATCH.j0 + PATCH.h + 1;
      const sandy = onCourt || (base[idx] >= EDIT_MIN_CM && base[idx] <= EDIT_MAX_CM);
      mask[idx] = home && !inGarden && sandy ? 1 : 0;
    }
  return mask;
}

// Saves from before the island grew carry no `n` and index a 129-cell grid: move their cells to where they are now.
export function migrateTerrain(json, n) {
  if (json && json.n === undefined && Array.isArray(json.d)) return { ...json, d: migrateTerrainDeltas(json.d, n) };
  return json;
}

export function install(sync, land) {
  const { n, base } = land;
  const state = createTerrainState({ base, n, editable: editableMask(base, n) });
  let loaded = []; // cell indices whose delta the last load changed (the adapter redraws them)
  for (const op of TERRAIN_OPS) sync.registerOp(op, { validate: state.validate, apply: state.apply });
  sync.registerState('terrain', {
    serialize: () => ({ ...state.serialize(), n }),
    load(json) {
      loaded = state.load(migrateTerrain(json, n));
    },
    hash: state.hash,
  });
  return { state, lastLoaded: () => loaded };
}

// Replay-test generators (./README.md): a sand cell the peer may dig, pile on or flatten, or junk.
const sandOf = new WeakMap(); // terrain state -> its editable cells
function sand(state) {
  let cells = sandOf.get(state);
  if (!cells) {
    cells = [];
    for (let c = 0; c < state.mask.length; c++) if (state.mask[c]) cells.push(c);
    sandOf.set(state, cells);
  }
  return cells;
}
const onSand = (op, extra) => (r, view) => {
  if (r.chance(JUNK)) return bad(r, op);
  const { state } = view.rules.terrain;
  const cell = pickCell(r, sand(state), state.n);
  return cell && { op, i: cell.i, j: cell.j, ...extra(r, state, cell.c) };
};
export const edits = {
  dig: onSand('dig', () => ({})),
  pile: onSand('pile', () => ({})),
  flatten: onSand('flatten', (r, state, c) => ({ h: state.base[c] + state.delta[c] + r.int(-60, 60) })),
};

// Sand is conserved: every cell's delta plus every player's bucket sums to zero.
export function invariants({ state }) {
  let sum = 0;
  for (const d of state.delta) sum += d;
  for (const [, carry] of state.serialize().players) sum += carry;
  return sum === 0 ? null : `sand not conserved: off by ${sum}`;
}
