// The cliff kit's shore (docs/plans/cliff-kit-everywhere.md, step 1; generated as
// `content/built/levels/cliff-kit-shore.json` by dev/prefab/cliff-kit.ts): what a new player meets first. The cove's
// sculpted face is gone (owner, 24 November: "Replace with kit faces"); its bluff is ground now (src/place/cove.ts
// coveBluff), so the walk up its beachward end is ground and never a kit top, and the kit stands over the bluff's front
// and the shore climb's wall (census wall 9) as scenery with box solids, laid by runs along them. Its rules beyond the
// kit's own:
// - Nothing on the walk: the bluff's walkable end (z 36 to 50, its west flank to the beach included) stays bare ground.
// - Tops are flush with the ground behind them, so the bluff's top walk runs on over a face's top a step at most.
// - Shore rocks stand in the water at the faces' foot, low and dark, where the old cove's three boulders stood.
// - The shore hop (src/place/shore-layout.ts SHORE_HOP) keeps its place and solid; it is not a kit piece.
import type { Placement, Vec3 } from '../../src/prefab/types.ts';
import { H } from '../../src/place/terrain.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { coveEdge } from '../../src/place/cove.ts';
import { SHORE_HOP, SHORE_LANDING } from '../../src/place/shore-layout.ts';
import { LOW_FACE, SEA_FACE, SHORE_ROCK } from '../../src/content/prefabs/terrain.ts';
import { r2 as round } from '../../src/math.ts';
import { WALKABLE_NY } from '../../src/constants.ts';
import { TWO_JUMPS } from '../level/mover.ts';
import { kitPieceProblems, layAlong, solidBoxes, runAlong, type Area, type Key, type Kit } from './cliff-kit.ts';

const ground = (x: number, z: number) => H(x + ORIGIN.x, z);
/** How far back from its front a face's top reaches (its slab's depth and lean), m: where its top meets the ground. */
const TOP_BACK = 2.4;
/** A face's top over its origin: its slab's top, which leans a little higher at the front (the record's box). */
const TOP: Partial<Record<Key, number>> = {
  'terrain.sea-face-6': SEA_FACE,
  'terrain.sea-face-10': SEA_FACE,
  'terrain.sea-corner': SEA_FACE,
  'terrain.low-face': LOW_FACE,
  'terrain.face-6': 14.4,
  'terrain.face-10': 14.4,
};

function put(kit: Kit, prefab: Key, x: number, y: number, z: number, yaw: number, where: string) {
  const pos: Vec3 = [round(x), round(y), round(z)];
  kit.place(prefab, pos, [round(yaw), 0, 0], where);
}

/** The bluff's front, along coveEdge from the end of its walkable end to where it tucks under the beach. */
const BLUFF = runAlong(Array.from({ length: 21 }, (_, k): [number, number] => [coveEdge(49 + k), 49 + k]));
/** The shore climb's wall (census wall 9), along its toe from the north to where the climb turns up beside it: the
 * landing and the climb are on the run's left. */
const CLIMB_WALL = runAlong([
  [-189, -7],
  [-189, -4],
  [-186.5, 0.5],
  [-180.5, 6.5],
  [-178.5, 10],
  [-175.5, 13.5],
  [-173, 17],
]);
/** How far round a face its top must be no step up from walkable ground (dev/level/cliff-kit-standing.ts REACH). */
const REACH = 8;
/** A wall's toe up the normal (nx, nz) turned back into it from (x, z), d m in: where the ground first stands TOE m
 * over the ground 3 m out; and its rim, where the ground first comes within 0.6 m of the highest within 12 m. */
