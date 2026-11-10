// Passenger car previz blockouts (docs/plans/passenger-car-previz.md): pure part data, no three.js, so Node can check
// it. Inspection only: nothing in the game imports this. Car frame as the game's cars: +z forward (towards the
// engine), +x across (the halt deck's side in the scenes), y up from the rail line, the origin halfway along the deck.
// Both candidates keep today's flatbed (TRAILER: 2.2 × 3.2 m, its deck top 0.7 m), so the car is no longer and no
// wider than today's, and the halt decks and layout tests see no change.
import { BRASS, RED, coplanarFaces, type Part, type V } from './engine-previz-parts.ts';

/** `fit`: the first, un-upgraded car's fittings (always drawn). `upgrade`: the roof, its posts, lamps and trim. */
export type CarModule = 'fit' | 'upgrade';
export type CarPart = Part<CarModule>;
export type CarId = 'four' | 'six';
/** A seat: where the seated rider's capsule centre is in the car's frame and which way they face. */
export type Seat = { at: V; yaw: number };
export type CarCandidate = {
  id: CarId;
  label: string;
  parts: CarPart[];
  seats: Seat[];
  /** Where each seat's rider's stowaway sits (same order as `seats`), its feet point and facing. */
  pets: Seat[];
  /** Where Stand up puts each seat's rider (capsule centre), same order. */
  exits: Seat[];
};

// The car the game draws today (src/proto/wagon/cars.ts TRAILER, place-kit flat_deck): deck top 0.7 m over the rail
// line, 1.1 m either side, 1.6 m either way along.
export const DECK = { top: 0.7, hx: 1.1, hz: 1.6 };
/** Seat top over the deck and the seated hips under the capsule centre: the track layer's low stool and the Buddy
 * seated pose (src/proto/place/machine-model.ts MACHINE_CHAIR_SEAT, src/proto/place/seat.ts SEATED_HIPS). A bench
 * at this height holds the game's seated Buddy with his feet on the deck, as the stools do. */
export const SEAT_TOP = 0.32,
  SEATED_HIPS = 0.63,
  PLAYER_R = 0.45;
/** The stowaway sits 0.62 m to its owner's right (docs/game-design/place.md, the stowaway). */
export const PET_RIGHT = 0.62;
/** Standing Buddy's collider (1.7 m) and the headroom the engine's cab keeps over it (engine-previz-parts CAB_FIT). */
export const ROOF_UNDER = DECK.top + 1.7 + 0.2;

// The first car: natural wood and dark iron. The upgrade repaints the paintable ones (PAINT) and adds the roof.
export const WOOD = '#c99a5e',
  BACK = '#a8743f', // bench backs and ends: painted red by the upgrade
  IRON = '#33343a',
  TRIM = '#4a4c54', // rails and caps: brass after the upgrade
  CREAM = '#f3e6c8',
  RED_DARK = '#b62b20',
  GLASS = '#ffe9a8';
export const PAINT: Record<string, string> = { [BACK]: RED, [TRIM]: BRASS };

type Parts = CarPart[];
const box = (p: Parts, m: CarModule, c: string, x: [number, number], y: [number, number], z: [number, number]) =>
  p.push({ kind: 'box', m, c, min: [x[0], y[0], z[0]], max: [x[1], y[1], z[1]] });
/** A box and its mirror across the car's centre line; `x` is the +x side. */
const pair = (p: Parts, m: CarModule, c: string, x: [number, number], y: [number, number], z: [number, number]) => {
  box(p, m, c, x, y, z);
  box(p, m, c, [-x[1], -x[0]], y, z);
};
const D = DECK.top,
  S = D + SEAT_TOP;

/** What both cars share: the trim under the deck's edge, the end boards and rails, the corner posts; and the upgrade's
 * roof on four posts, its fringe, two lamps and a brass stripe. */
