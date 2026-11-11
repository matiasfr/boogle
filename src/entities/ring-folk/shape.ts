// The island's folk, pure decisions (docs/plans/ring-island-build1.md, R4e; calls 17, 29, 37 and 38): who stands where
// on the staring rota, when the whistle swaps them (a pure function of the railway room tick, so every page sees the same
// swap), how a figure walks between its post and its rest, and which
// of the three talkers' lines a fact earns. No three.js, no DOM: ring-folk/view.ts draws and plays what this decides.
import { RING_HALT, ringAt } from '../../sim/railway-ring-layout.ts';
import { RING_SHARD } from '../railway/crossing-show.ts';
import { HOOTER, RIVET, SQUINT } from './lines.ts';

// ---------------------------------------------------------------- the rota
/** 45 s at the room's 10 Hz tick (call 17): the shift is `floor(tick / ROTA_TICKS)`. */
export const ROTA_TICKS = 450;
/** Six hands share four posts (Rivet and Squint are two of them); Hooter keeps the whistle and never looks up. */
export const CREW = 6;
export const POSTS = 4;
export const RIVET_CREW = 0;
export const SQUINT_CREW = 1;

export const shiftAt = (tick: number) => Math.max(0, Math.floor(tick / ROTA_TICKS));

/** Which crew stands at each of the four posts in shift `n`. Shift 0 is crew 0..3; at each whistle the two who have
 * stood longest (crew 2n and 2n+1, mod 6) hand their posts to the two who rested. Pure; loops at most `n` times. */
export function postsAt(shift: number): readonly number[] {
  const posts = [0, 1, 2, 3];
  const n = Math.max(0, Math.floor(shift));
  for (let k = 0; k < n; k++) {
    const out = [(2 * k) % CREW, (2 * k + 1) % CREW],
      into = [(2 * k + 4) % CREW, (2 * k + 5) % CREW];
    for (let i = 0; i < 2; i++) posts[posts.indexOf(out[i]!)] = into[i]!;
  }
  return posts;
}
/** The crew resting in shift `n`, lowest first. */
export function restersAt(shift: number): readonly number[] {
  const on = new Set(postsAt(shift));
  return Array.from({ length: CREW }, (_, c) => c).filter((c) => !on.has(c));
}
export type Station = { kind: 'post'; slot: number } | { kind: 'rest'; slot: number };
/** Where crew `c` stands in shift `n`. */
export function stationOf(crew: number, shift: number): Station {
  const p = postsAt(shift).indexOf(crew);
  return p >= 0 ? { kind: 'post', slot: p } : { kind: 'rest', slot: restersAt(shift).indexOf(crew) };
}

/** What a page does when its clock reads shift `now` and it last drew shift `last`: nothing, the whistle and a walk (the
 * next shift, heard live), or a snap (a first read, a restore or a stall that skipped shifts: no whistle, no walk). */
export function shiftChange(last: number | null, now: number): 'none' | 'whistle' | 'snap' {
  if (last === null) return 'snap';
  if (now === last) return 'none';
  return now === last + 1 ? 'whistle' : 'snap';
}

// ---------------------------------------------------------------- the square
/** (u, lat) in metres on the island's frame (`ringAt`). The square is the works yard east of the halt: the deck between
 * the tarped steel and the drop hammer, a stone's throw from the RINGWORKS board. Its deck is the view's PLATFORM_Y. */
export type UV = { u: number; lat: number };
const HALT0 = RING_HALT.u0 / 100;
/** The yard deck's height: `ring-island/view.ts`'s PLATFORM_Y (the east platform's top, 0.9 m over the halt's slab). */
export const YARD_Y = RING_HALT.y / 100 + 0.9;
/** The four posts, spread round the square so one stands in each quarter. */
export const POST_UV: readonly UV[] = [
  { u: HALT0 + 17.5, lat: 8.5 },
  { u: HALT0 + 17.5, lat: 13 },
  { u: HALT0 + 20.5, lat: 10 },
  { u: HALT0 + 20.5, lat: 14.2 },
];
/** Where the two off shift stand: the narrow deck south of the tarp. */
export const REST_UV: readonly UV[] = [
  { u: HALT0 + 10, lat: 6.2 },
  { u: HALT0 + 13, lat: 6.2 },
];
/** The lane the walkers take (south of the tarp, which fills u HALT0+2.6..15.4, lat 7.1..13.9) before turning in. */
export const LANE_LAT = 6.2;
/** Hooter stands by the board and the posts. */
export const HOOTER_UV: UV = { u: HALT0 + 20.5, lat: 6.2 };
/** What the crew face (yaw only, heads level; owner, 11 November: "they can just be facing the shard"). */
export const FACE_AT = { x: RING_SHARD.x, z: RING_SHARD.z } as const;
/** The square's middle, for cameras and looks. */
export const SQUARE_UV: UV = { u: HALT0 + 19, lat: 10.5 };