const TOE = 0.8;
function profile(x: number, z: number, nx: number, nz: number) {
  const at = (d: number) => ground(x - nx * d, z - nz * d);
  const base = at(-3);
  let toe = -3;
  while (at(toe) < base + TOE) toe += 0.25;
  let top = -Infinity;
  for (let d = 0; d <= 12; d += 0.25) top = Math.max(top, at(d));
  let rim = toe;
  while (at(rim) < top - 0.6) rim += 0.25;
  return { toe, toeY: at(toe), rim, rimY: top };
}
/** Walkable ground points 0.25 m apart within `r` m of any of `points` (Place-local x, z): where a player stands. */
function footingsNear(points: readonly (readonly number[])[], r: number) {
  const xs = points.map((p) => p[0]!),
    zs = points.map((p) => p[2]!);
  const out: number[] = [];
  for (let x = Math.floor(Math.min(...xs) - r); x <= Math.max(...xs) + r; x += 0.25)
    for (let z = Math.floor(Math.min(...zs) - r); z <= Math.max(...zs) + r; z += 0.25) {
      if (!points.some((p) => Math.hypot(p[0]! - x, p[2]! - z) <= r)) continue;
      const e = 0.25,
        gx = (ground(x + e, z) - ground(x - e, z)) / (2 * e),
        gz = (ground(x, z + e) - ground(x, z - e)) / (2 * e);
      if (1 / Math.sqrt(1 + gx * gx + gz * gz) >= WALKABLE_NY) out.push(Math.max(ground(x, z), 0));
    }
  return out;
}
/** The highest a face's top can stand, under `ceiling`, and be no way up (dev/level/cliff-kit-standing.ts, out of
 * reach): over no ground a player stands on within REACH m of it (and a metre to spare) by two jumps or less. `trial`
 * is the face placed with its top at 0; a top level with or under a footing is allowed. Undefined if none is. */
function highestTop(trial: Placement, ceiling: number) {
  const corners = solidBoxes(trial).flatMap((box) => [-1, 1].flatMap((u) => [-1, 1].map((w) => box(u, 1, w))));
  const rise = Math.max(...corners.map((c) => c[1])),
    fall = Math.min(...corners.map((c) => c[1]));
  const footings = footingsNear(corners, REACH + 1);
  const free = (t: number) => footings.every((f) => !(f < t + rise && t + fall - f <= TWO_JUMPS + 0.3));
  for (const t of [ceiling, ...footings.map((f) => f - rise - 0.05).sort((p, q) => q - p)])
    if (t <= ceiling && free(t)) return t;
  return undefined;
}

/** A wall dressed along a run (the landing and the climb on its left): faces at its toe, as in the canyon, each top as
 * high as it can stand under 0.9 of the wall and be no step up from ground round it (`highestTop`), and broken caps on
 * its rim. Where the wall is lower than a canyon face, a sea-cliff face of the same width; each set back into the wall
 * until its solid is CLEAR of the tread. A face that would show under 5 m is left out: its ground and caps only. */
function dressWall(
  kit: Kit,
  run: ReturnType<typeof runAlong>,
  pieces: readonly (readonly [Key, number])[],
  name: string,
) {
  layAlong(run, 0, pieces, -0.4, 1, (tall, c, yaw, s) => {
    const wall = profile(c.x, c.z, c.nx, c.nz);
    const ceiling = wall.toeY + (wall.rimY - wall.toeY) * 0.9;
    let d = wall.toe - 0.5;
    const trial = (prefab: Key, top: number): Placement => ({
      id: 'trial',
      prefab,
      pos: [c.x - c.nx * d, top - TOP[prefab]!, c.z - c.nz * d],
      rot: [yaw, 0, 0],
    });
    const sea = tall === 'terrain.face-10' ? 'terrain.sea-face-10' : 'terrain.sea-face-6';
    const prefab: Key = ceiling - 14.4 < wall.toeY - 0.5 ? tall : sea;
    while (d < wall.toe + 4 && kitPieceProblems(trial(prefab, ceiling)).some((p) => p.includes('tread'))) d += 0.25;
    const top = d < wall.toe + 4 ? highestTop(trial(prefab, 0), ceiling) : undefined;
    if (top !== undefined && top > Math.max(wall.toeY, 0) + 5) {
      const p = trial(prefab, top);
      put(kit, prefab, p.pos[0], p.pos[1], p.pos[2], yaw, `${name} wall s ${s.toFixed(1)}`);
    }
    // Caps 0.9 m in from where the ground tops out, a little under it: one a 6 m face, two a 10 m one.
    for (const along of tall === 'terrain.face-10' ? [-2.5, 2.5] : [0]) {
      const px = c.x - c.nx * (wall.rim + 0.9) + Math.cos(yaw) * along,
        pz = c.z - c.nz * (wall.rim + 0.9) - Math.sin(yaw) * along;
      put(kit, 'terrain.rim-cap', px, ground(px, pz) - 0.4, pz, yaw, `${name} rim s ${s.toFixed(1)}`);
    }
  });
}

