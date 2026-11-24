// The canyon kit on its first wedge (docs/plans/terrain-clean.md, Part 3, step 2), generated as
// `content/built/levels/canyon-kit.json`: the timber camp path's climb up the gorge's east wall from the bridge,
// Place-local (-41.5, -88) to (-61, -121). Records are src/content/prefabs/terrain.ts; src/entities/terrain-kit/view.ts
// stands them in the world (Place-local x + ORIGIN.x). Placed along the climb from the ground the game builds, so a
// terrain change shows up as a stale artifact (`npm run prefabs -- --check`), not floating rock. The design review's rules for the kit (terrain-clean.md, finding 6) hold by construction here:
// - The tread keeps its full width: every collider's footprint stays CLEAR m outside the tread's edge (path-field.ts).
// - The river side stays open: nothing on the climb's drop side but low rock at the waterline, metres below the bench.
// - Dress by purpose: faces and boulders on the uphill side say "not this way"; caps break the plateau's rim.
// - No piece within 6 m of the alcove, the bell or the first device pad (`KEEP_CLEAR`); the first face starts 5 m up.
// - Art only stands: boulders are at most 1.6 m tall beside a face no one can stand on; no new way up.
import type { LevelDef, Placement, Vec3 } from '../../src/prefab/types.ts';
import { H } from '../../src/place/terrain.ts';
import { ORIGIN, PATHS } from '../../src/place/layout.ts';
import { pathAt } from '../../src/place/path-field.ts';
import { prefabs } from '../../src/content/prefabs/terrain.ts';

const CLIMB = PATHS[0]!.pts;
const A = CLIMB[9]!, // the bridge's east end, (-41.5, -88)
  B = CLIMB[10]!; // the climb's top, (-61, -121)
const LENGTH = Math.hypot(B[0] - A[0], B[1] - A[1]);
const f = { x: (B[0] - A[0]) / LENGTH, z: (B[1] - A[1]) / LENGTH };
/** Across the climb, uphill: the east wall is on the climber's right. */
const r = { x: -f.z, z: f.x };
/** A piece's +z faces the tread: out of the east wall, down the drop on the river side. */
const FACING = Math.atan2(-r.x, -r.z);
const CLEAR = 0.4; // m, a collider's footprint outside the tread's edge
const KEEP_CLEAR: readonly [number, number][] = [
  [-40, -80.5], // the alcove (tech-layout.ts SECRETS) and its stand point
  [-41, -84],
  [-36, -78], // the bell
  [-46, -69], // the first device pad
];

const round = (n: number) => Math.round(n * 100) / 100;
const ground = (x: number, z: number) => H(x + ORIGIN.x, z);
const at = (s: number, d: number) => ({ x: A[0] + f.x * s + r.x * d, z: A[1] + f.z * s + r.z * d });
/** The first `d` (0.25 m steps from `from` toward `to`) where `test` holds at station `s`. */
function march(s: number, from: number, to: number, test: (h: number) => boolean) {
  const step = Math.sign(to - from) * 0.25;
  for (let d = from; Math.abs(d - to) > 0.01; d += step) {
    const p = at(s, d);
    if (test(ground(p.x, p.z))) return d;
  }
  throw new Error(`canyon kit: nothing found at station ${s}`);
}
const bench = (s: number) => {
  const c = at(s, 0);
  return pathAt(c.x, c.z).height;
};

const placements: Placement[] = [];
function place(prefab: (typeof prefabs)[number]['key'], s: number, d: number, y: number, turn = 0) {
  const p = at(s, d);
  const pos: Vec3 = [round(p.x), round(y), round(p.z)];
  const rot: Vec3 = [round(FACING + turn), 0, 0];
  // The checks: every collider's corners clear of every tread, every piece clear of the gated places.
  for (const c of prefabs.find((q) => q.key === prefab)!.colliders) {
    if (c.shape !== 'box') throw new Error('canyon kit: boxes only');
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const lx = c.at[0] + sx * c.half[0],
          lz = c.at[2] + sz * c.half[2],
          yaw = rot[0];
        const x = pos[0] + lx * Math.cos(yaw) + lz * Math.sin(yaw),
          z = pos[2] - lx * Math.sin(yaw) + lz * Math.cos(yaw);
        if (pathAt(x, z).edge < CLEAR) throw new Error(`canyon kit: ${prefab} at station ${s} narrows the tread`);
      }
  }
  for (const [x, z] of KEEP_CLEAR)
    if (Math.hypot(pos[0] - x, pos[2] - z) < 6) throw new Error(`canyon kit: ${prefab} within 6 m of (${x}, ${z})`);
  placements.push({ id: `canyon.${placements.length}`, prefab, pos, rot });
}

// The east wall's faces, end to end up the climb from 4.5 m: 10, 6, 10 and 6 m wide, each at the wall's foot (where the
// ground first stands 1 m above the bench), sunk 0.5 m below the bench so no block floats.
const foot = (s: number) => march(s, 3, 12, (h) => h > bench(s) + 1);
for (const [prefab, s] of [
  ['terrain.face-10', 9.5],
  ['terrain.face-6', 17.5],
  ['terrain.face-10', 25.5],
  ['terrain.face-6', 33.5],
] as const)
  place(prefab, s, foot(s) - 0.6, bench(s) - 0.5);

// Boulders at the wall's foot, on the verge between the tread and the faces: [prefab, station, turn].
for (const [prefab, s, turn] of [
  ['terrain.boulder-m', 6, 0.3],
  ['terrain.boulder-s', 12.5, -0.5],
  ['terrain.boulder-l', 15, 0.15],
  ['terrain.boulder-s', 21, 0.8],
  ['terrain.boulder-m', 23.5, -0.2],
  ['terrain.boulder-s', 29, 0.4],
  ['terrain.boulder-l', 31.5, -0.25],
  ['terrain.boulder-m', 36.5, 0.5],
] as const) {
  const size = prefab === 'terrain.boulder-l' ? 2.6 : prefab === 'terrain.boulder-m' ? 1.6 : 0.9;
  // Against the face; where the wall stands close to the tread, partly into the face's foot rather than over the edge.
  const d = Math.max(foot(s) - 0.4 - size * 0.3, 3 + CLEAR + size * 0.8);
  const p = at(s, d);
  place(prefab, s, d, ground(p.x, p.z), turn);
}

// Low rock at the waterline below the drop, where the bank first comes down to 0.6 m.
for (const s of [7, 15.5, 24, 32.5]) {
  const d = march(s, -5, -18, (h) => h < 0.6);
  const p = at(s, d);
  place('terrain.bank-rock', s, d, ground(p.x, p.z) - 0.15, 0.1);
}

// Broken caps on the plateau's lip above the faces, with gaps between: the rim's 2 m teeth no longer read as a comb.
for (const s of [7, 14, 22.5, 31]) {
  const d = march(s, 6, 20, (h) => h > 29.5);
  const p = at(s, d + 0.9);
  place('terrain.rim-cap', s, d + 0.9, ground(p.x, p.z) - 0.4);
}

export const canyonKitContent = (): { levels: LevelDef[] } => ({ levels: [{ place: 'canyon-kit', placements }] });