/** A point on the island's frame in world metres. */
export function worldOf(p: UV) {
  const w = ringAt(p.u * 100, p.lat * 100);
  return { x: w.x / 100, z: w.z / 100 };
}
export const standingUV = (s: Station): UV => (s.kind === 'post' ? POST_UV[s.slot]! : REST_UV[s.slot]!);

/** The way from one stand to another: out to the lane (south of the tarp), along it to the target's u, then in. */
export function waypoints(from: UV, to: UV): UV[] {
  const out: UV[] = [];
  if (Math.abs(from.lat - LANE_LAT) > 0.05) out.push({ u: from.u, lat: LANE_LAT });
  if (Math.abs(from.u - to.u) > 0.05) out.push({ u: to.u, lat: LANE_LAT });
  out.push(to);
  return out;
}

export const WALK_SPEED = 1.7;
/** Move `p` toward the head of `route` by `dt`; pops arrived waypoints. Returns whether it moved. */
export function walkStep(p: UV, route: UV[], dt: number, speed = WALK_SPEED): boolean {
  let left = speed * dt,
    moved = false;
  while (left > 1e-6 && route.length) {
    const t = route[0]!,
      du = t.u - p.u,
      dl = t.lat - p.lat,
      d = Math.hypot(du, dl);
    if (d <= left) {
      p.u = t.u;
      p.lat = t.lat;
      route.shift();
      left -= d;
      moved = moved || d > 1e-6;
    } else {
      p.u += (du / d) * left;
      p.lat += (dl / d) * left;
      moved = true;
      left = 0;
    }
  }
  return moved;
}

// ---------------------------------------------------------------- the talkers' lines, tied to facts (call 38)
export type Facts = {
  /** The ring is joined (the Aperture row's joined >= 0). */
  joined: boolean;
  /** The local player swam in the last 60 s. */
  wet: boolean;
  /** This player glided the gap, in this room (local memory). */
  glided: boolean;
  /** This player swam to the island, in this room (local memory). */
  swam: boolean;
  /** This player has ridden over the joint, in this room (the Meet's local memory). */
  rode: boolean;
  /** Players in the room (accounts). */
  players: number;
};
/** The seconds a swim counts as "arrived wet". */
export const WET_S = 60;

/** The lines a talker may say now, in the table's order; the view cycles through them. */
export function linesFor(who: 'rivet' | 'squint' | 'hooter', f: Facts): readonly string[] {
  if (who === 'hooter') return HOOTER;
  if (who === 'rivet') return [...RIVET.any, ...(f.joined ? [RIVET.joined] : f.wet ? [RIVET.early] : [])];
  return [
    SQUINT.any,
    ...(f.glided ? [SQUINT.glided] : []),
    ...(f.swam && !f.glided ? [SQUINT.swamAcross] : []),
    ...(f.rode ? [SQUINT.firstRide] : []),
    ...(f.joined && f.players >= 2 ? [SQUINT.coop] : []),
  ];
}

/** Whether a swimming position counts as swimming to the island: the sea beside the bents, past the railhead's reach of
 * the pier (u 150 to 470 m of the line, within 70 m of it). Local memory for Squint. */
export function swamToIsland(uv: UV): boolean {
  return uv.u > 150 && uv.u < 470 && Math.abs(uv.lat) < 70;
}
/** Whether a gliding position is over the gap: between the railhead's last deck and the brace platform (u 255 to 290 m). */
export function glidingTheGap(uv: UV): boolean {
  return uv.u > 255 && uv.u < 290 && Math.abs(uv.lat) < 60;
}
