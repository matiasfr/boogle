// How far apart a train's vehicles stand on the track they are drawn on. No three.js: the layout test reads it.
// A train's place is metres along its line (today's track); the up track is drawn up to 4 m beside it (layout.ts
// `upLat`). On the inside of a bend that track is shorter than the line (line 1's 14.7 m bend is 10.7 m on the up
// track; the Quarry's was 2.8 m until layout.ts eased it), so cars spaced by the line's metres stood closer than their lengths and
// the engine was drawn into the first car, 0.68 m on line 1 and 0.98 m at the Quarry's stop (owner, 14 November: "on
// certain stops, especially with curves, the train car clips the train engine"). Two rules, view only (the sim's
// train is a point and its extent is unchanged at rest on straight track):
//  - vehicles are spaced by metres along their own track (`spacedAlong`);
//  - where a bend is still too tight for two decks' inside corners, the coupling stretches until they clear by
//    COUPLING_MIN (`trainPlaces`), outward from the first car, so nothing drawn or stood on overlaps.
export type TrackPoint = { x: number; z: number };
export type TrackAt = (s: number, out: TrackPoint) => void;

/** Where along the line a vehicle `d` metres (signed) along the drawn track from `s0` stands. `at(s, out)` is the
 * drawn track's point at `s` metres along the line (its lateral offset applied); walked in `step` m of the line: the
 * line's own metre, so each leg is a whole step of its polyline. A line's heading turns at its metre points, and a
 * track drawn beside it steps back there on the inside of a bend; shorter legs would count that step back as way made
 * (measured so, a 2.8 m bend read 1.6 m of track a metre of the line where 0.42 m is made). */
export function spacedAlong(at: TrackAt, s0: number, d: number, step = 1) {
  if (d === 0) return s0;
  const dir = Math.sign(d),
    want = Math.abs(d);
  let s = s0,
    gone = 0;
  at(s, a);
  // Four times the distance in line metres bounds the walk (the Quarry's up track is 0.42 of its line at worst).
  for (let n = Math.ceil((want * 4) / step); n > 0; n--) {
    at(s + dir * step, b);
    const leg = Math.hypot(b.x - a.x, b.z - a.z);
    if (gone + leg >= want) return s + dir * step * (leg > 0 ? (want - gone) / leg : 0);
    gone += leg;
    s += dir * step;
    a.x = b.x;
    a.z = b.z;
  }
  return s;
}
const a: TrackPoint = { x: 0, z: 0 },
  b: TrackPoint = { x: 0, z: 0 };

/** A deck as it stands: its middle, heading, half width, and how far it reaches behind and ahead of its middle. */
export type Deck = { x: number; z: number; yaw: number; hx: number; back: number; front: number };
/** A vehicle of a train: its middle's offset along the track from the train's place, and its deck. */
export type Vehicle = { d: number; hx: number; back: number; front: number };
/** The axles a vehicle is posed on, either side of its middle (car.ts poseCarOnLine). */
export const AXLE = 1.1;
/** The least gap between two coupled decks, m: 0.6 m between engine and first car and 0.5 m between cars on straight
 * track, never less than this on a bend. */
export const COUPLING_MIN = 0.1;
/** How far the engine's buffers reach behind its deck (assets/src/engine.py `buffers`: 0.27 at 1.25×). */
export const ENGINE_BUFFERS = 0.34;
/** The most a coupling stretches, m (0.4 m is the most any bend asks, now the Quarry's up track is eased). */
const STRETCH_MAX = 2.5;

function corners(r: Deck, out: number[]) {
  const c = Math.cos(r.yaw),
    s = Math.sin(r.yaw);
  let k = 0;
  for (const lx of [-r.hx, r.hx])
    for (const lz of [-r.back, r.front]) {
      out[k++] = r.x + lx * c + lz * s;
      out[k++] = r.z - lx * s + lz * c;
    }
}
const ca: number[] = [],
  cb: number[] = [];
/** The gap between two decks on the ground (separating axes), m: negative is how far one stands in the other. */
export function deckGap(A: Deck, B: Deck) {
  corners(A, ca);
  corners(B, cb);
  let best = -Infinity;
  for (const r of [A, B])
    for (let turn = 0; turn < 2; turn++) {
      const ax = turn ? Math.sin(r.yaw) : Math.cos(r.yaw),
        az = turn ? Math.cos(r.yaw) : -Math.sin(r.yaw);
      let a0 = Infinity,
        a1 = -Infinity,
        b0 = Infinity,
        b1 = -Infinity;
      for (let k = 0; k < 8; k += 2) {
        const pa = ca[k]! * ax + ca[k + 1]! * az,
          pb = cb[k]! * ax + cb[k + 1]! * az;
        a0 = Math.min(a0, pa);
        a1 = Math.max(a1, pa);
        b0 = Math.min(b0, pb);
        b1 = Math.max(b1, pb);
      }
      best = Math.max(best, b0 - a1, a0 - b1);
    }
  return best;
}
/** The deck of `v` with its middle at `s` along the line: on the chord of its two axles, as the cars are posed. */
export function deckAt(at: TrackAt, s: number, v: Vehicle, out: Deck) {
  at(s + AXLE, a);
  at(s - AXLE, b);
  out.x = (a.x + b.x) / 2;
  out.z = (a.z + b.z) / 2;
  out.yaw = Math.atan2(a.x - b.x, a.z - b.z);
  out.hx = v.hx;
  out.back = v.back;
  out.front = v.front;
  return out;
}
const near: Deck = { x: 0, z: 0, yaw: 0, hx: 0, back: 0, front: 0 },
  far: Deck = { ...near };
/**
 * Where each vehicle's middle stands, in metres along the line, for a train at `along`. `vehicles` run engine first
 * (falling `d`); the one at `d` 0 stays at `along` and the others are placed outward from it, each its offset along
 * the drawn track from its neighbour's place (`spaced` false: along the line, for a track that is the line), then
 * further out until the two decks clear by COUPLING_MIN. Writes and returns `out`.
 */
export function trainPlaces(at: TrackAt, along: number, vehicles: readonly Vehicle[], out: number[], spaced = true) {
  const home = Math.max(
    0,
    vehicles.findIndex((v) => v.d === 0),
  );
  out.length = vehicles.length;
  out[home] = along;
  for (const dir of [-1, 1]) {
    let stretch = 0;
    for (let n = home + dir; n >= 0 && n < vehicles.length; n += dir) {
      const v = vehicles[n]!,
        prev = vehicles[n - dir]!;
      deckAt(at, out[n - dir]!, prev, near);
      const place = (extra: number) => {
        const d = v.d - dir * (stretch + extra);
        return spaced ? spacedAlong(at, along, d) : along + d;
      };
      const gap = (extra: number) => deckGap(near, deckAt(at, (out[n] = place(extra)), v, far));
      if (gap(0) < COUPLING_MIN) {
        let lo = 0,
          hi = STRETCH_MAX;
        for (let k = 0; k < 9; k++) {
          const mid = (lo + hi) / 2;
          if (gap(mid) < COUPLING_MIN) lo = mid;
          else hi = mid;
        }
        gap(hi);
        stretch += hi;
      }
    }
  }
  return out;
}