export const shore: Area = {
  id: 'shore',
  // Census wall 9 (the shore climb). The bluff's front is the area's own: too narrow a strip of the ground for the census.
  walls: [[-186, -8]],
  // The landing, the end of its timber stage, the board at the shore path's foot (src/content/levels/leg2.ts
  // west.board) and the shore hop's rock.
  keepClear: [
    [SHORE_LANDING.x, SHORE_LANDING.z],
    [SHORE_LANDING.x - 19, SHORE_LANDING.z],
    [-195, 20.5],
    [SHORE_HOP.x, SHORE_HOP.z + 7],
  ],
  // The cove's water, its beach and the landing's, and the climb: every swimmer who gets back to a tread bare still
  // does with the kit in.
  stranded: { x: -190, z: 30, half: 55 },
  dress(kit) {
    // Sea-cliff faces along the bluff's front, their foot 1 m out over the beach, their tops flush with the bluff's top
    // behind them. Run from the south (z 49): the sea is on the run's left.
    layAlong(
      BLUFF,
      0,
      [
        ['terrain.sea-face-6', 6],
        ['terrain.sea-face-10', 10],
        ['terrain.sea-face-6', 6],
      ],
      -0.3,
      1,
      (prefab, c, yaw, s) => {
        const x = c.x + c.nx,
          z = c.z + c.nz;
        const top = ground(x - c.nx * TOP_BACK, z - c.nz * TOP_BACK);
        put(kit, prefab, x, top - TOP[prefab]! + 0.05, z, yaw, `bluff s ${s.toFixed(1)}`);
      },
    );
    // A low face where the bluff steps down toward its walkable end, on the flank's lower half, its top flush with the
    // flank behind it: south of it the flank is bare ground down to the beach, the walk off the sand.
    {
      const z = 47,
        x = coveEdge(z) - 2.6;
      const top = ground(x + TOP_BACK, z);
      put(kit, 'terrain.low-face', x, top - LOW_FACE + 0.05, z, -Math.PI / 2 - 0.05, 'bluff low face');
    }
    // The corner where the bluff's front turns in and tucks under the beach: its west leg on from the faces, its south
    // leg facing the beach beyond.
    {
      const x = coveEdge(70.5) - 1.6,
        z = 71;
      put(kit, 'terrain.sea-corner', x, ground(x + 2.4, z - 2.4) - SEA_FACE + 0.05, z, -Math.PI / 2, 'bluff corner');
    }
    // Shore rocks in the water off the faces' foot, where the old cove's boulders stood, low and dark.
    for (const [prefab, z, out, turn] of [
      ['terrain.shore-rock-l', 52, 3.6, 0.4],
      ['terrain.shore-rock-m', 57.5, 3.4, -0.5],
      ['terrain.shore-rock-s', 61, 3.2, 1.1],
      ['terrain.shore-rock-m', 64.5, 3.5, 0.2],
      ['terrain.shore-rock-s', 68, 3.4, -0.9],
    ] as const) {
      const x = coveEdge(z) - out;
      const height = SHORE_ROCK[prefab][1];
      put(
        kit,
        prefab,
        x,
        Math.max(ground(x, z) - 0.15 * height, 0.25 - 0.88 * height),
        z,
        -Math.PI / 2 + turn,
        `bluff rock z ${z}`,
      );
    }
    // The shore climb's wall, seen head on from the landing and walked up beside on the climb.
    dressWall(
      kit,
      CLIMB_WALL,
      [
        ['terrain.face-6', 6],
        ['terrain.face-6', 6],
        ['terrain.face-10', 10],
        ['terrain.face-6', 6],
        ['terrain.face-6', 6],
      ],
      'climb',
    );
  },
};
