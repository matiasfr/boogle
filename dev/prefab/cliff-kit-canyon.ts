// The cliff kit's first area, the canyon (docs/plans/terrain-clean.md, Part 3, step 2; generated as
// `content/built/levels/canyon-kit.json` by dev/prefab/cliff-kit.ts): the timber camp path's climb up the gorge's east
// wall from the bridge, Place-local (-41.5, -88) to (-61, -121), placed by hand-picked stations along two straight legs
// of the path. Its rules beyond the kit's own (terrain-clean.md, finding 6):
// - The river side stays open: nothing on the climb's drop side but low rock at the waterline, metres below the bench.
// - Dress by purpose: faces and boulders on the uphill side say "not this way"; caps break the plateau's rim.
// - Art only stands: boulders are at most 1.6 m tall beside a face no one can stand on.
import type { Vec3 } from '../../src/prefab/types.ts';
import { H } from '../../src/place/terrain.ts';
import { ORIGIN, PATHS } from '../../src/place/layout.ts';
import { pathAt } from '../../src/place/path-field.ts';
import { BOULDER_SIZE } from '../../src/content/prefabs/terrain.ts';
import { r2 as round } from '../../src/math.ts';
import { CLEAR, type Area, type Key, type Kit } from './cliff-kit.ts';

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
const ground = (x: number, z: number) => H(x + ORIGIN.x, z);

function dress(kit: Kit, run: ReturnType<typeof leg>) {
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
    kit.place(prefab, pos, [round(run.facing + turn), 0, 0], `station ${s}`);
  }
  /** Where the wall's foot is: the ground first stands 1 m above the bench. */
  const foot = (s: number) => {
    const top = bench(s) + 1;
    return march(s, 3, 12, (h) => h > top);
  };
  return {
    /** Faces at the wall's foot, sunk 0.5 m below the bench so no block floats. Optional 3rd entry overrides the
     * default -0.6 m offset from `foot(s)` (positive moves the face deeper into the wall). */
    faces(list: readonly (readonly [Key, number, number?])[]) {
      for (const [prefab, s, offset = -0.6] of list) place(prefab, s, foot(s) + offset, bench(s) - 0.5);
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

export const canyon: Area = {
  id: 'canyon',
  level: 'canyon-kit',
  walls: [[-48, -108]], // census wall 0, the gorge north and the canyon climb
  dress(kit) {
    // The climb, from the bridge's east end (-41.5, -88) to its top (-61, -121), and the run on north from there to
    // (-61, -147), whose wall is the big near wall looking back down the climb.
    // The climb: the east wall's faces end to end from 4.5 m up it (10, 6, 10 and 6 m wide), boulders at their foot.
    // The upper face at the bend (s=33.5) and both faces round the top bend sit flush with the wall so the alcove's
    // bracket stays in view looking back down the climb (docs/decisions-look.md d-2026-11-24-canyon-faces-flush).
    const climb = dress(kit, leg(CLIMB[9]!, CLIMB[10]!));
    climb.faces([
      ['terrain.face-10', 9.5],
      ['terrain.face-6', 17.5],
      ['terrain.face-10', 25.5],
      ['terrain.face-6', 33.5, 0.2],
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
    // Round the top's bend: the wall that fills the view back down the climb, set flush with the wall.
    const top = dress(kit, leg(CLIMB[10]!, CLIMB[11]!));
    top.faces([
      ['terrain.face-10', 6, 0.5],
      ['terrain.face-6', 14, -0.1],
    ]);
    top.boulders([
      ['terrain.boulder-s', 3, 0.6],
      ['terrain.boulder-m', 10.5, -0.3],
    ]);
    top.caps([5, 13]);
  },
};
