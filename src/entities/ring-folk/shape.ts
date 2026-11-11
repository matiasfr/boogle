// The island's folk, pure decisions (docs/plans/ring-island-build1.md, R4e; calls 17, 29, 37 and 38): who stands where
// on the staring rota, when the whistle swaps them (a pure function of the railway room tick, so every page sees the same
// swap), how a figure walks between its post and its rest, the nod at a player who stands still and looks up, and which
// of the three talkers' lines a fact earns. No three.js, no DOM: ring-folk/view.ts draws and plays what this decides.
import { RING_HALT, ringAt } from '../../sim/railway-ring-layout.ts';
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
/** Hooter stands by the board and the posts, never looking up. */
export const HOOTER_UV: UV = { u: HALT0 + 20.5, lat: 6.2 };
/** The square's middle: every post faces it; the shard is overhead. */
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

// ---------------------------------------------------------------- staring up, and the nod
/** How far a looker leans back from the feet (rad). The kit's hard hat sits on the body, so the whole figure tips: a
 * head tipped alone would hide its face under the hat. About 54 degrees: the face is up, the hat is up with it. */
export const LEAN_UP = 0.95;
export const NOD = { reach: 8, pitch: (50 * Math.PI) / 180, stillFor: 1.5, still: 0.35, seconds: 1.3 } as const;

export type NodInput = { near: boolean; still: boolean; up: boolean };
export type NodState = { held: number; fired: boolean };
export const newNod = (): NodState => ({ held: 0, fired: false });
/** A nod is earned after `stillFor` s of standing still, within reach, looking up past the pitch; it is not earned again
 * until the player breaks one of the three. Returns true on the frame it is earned. */
export function stepNod(s: NodState, dt: number, i: NodInput): boolean {
  if (!(i.near && i.still && i.up)) {
    s.held = 0;
    s.fired = false;
    return false;
  }
  s.held += dt;
  if (s.fired || s.held < NOD.stillFor) return false;
  s.fired = true;
  return true;
}
/** The lean (rad) of a looker `t` seconds into a nod: down to face the player, two bobs, then back up. */
export function nodLean(t: number): number {
  if (t <= 0 || t >= NOD.seconds) return LEAN_UP;
  const down = Math.min(1, t / 0.25, (NOD.seconds - t) / 0.3),
    ease = down * down * (3 - 2 * down),
    bob = 0.16 * Math.sin(t * 13) * ease;
  return Math.min(LEAN_UP, LEAN_UP * (1 - ease) + 0.05 * ease + bob);
}
/** The nearest post-holder within the nod's reach of the player (metres, world frame), or -1. `folk` is the crew's
 * post-holders' positions by crew index (null: resting or walking). */
export function nodder(player: { x: number; z: number }, folk: readonly ({ x: number; z: number } | null)[]): number {
  let best = -1,
    bestD: number = NOD.reach;
  folk.forEach((f, c) => {
    if (!f) return;
    const d = Math.hypot(f.x - player.x, f.z - player.z);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  });
  return best;
}
/** Whether the player's camera looks up past the nod's pitch (`cam.pitch`, rad, positive up). */
export const lookingUp = (pitch: number) => pitch > NOD.pitch;

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