function shared(p: Parts, lamps: readonly V[]) {
  // A board under each side of the deck, so the flatbed reads as a coach (painted red with a brass line later).
  pair(p, 'fit', BACK, [1.105, 1.14], [0.42, 0.665], [-1.56, 1.56]);
  // Each end: a boarded panel to the knees and a rail at the hands, between corner posts.
  for (const s of [-1, 1]) {
    const z: [number, number] = s > 0 ? [1.5, 1.555] : [-1.555, -1.5];
    box(p, 'fit', BACK, [-0.98, 0.98], [D + 0.06, D + 0.52], z);
    box(p, 'fit', TRIM, [-0.99, 0.99], [D + 0.78, D + 0.85], [z[0] + 0.005, z[1] - 0.005]);
    pair(p, 'fit', IRON, [0.99, 1.07], [D, D + 0.95], [z[0] - 0.01, z[1] + 0.01]);
    for (const x of [-1.03, 1.03])
      p.push({ kind: 'sphere', m: 'fit', c: TRIM, at: [x, D + 0.99, (z[0] + z[1]) / 2], r: 0.065, sy: 1, seg: 10 });
    // Upgrade: the posts carry on up to the roof.
    pair(p, 'upgrade', IRON, [1.0, 1.06], [D + 1.03, ROOF_UNDER], [z[0] - 0.005, z[1] + 0.005]);
  }
  // Upgrade: the roof, a red canopy with a raised middle and a cream fringe, over the whole deck.
  const r = ROOF_UNDER;
  box(p, 'upgrade', RED, [-1.24, 1.24], [r, r + 0.08], [-1.74, 1.74]);
  box(p, 'upgrade', RED_DARK, [-0.86, 0.86], [r + 0.08, r + 0.17], [-1.66, 1.66]);
  pair(p, 'upgrade', CREAM, [1.245, 1.275], [r - 0.12, r + 0.06], [-1.73, 1.73]);
  for (const s of [-1, 1])
    box(p, 'upgrade', CREAM, [-1.23, 1.23], [r - 0.12, r + 0.06], s > 0 ? [1.745, 1.775] : [-1.775, -1.745]);
  // Lamps hung under the roof: a brass cap, a warm glass, a brass foot.
  for (const at of lamps) {
    p.push({
      kind: 'cyl',
      m: 'upgrade',
      c: TRIM,
      axis: 'y',
      at: [at[0], r - 0.06, at[2]],
      len: 0.12,
      r0: 0.02,
      r1: 0.02,
      seg: 6,
    });
    p.push({
      kind: 'cyl',
      m: 'upgrade',
      c: BRASS,
      axis: 'y',
      at: [at[0], r - 0.15, at[2]],
      len: 0.06,
      r0: 0.11,
      r1: 0.06,
      seg: 10,
    });
    p.push({ kind: 'sphere', m: 'upgrade', c: GLASS, at: [at[0], r - 0.27, at[2]], r: 0.09, sy: 1.15, seg: 10 });
  }
  // A brass line along each side board.
  pair(p, 'upgrade', BRASS, [1.143, 1.152], [0.6, 0.625], [-1.54, 1.54]);
}

/** Four: one back-to-back bench down the middle (a knifeboard), two riders a side facing out over the halt decks, each
 * with room for their stowaway beside them on the bench, 0.62 m to their right, as on the deck today. */
