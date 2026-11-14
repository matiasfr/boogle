// Where a little guy on line 1's track bed stands while a train passes (docs/game-design/place.md, "The little guys"):
// a place clear of every car on either track with something under his feet. Pure geometry, no three.js, so
// test/path-refuge.test.ts walks the whole path. View only: nothing here is state.
import { railY, type Line } from '../../place/layout.ts';
import { STEEL_CAR, TRAIN_CARS } from './cars.ts';

/** folk.ts gives way to a car's box widened by its side racks and by the room a walker keeps from a wall
 * (`clearTraffic`: hx + 0.15, then WALL 0.38). A car is a chord of the curve it stands on, so its corners swing a
 * little outside the track's line: 0.12 m covers the longest car on the line's tightest bend. */
const RACKS = 0.15,
  WALL = 0.38,
  SWING = 0.12;
/** The widest car that runs: the trailers and the steel car (1.1 m) or the engine. */
export const WIDEST_CAR = Math.max(STEEL_CAR.hx, ...TRAIN_CARS.map((c) => c.hx));
/** A refuge's least distance from a track's middle: 1.75 m with today's cars. */
export const REFUGE_CLEAR = WIDEST_CAR + RACKS + WALL + SWING;
/** The plank deck's width on one track and its top over the rail height, and where it runs: track.ts DECK_W, TOP and
 * `deck` (either track's bed over a metre above the ground). Kept in step by the test's own support check. */
const DECK_W = 3.6,
  TOP = 0.1,
  DECK_FROM = 1;
/** What a refuge on the ground may differ from the track bed's height: a step off the sleepers, not a drop off a
 * trestle or into a cutting. */
const STEP = 0.5;
/** A little guy's half width: he stands this far inside a deck's edge. */
const BODY = 0.27;

export type Refuge = { lat: number; y: number; on: 'ground' | 'deck' };
type Land = {
  /** Ground height at a world point (terrain.ts H). */
  H: (x: number, z: number) => number;
  /** The up track's lateral at `s`, 0 where the line is single (layout upLat). */
  up: (s: number) => number;
  /** A world point `l` beside the line at `s` (line-geometry.ts besideLine). */
  beside: (line: Line, s: number, l: number) => { x: number; z: number };
};

/** Whether the plank deck runs at `s` (track.ts `deck`). */
export function deckAt(line: Line, s: number, land: Land) {
  const over = (l: number) => {
    const at = land.beside(line, s, l);
    return railY(line, s) - land.H(at.x, at.z);
  };
  const centre = over(0),
    ul = land.up(s);
  if (centre > DECK_FROM || ul > -0.5) return centre > DECK_FROM;
  return over(ul) > DECK_FROM;
}

/** The refuge at `s`, or null where nothing clear of both tracks is supported there (he walks on to one that is). Tried
 * in order: the side away from the up track, between the two tracks, the far side of the up track. Each is the
 * track bed's ground within a step of the sleepers, or the deck inside its edges. */
export function refugeAt(line: Line, s: number, land: Land): Refuge | null {
  const ul = land.up(s),
    away = ul > 0 ? -1 : 1,
    deck = deckAt(line, s, land),
    top = railY(line, s) + TOP;
  // The deck is the whole formation's width, centred between the tracks.
  const lo = ul / 2 - (DECK_W + Math.abs(ul)) / 2 + BODY,
    hi = ul / 2 + (DECK_W + Math.abs(ul)) / 2 - BODY;
  const tries = [away * Math.max(2.4, REFUGE_CLEAR + 0.3)];
  if (Math.abs(ul) >= 2 * REFUGE_CLEAR) tries.push(ul / 2);
  if (Math.abs(ul) > 0.5) tries.push(ul - away * Math.max(2.4, REFUGE_CLEAR + 0.3));
  for (const lat of tries) {
    if (deck) {
      if (lat >= lo && lat <= hi) return { lat, y: top, on: 'deck' };
      continue;
    }
    const at = land.beside(line, s, lat);
    const y = land.H(at.x, at.z);
    if (Math.abs(y - top) <= STEP) return { lat, y, on: 'ground' };
  }
  return null;
}

/** Every refuge along the path from `from` to `to`, a sample each `step` m, and for a sample with none which way
 * along the line the nearest one is (+1 the way `s` grows, 0 where he is in one). */
export function pathRefuges(line: Line, from: number, to: number, land: Land, step = 0.5) {
  const n = Math.max(1, Math.round((to - from) / step));
  const at = Array.from({ length: n + 1 }, (_, k) => refugeAt(line, from + ((to - from) * k) / n, land));
  const go = at.map((r, k) => {
    if (r) return 0;
    for (let d = 1; d <= n; d++) {
      if (at[k + d]) return 1;
      if (at[k - d]) return -1;
    }
    return 0;
  });
  const index = (s: number) => Math.max(0, Math.min(n, Math.round(((s - from) / (to - from)) * n)));
  return {
    at: (s: number) => at[index(s)]!,
    go: (s: number) => go[index(s)]! as -1 | 0 | 1,
    samples: at,
    sOf: (k: number) => from + ((to - from) * k) / n,
  };
}
