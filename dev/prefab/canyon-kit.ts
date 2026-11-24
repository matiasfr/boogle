// The canyon kit on its first wedge (docs/plans/terrain-clean.md, Part 3, step 2), generated as
// `content/built/levels/canyon-kit.json`: the timber camp path's climb up the gorge's east wall from the bridge,
// Place-local (-41.5, -88) to (-61, -121). Records are src/content/prefabs/terrain.ts; src/entities/terrain-kit/view.ts
// stands them in the world (Place-local x + ORIGIN.x). Placed along the climb from the ground the game builds, so a
// terrain change shows up as a stale artifact (`npm run prefabs -- --check`), not floating rock. The design review's
// rules for the kit (terrain-clean.md, finding 6) are checked on every placement here (`kitPieceProblems`, which
// `npm run level-check` also runs on the built level) and generation fails on the first broken one:
// - The tread keeps its full width: every collider, as placed and tilted, stays CLEAR m outside the tread's edge.
// - The river side stays open: nothing on the climb's drop side but low rock at the waterline, metres below the bench.
// - Dress by purpose: faces and boulders on the uphill side say "not this way"; caps break the plateau's rim.
// - No piece's solid within 6 m of the alcove, the bell or the first device pad (`KEEP_CLEAR`).
// - Art only stands: boulders are at most 1.6 m tall beside a face no one can stand on; no new way up.
import type { LevelDef, Placement, Vec3 } from '../../src/prefab/types.ts';
import { H } from '../../src/place/terrain.ts';
import { ORIGIN, PATHS } from '../../src/place/layout.ts';
import { pathAt } from '../../src/place/path-field.ts';
import { BOULDER_SIZE, prefabs } from '../../src/content/prefabs/terrain.ts';

const CLIMB = PATHS[0]!.pts;
/** A straight run of the path: stations `s` along it from `a`, `d` across it, positive uphill (the east wall is on the
 * climber's right on both runs). A piece's +z faces the tread: out of the east wall, down the drop on the river side. */
function leg(a: readonly number[], b: readonly number[]) {
  const length = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
  const f = { x: (b[0]! - a[0]!) / length, z: (b[1]! - a[1]!) / length };
  const r = { x: -f.z, z: f.x };
  return {
    at: (s: number, d: number) => ({ x: a[0]! + f.x * s + r.x * d, z: a[1]! + f.z * s + r.z * d }),
    facing: Math.atan2(-r.x, -r.z),
  };
}
const CLEAR = 0.4; // m, a collider's footprint outside the tread's edge
const KEEP_CLEAR: readonly [number, number][] = [
  [-40, -80.5], // the alcove (tech-layout.ts SECRETS) and its stand point
  [-41, -84],
  [-36, -78], // the bell
  [-46, -69], // the first device pad
];
const KEEP_AWAY = 6; // m
type Key = (typeof prefabs)[number]['key'];

/** Points through a placed piece's box solids, no more than 0.5 m apart, Place-local x and z: each box as authored
 * (its own yaw, pitch and roll, order YXZ), then the placement's yaw. Plain arithmetic, so audits can run this source
 * with only its data bound. */
function solidPoints(p: Placement) {
  const out: { x: number; z: number }[] = [];
  const yaw = p.rot?.[0] ?? 0;
  for (const c of prefabs.find((q) => q.key === p.prefab)!.colliders) {
    if (c.shape !== 'box') throw new Error(`canyon kit: ${p.prefab} has a solid that is not a box`);
    const [cy, cx, cz] = c.rot ?? [0, 0, 0];
    const steps = c.half.map((h) => Math.max(1, Math.ceil((2 * h) / 0.5)));
    for (let i = 0; i <= steps[0]!; i++)
      for (let j = 0; j <= steps[1]!; j++)
        for (let k = 0; k <= steps[2]!; k++) {
          let x = c.half[0] * (2 * (i / steps[0]!) - 1),
            y = c.half[1] * (2 * (j / steps[1]!) - 1),
            z = c.half[2] * (2 * (k / steps[2]!) - 1);
          [x, y] = [x * Math.cos(cz) - y * Math.sin(cz), x * Math.sin(cz) + y * Math.cos(cz)]; // roll
          z = y * Math.sin(cx) + z * Math.cos(cx); // pitch (only x and z are read after it)
          [x, z] = [x * Math.cos(cy) + z * Math.sin(cy), -x * Math.sin(cy) + z * Math.cos(cy)]; // the box's yaw
          x += c.at[0];
          z += c.at[2];
          out.push({
            x: p.pos[0] + x * Math.cos(yaw) + z * Math.sin(yaw),
            z: p.pos[2] - x * Math.sin(yaw) + z * Math.cos(yaw),
          });
        }
  }
  return out;
}
/** What a placed piece breaks: its solids over or within CLEAR of a tread, or within KEEP_AWAY of a gated place. */
export function kitPieceProblems(p: Placement): string[] {
  const points = solidPoints(p);
  const problems: string[] = [];
  const tread = Math.min(...points.map((q) => pathAt(q.x, q.z).edge));
  if (tread < CLEAR)
    problems.push(`${p.id} (${p.prefab}) narrows the tread: its solid comes ${tread.toFixed(3)} m from the edge`);
  for (const [x, z] of KEEP_CLEAR) {
    const near = Math.min(...points.map((q) => Math.hypot(q.x - x, q.z - z)));
    if (near < KEEP_AWAY) problems.push(`${p.id} (${p.prefab}) within 6 m of (${x}, ${z}): ${near.toFixed(3)} m`);
  }
  return problems;
}