function four(): CarCandidate {
  const p: Parts = [];
  // The spine (the shared back), its cap rail, the seat either side.
  box(p, 'fit', BACK, [-0.04, 0.04], [S - 0.02, S + 0.5], [-1.36, 1.36]);
  box(p, 'fit', TRIM, [-0.07, 0.07], [S + 0.5, S + 0.56], [-1.4, 1.4]);
  pair(p, 'fit', WOOD, [0.045, 0.55], [S - 0.06, S], [-1.37, 1.37]);
  // Iron legs under it, and an arm at each end.
  for (const z of [-1.3, 0, 1.3]) box(p, 'fit', IRON, [-0.5, 0.5], [D, S - 0.06], [z - 0.03, z + 0.03]);
  for (const s of [-1, 1])
    box(p, 'fit', BACK, [-0.56, 0.56], [S - 0.1, S + 0.22], s > 0 ? [1.375, 1.43] : [-1.43, -1.375]);
  shared(p, [
    [0, 0, -0.75],
    [0, 0, 0.75],
  ]);
  // Rider anchors 0.1 m behind the seat's front edge, as the stool's (seat.ts). Facing +x their right is +z.
  const seats: Seat[] = [],
    pets: Seat[] = [],
    exits: Seat[] = [];
  for (const s of [-1, 1])
    for (const z of [-0.85, 0.45]) {
      const zs = s * z,
        yaw = (s * Math.PI) / 2;
      seats.push({ at: [s * 0.45, S + SEATED_HIPS, zs], yaw });
      pets.push({ at: [s * 0.42, S, zs + s * PET_RIGHT], yaw });
      exits.push({ at: [s * 0.85, D + PLAYER_R, zs], yaw });
    }
  return { id: 'four', label: 'Four · knifeboard bench', parts: p, seats, pets, exits };
}

/** Six: three cross benches of two (a toast rack), everyone facing the engine; you board from either side into a row.
 * There is no room beside a rider for a stowaway, so it sits on the deck at its owner's feet, under the next row's
 * back (in a lap it hid its owner's chest and face: the first round of stills). */
function six(): CarCandidate {
  const p: Parts = [];
  const rows = [-1.05, -0.05, 0.95];
  for (const zr of rows) {
    box(p, 'fit', WOOD, [-0.995, 0.995], [S - 0.06, S], [zr - 0.32, zr + 0.1]);
    box(p, 'fit', BACK, [-0.99, 0.99], [S - 0.04, S + 0.5], [zr - 0.38, zr - 0.325]);
    box(p, 'fit', TRIM, [-1.0, 1.0], [S + 0.5, S + 0.56], [zr - 0.4, zr - 0.3]);
    // The bench ends: a board from the deck to the arm, the toast rack's look.
    pair(p, 'fit', BACK, [1.0, 1.05], [D, S + 0.22], [zr - 0.41, zr + 0.13]);
    box(p, 'fit', IRON, [-0.04, 0.04], [D, S - 0.06], [zr - 0.3, zr + 0.06]);
  }
  shared(p, [
    [0, 0, -0.55],
    [0, 0, 0.55],
  ]);
  const seats: Seat[] = [],
    pets: Seat[] = [],
    exits: Seat[] = [];
  for (const zr of rows)
    for (const x of [-0.5, 0.5]) {
      seats.push({ at: [x, S + SEATED_HIPS, zr], yaw: 0 });
      pets.push({ at: [x, D, zr + 0.36], yaw: 0 });
      exits.push({ at: [Math.sign(x) * 0.95, D + PLAYER_R, zr + 0.5], yaw: (Math.sign(x) * Math.PI) / 2 });
    }
  return { id: 'six', label: 'Six · toast rack', parts: p, seats, pets, exits };
}

export const CARS: Record<CarId, CarCandidate> = { four: four(), six: six() };

/** The previz's own checks: no coplanar same-facing faces (the z-fighting rule), and every part inside the deck's
 * width and length (the roof's eaves excepted). The plan's "Checks" runs it with node. */
export function carProblems(c: CarCandidate) {
  const hits = coplanarFaces(c.parts).map((h) => `${c.id}: coplanar ${h}`);
  for (const [k, part] of c.parts.entries()) {
    if (part.kind !== 'box' || part.m === 'upgrade') continue;
    if (Math.abs(part.min[0]) > DECK.hx + 0.05 || Math.abs(part.max[0]) > DECK.hx + 0.05)
      hits.push(`${c.id}: part ${k} past the deck's side`);
    if (Math.abs(part.min[2]) > DECK.hz || Math.abs(part.max[2]) > DECK.hz)
      hits.push(`${c.id}: part ${k} past its end`);
  }
  return hits;
}