const round = (n: number) => Math.round(n * 100) / 100;
const ground = (x: number, z: number) => H(x + ORIGIN.x, z);

/** Every placement, from the ground as it is now. */
function generate(): Placement[] {
  // The climb, from the bridge's east end (-41.5, -88) to its top (-61, -121), and the run on north from there to
  // (-61, -147), whose wall is the big near wall looking back down the climb.
  const CLIMB_LEG = leg(CLIMB[9]!, CLIMB[10]!),
    TOP_LEG = leg(CLIMB[10]!, CLIMB[11]!);
  const placements: Placement[] = [];
  function dress(run: ReturnType<typeof leg>) {
    /** The first `d` (0.25 m steps from `from` toward `to`) where `test` holds at station `s`. */
    function march(s: number, from: number, to: number, test: (h: number) => boolean) {
      const step = Math.sign(to - from) * 0.25;
      for (let d = from; Math.abs(d - to) > 0.01; d += step) {
        const p = run.at(s, d);
        if (test(ground(p.x, p.z))) return d;
      }
      throw new Error(`canyon kit: nothing found at station ${s}`);
    }
    const bench = (s: number) => {
      const c = run.at(s, 0);
      return pathAt(c.x, c.z).height;
    };
    function place(prefab: Key, s: number, d: number, y: number, turn = 0) {
      const p = run.at(s, d);
      const pos: Vec3 = [round(p.x), round(y), round(p.z)];
      const placement: Placement = {
        id: `canyon.${placements.length}`,
        prefab,
        pos,
        rot: [round(run.facing + turn), 0, 0],
      };
      const problems = kitPieceProblems(placement);
      if (problems.length) throw new Error(`canyon kit, station ${s}: ${problems.join('; ')}`);
      placements.push(placement);
    }
    /** Where the wall's foot is: the ground first stands 1 m above the bench. */
    const foot = (s: number) => {
      const top = bench(s) + 1;
      return march(s, 3, 12, (h) => h > top);
    };
    return {
      /** Faces at the wall's foot, sunk 0.5 m below the bench so no block floats. */
      faces(list: readonly (readonly [Key, number])[]) {
        for (const [prefab, s] of list) place(prefab, s, foot(s) - 0.6, bench(s) - 0.5);
      },
      /** Boulders on the verge against the face; where the wall stands close to the tread, partly into the face's foot
       * rather than over the edge. */
      boulders(list: readonly (readonly [Key, number, number])[]) {
        for (const [prefab, s, turn] of list) {
          const size = BOULDER_SIZE[prefab as keyof typeof BOULDER_SIZE];
          const d = Math.max(foot(s) - 0.4 - size * 0.3, 3 + CLEAR + size * 0.8);
          const p = run.at(s, d);
          place(prefab, s, d, ground(p.x, p.z), turn);
        }
      },
      /** Low rock at the waterline below the drop, where the bank first comes down to 0.6 m. */
      bank(stations: readonly number[]) {
        for (const s of stations) {
          const d = march(s, -5, -18, (h) => h < 0.6);
          const p = run.at(s, d);
          place('terrain.bank-rock', s, d, ground(p.x, p.z) - 0.15, 0.1);
        }
      },
      /** Broken caps on the plateau's lip, with gaps between: the rim's 2 m teeth no longer read as a comb. */
      caps(stations: readonly number[]) {
        for (const s of stations) {
          const d = march(s, 6, 20, (h) => h > 29.5) + 0.9;
          const p = run.at(s, d);
          place('terrain.rim-cap', s, d, ground(p.x, p.z) - 0.4);
        }
      },
    };
  }

  // The climb: the east wall's faces end to end from 4.5 m up it (10, 6, 10 and 6 m wide), boulders at their foot.
  const climb = dress(CLIMB_LEG);
  climb.faces([
    ['terrain.face-10', 9.5],
    ['terrain.face-6', 17.5],
    ['terrain.face-10', 25.5],
    ['terrain.face-6', 33.5],
  ]);
  climb.boulders([
    ['terrain.boulder-m', 6, 0.3],
    ['terrain.boulder-s', 12.5, -0.5],
    ['terrain.boulder-l', 15, 0.15],
    ['terrain.boulder-s', 21, 0.8],
    ['terrain.boulder-m', 23.5, -0.2],
    ['terrain.boulder-s', 29, 0.4],
    ['terrain.boulder-l', 31.5, -0.25],
    ['terrain.boulder-m', 36.5, 0.5],
  ]);
  climb.bank([7, 15.5, 24, 32.5]);
  climb.caps([7, 14, 22.5, 31]);
  // Round the top's bend: the wall that fills the view back down the climb.
  const top = dress(TOP_LEG);
  top.faces([
    ['terrain.face-10', 6],
    ['terrain.face-6', 14],
  ]);
  top.boulders([
    ['terrain.boulder-s', 3, 0.6],
    ['terrain.boulder-m', 10.5, -0.3],
  ]);
  top.caps([5, 13]);
  return placements;
}

// Generated at import too, so a placement that breaks a rule fails `npm run prefabs` and any audit that loads this file.
generate();
/** A fresh generation each call (the portability test's perturbed Math runs through it). */
export const canyonKitContent = (): { levels: LevelDef[] } => ({
  levels: [{ place: 'canyon-kit', placements: generate() }],
});
