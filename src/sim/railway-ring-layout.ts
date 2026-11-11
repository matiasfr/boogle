// Ring Island build 1's layout (docs/plans/ring-island-build1.md, R1): where line 2 runs on from the pier head to the
// island halt, the bents 7-13 on the bow, the railhead as it moves out, the gap, the folk's brace platform, the hook
// ring, the rivet, the halts, the island's buffers and crossover, recovery points, buoys and sea ramps. Pure world centimetres, no rules: v27's
// systems (src/sim/railway-sys-ring.ts), views and dev/level/ring.ts read it. Numbers are the greybox's RING_LAYOUT
// (src/proto/greybox/ring.ts) on ring-island ruling 5's datum with the design review's ruling on Level finding 1.
//
// Coordinates: `u` cm out from the pier head along line 2's heading (x +0.0272 per unit of -z), `lat` cm east of line
// 2's track (track 1, down), both true cm (orthogonal unit axes, as CROSSING_BENTS stand).
// ringDeckY equals CROSSING_DECK_Y (./railway-works-layout.ts) at bents 1-6 (test/railway-ring-layout.test.ts).
import type { RailPlatform } from './railway-lines.ts';

export type XZ = { x: number; z: number };
export type XYZ = { x: number; y: number; z: number };
export type RingSite = XYZ & { reach: number };
/** One flight of a sea ramp along u at `lat`, rising (or falling) from y0 at u0 to y1 at u1; `slip` is the slipway. */
export type RingFlight = { u0: number; u1: number; lat: number; y0: number; y1: number; slip?: true };
/** A flat landing between flights. */
export type RingLanding = { u0: number; u1: number; lat0: number; lat1: number; y: number };
/** A sea ramp (ruling 2): a slipway from the water, switchback flights, landings. `foot` is the slipway's sea end. */
export type RingRamp = { foot: XZ; flights: readonly RingFlight[]; landings: readonly RingLanding[] };

/** Line 2's track at the pier head, world cm (ruling 5's datum, the crossing's line: CROSSING_BENTS). */
export const RING_ORIGIN = { x: 140200, z: -37200 } as const;
/** The heading's length per unit of -z: u and lat are true cm, as CROSSING_BENTS are (the greybox's `at` is not, and
 * drifts 17 cm by the halt). */
const RING_UNIT = Math.sqrt(1 + 0.0272 * 0.0272);
/** World (x, z) cm of (u, lat): integer, `+ - * /` and sqrt only. */
export function ringAt(ucm: number, latcm = 0): XZ {
  return {
    x: Math.round(RING_ORIGIN.x + (0.0272 * ucm + latcm) / RING_UNIT),
    z: Math.round(RING_ORIGIN.z + (0.0272 * latcm - ucm) / RING_UNIT),
  };
}

/** Line 2's s at the pier head (Q6's toCm): s = RING_S_HEAD + u. */
export const RING_S_HEAD = 74200;
/** The bow (ruling 5): 24.3 m to bent 1 (u 20 m), then 4% down, level at 8.0 m from u 427.5 m through the halt and
 * the loop. Equals CROSSING_DECK_Y at bents 1-6. */
export function ringDeckY(ucm: number) {
  if (ucm <= 2000) return 2430;
  return Math.max(800, 2430 - Math.round((4 * (ucm - 2000)) / 100));
}
/** The double formation (generic lines): lat -5.8..+1.8, tracks at lat 0 (down, track 1) and -4 (up, track 0). */
export const RING_FORMATION = { left: -580, right: 180, mid: -200, tracks: [-400, 0] } as const;

/** Bents 7..13 at u 140..260 m: each centre is the formation's middle (lat -2), y its deck top. */
export const RING_BENTS: readonly XYZ[] = Array.from({ length: 7 }, (_, i) => {
  const u = 14000 + 2000 * i;
  return { ...ringAt(u, RING_FORMATION.mid), y: ringDeckY(u) };
});
/** Line 2's path on from the pier: (x, z) cm on track 1 every 10 m of s, from s 750 m (u 8 m: line 2's path ends at
 * s 740 m, sampled every 10 m from s 0, and its s and u differ by RING_S_HEAD) to the island halt's north end
 * (s 1210 m, u 468 m). Appended to line 2's path in v27, its index stays s / 1000 (railLinePoint). */
export const RING_PATH: readonly number[] = Array.from({ length: 47 }, (_, i) => {
  const p = ringAt(800 + 1000 * i);
  return [p.x, p.z];
}).flat();

/** Overruled, 10 November: not part of line 2 (owner: "Buffers about 15 m past the halt, with a crossover before it";
 * the island's end is RING_END). Kept, unchanged, for the tools and views that still read it until they move off it:
 * the greybox's balloon, centre and radius in world cm; `neckCm` runs from the halt's north end (u 468 m) 12 m on,
 * then to the loop's west point (the greybox's straight links); `loopCm` is the circle, 2 pi r with pi as 355/113. */
export const RING_LOOP = (() => {
  const x = 146200,
    z = -82200,
    r = 4000;
  const a = ringAt(46800 + 1200),
    dx = x - r - a.x,
    dz = z - a.z;
  return { x, z, r, neckCm: 1200 + Math.round(Math.sqrt(dx * dx + dz * dz)), loopCm: Math.round((2 * 355 * r) / 113) };
})();

/** The railhead's sea ramp at a railhead u: a slipway at lat 14 m from u - 28 to u - 22, then switchback flights up the
 * platform's east side (the greybox's three at bent 13; four where the platform stands higher, so every flight rises
 * at most 5.4 m in 10, under 30 degrees), the last landing against the platform's east edge. */
function railheadRamp(uh: number): RingRamp {
  const lats = [1400, 1180, 960, 740];
  const top = (u: number) => ringDeckY(u) + 90;
  const n = top(uh - 1000) - 40 > 3 * 540 ? 4 : 3;
  const flights: RingFlight[] = [{ u0: uh - 2800, u1: uh - 2200, lat: 1400, y0: -120, y1: 40, slip: true }];
  const landings: RingLanding[] = [];
  const end = n === 3 ? top(uh - 1000) : top(uh - 2350);
  let y = 40;
  for (let i = 0; i < n; i++) {
    const up = i % 2 === 0,
      u0 = up ? uh - 2200 : uh - 1200,
      u1 = up ? uh - 1200 : uh - 2200,
      y1 = i === n - 1 ? end : Math.round(40 + ((end - 40) * (i + 1)) / n);
    flights.push({ u0, u1, lat: lats[i]!, y0: y, y1 });
    const last = i === n - 1;
    if (last)
      landings.push(
        up
          ? { u0: uh - 1200, u1: uh - 800, lat0: 620, lat1: 1040, y: y1 }
          : { u0: uh - 2500, u1: uh - 2200, lat0: 620, lat1: 840, y: y1 },
      );
    else
      landings.push(
        up
          ? { u0: uh - 1200, u1: uh - 900, lat0: lats[i + 1]! - 100, lat1: lats[i]! + 100, y: y1 }
          : { u0: uh - 2500, u1: uh - 2200, lat0: lats[i + 1]! - 100, lat1: lats[i]! + 100, y: y1 },
      );
    y = y1;
  }
  return { foot: ringAt(uh - 2800, 1400), flights, landings };
}

/** Each row is a railhead: k = bents footed past bent 6 (0..7), at u 120 + 20 k m. `s` is where a train stands at the
 * end stop: its consist's reference 10 m short of the railhead, so the engine's nose (reference + 6.2 m) stops at
 * about u - 3.8, 2 m short of the buffer's face (u - 1.8), and the wagon stands by the rack (u - 17.4 against
 * u - 18); its stub merges 20 m short of it. */
export const RING_HEAD: readonly {
  u: number;
  s: number;
  mergeCm: number;
  /** The railhead platform's middle: lat +1.8..+6.3, 25 m long (u - 25..u), deck + 90 cm. */
  platform: RailPlatform;
  /** The railhead rack, at u - 18, lat +4.8. */
  rack: RingSite;
  /** The jib's foot (rail.footSet site 3), at u - 3, lat +3.6. */
  jib: RingSite;
  ramp: RingRamp;
}[] = Array.from({ length: 8 }, (_, k) => {
  const u = 12000 + 2000 * k,
    s = RING_S_HEAD + u - 1000;
  const on = (du: number, lat: number, reach: number): RingSite => ({
    ...ringAt(u + du, lat),
    y: ringDeckY(u + du) + 90,
    reach,
  });
  return {
    u,
    s,
    mergeCm: s - 2000,
    platform: on(-1250, 405, 1260),
    rack: on(-1800, 480, 400),
    jib: on(-300, 360, 500),
    ramp: railheadRamp(u),
  };
});
/** How a train eases into the railhead's end stop over the gap (review of R1, P1; orchestrator, 10 November): it brakes
 * at no more than RING_END_BRAKE_CMS2 (cm/s²) and runs no faster than RING_END_APPROACH (cm/s) while that braking is
 * under way. Leaving a moving deck keeps its speed through the air, so at the line's own 3.5 m/s² a late double jump
 * off the engine reaches the brace platform; at these the worst standable top stays 1.5 m short (dev/level/ring.ts).
 * R3a must make the catalog's end-stop leg into an open railhead use them. */
export const RING_END_BRAKE_CMS2 = 200;
export const RING_END_APPROACH = 2000;
/** The railhead platform's fixed kit, cm above the platform (the greybox's): the rack's top, the request lever, the
 * buffer stop (deck + 140), the jib's mast top and its arm, high end over the platform and low end out over the gap. */
export const RING_RAILHEAD_KIT = { rack: 160, lever: 130, buffer: 50, mast: 900, arm: [850, 750] } as const;
/** The platform's lat span. */
export const RING_PLATFORM_LAT = { lat0: 180, lat1: 630, len: 2500 } as const;

/** The side walkway the railhead platform leaves behind as it moves: lat +1.8..+6.3, from u 95 m (the first railhead
 * platform's back end; the plan's u 100 would drop its last 5 m) to RING_HEAD[k]'s end; each bent adds 20 m and none
 * is ever removed (design review finding 2). */
export function RING_WALK(k: number) {
  return { u0: 9500, u1: RING_HEAD[Math.max(0, Math.min(7, k))]!.u, lat0: 180, lat1: 630 };
}

/** The gap: the leaf hinges at u 277 m, 17 m long, its toe landing on bent 13 (u 260 m). */
export const RING_GAP = { hinge: 27700, leaf: 1700, toe: 26000 } as const;
/** The brace platform (design review finding 1): 8.0 m, u 284..294 m, lat +2.2..+10.2. */
export const RING_BRACE_PLATFORM = { u0: 28400, u1: 29400, lat0: 220, lat1: 1020, y: 800 } as const;
/** The gold strut's foot on the brace platform: rail.brace's site. */
export const RING_BRACE: RingSite = { ...ringAt(28450, 340), y: 800, reach: 400 };
/** The hook ring on its sea pile (ruling 1, moved to u 276 m by finding 1) and its gold land pad on bent 13's railhead
 * platform. The pile is solid to 3 m over the sea. One source: (u, lat) is the position, x and z are ringAt's of it. */
const ringPoint = <U extends number, L extends number>(u: U, lat: L) => ({ u, lat, ...ringAt(u, lat) });
export const RING_HOOK = {
  ...ringPoint(27600, 1200),
  y: 1750,
  pileTop: 300,
  pad: { ...ringPoint(25820, 500), y: ringDeckY(25820) + 90 },
} as const;
/** The rivet: the joint at the toe, just over the deck (rail.strike id 2). */
export const RING_RIVET: RingSite = { ...ringAt(25950, RING_FORMATION.mid), y: 1500, reach: 500 };
/** Steps from the brace platform's far end up to the folk's deck (about u 304 m). */
export const RING_STEPS: RingFlight = { u0: 29400, u1: 30400, lat: 340, y0: 800, y1: ringDeckY(30400) };

/** The island halt (u 428..468 m, deck 8.0 m): up (west, lat -9.3..-5.8) and down (east, lat +1.8..+5.3) platforms,
 * 90 cm over the deck. */
export const RING_HALT = {
  u0: 42800,
  u1: 46800,
  y: 800,
  up: { ...ringAt(44800, -755), y: 890, reach: 1260 } satisfies RailPlatform,
  down: { ...ringAt(44800, 355), y: 890, reach: 1260 } satisfies RailPlatform,
  upLat: [-930, -580],
  downLat: [180, 530],
} as const;
/** The island's end (R1b; owner, 10 November: "Buffers about 15 m past the halt, with a crossover before it"), Far
 * Head's shape: a facing crossover on the Way carries up trains (lat -4) onto the down track (lat 0), they stand at the
 * east platform with the passenger car at the platforms' middle (`u`, line 2's `s`), and leave on the down track. Both
 * tracks run on level to buffer faces 15 m past the platforms (`bufferU`, y deck + 140 as the railhead's buffer), the
 * blank end board 1.5 m behind them, over the run-off `bed`, cut into the island's ground down to `cut` (the underside
 * of its 0.5 m slab). Nothing here is west of the formation (lat -5.8): the station house's terrace starts at -9.3. */
const RING_END_U = (RING_HALT.u0 + RING_HALT.u1) / 2,
  RING_END_CROSS = { u0: 39500, u1: 41700 } as const,
  RING_BUFFER_U = RING_HALT.u1 + 1500;
export const RING_END = {
  u: RING_END_U,
  s: RING_S_HEAD + RING_END_U,
  cross: RING_END_CROSS,
  mergeCm: RING_S_HEAD + RING_END_CROSS.u0,
  bufferU: RING_BUFFER_U,
  buffers: [
    { ...ringAt(RING_BUFFER_U, RING_FORMATION.tracks[0]), y: RING_HALT.y + 140 },
    { ...ringAt(RING_BUFFER_U, RING_FORMATION.tracks[1]), y: RING_HALT.y + 140 },
  ],
  board: { ...ringAt(RING_BUFFER_U + 150, RING_FORMATION.mid), y: RING_HALT.y + 90 },
  bed: {
    u0: RING_HALT.u1,
    u1: RING_BUFFER_U + 50,
    lat0: RING_FORMATION.left,
    lat1: RING_FORMATION.right,
    y: RING_HALT.y,
  },
  cut: RING_HALT.y - 50,
} as const;
/** The joint's west platform at the last bent (lat -9.6..-5.8, u 235..260 m), opened on joined (call 14). */
export const RING_JOINT_UP: RailPlatform = { ...ringAt(24750, -770), y: ringDeckY(24750) + 90, reach: 1260 };
/** Not built: the Pier is homeward-only (owner, 10 November). Kept, unchanged, for the tools that still read it: the
 * pier's up platform, lat -6.9 at s 720.5 m (s 700..741), on line 2's path (test/railway-ring-layout.test.ts). */
export const RING_PIER_UP: RailPlatform = { x: 139612, z: -34867, y: 2502, reach: 1260 };
/** Q7's frame: the pier's east edge, s 710 m, lat +4.5 (on line 2's path; call 55): 2 m across, 2.6 m along, 1.7 m
 * south of the foot of the Pier platform's ramp (s 713-719). */
export const RING_Q7_FRAME = { x: 140793, z: -33866 } as const;

/** Dry places to put someone back (Level finding 10): the brace platform, the island halt's two platforms, the path's
 * foot on the slope below the halt, the summit lookout. */
export const RING_RECOVERY: readonly XYZ[] = [
  { ...ringAt(28900, 600), y: 800 },
  { x: RING_HALT.up.x, y: 890, z: RING_HALT.up.z },
  { x: RING_HALT.down.x, y: 890, z: RING_HALT.down.z },
  { ...ringAt(46400, -1880), y: 610 },
  { x: 133000, y: 6630, z: -112000 },
];
/** When each of buoys 1..7 lifts (call 16): 1-2 from the start, 3 at bent 8, 4 at bent 11, 5-7 on joined. */
export const RING_BUOYS: readonly ({ head: number } | { joined: true } | { start: true })[] = [
  { start: true },
  { start: true },
  { head: 2 },
  { head: 5 },
  { joined: true },
  { joined: true },
  { joined: true },
];
/** The hinge pier's sea ramp (ruling 2), moved with the brace platform: slipway u 287.5..293.5 m at lat 16, two flights
 * round the platform's east end up to 8.0 m. The railhead's ramp is RING_HEAD[k].ramp. */
export const RING_RAMPS: readonly RingRamp[] = [
  {
    foot: ringAt(28750, 1600),
    flights: [
      { u0: 28750, u1: 29350, lat: 1600, y0: -120, y1: 40, slip: true },
      { u0: 29350, u1: 30350, lat: 1600, y0: 40, y1: 540 },
      { u0: 30350, u1: 29450, lat: 1380, y0: 540, y1: 800 },
    ],
    landings: [
      { u0: 30350, u1: 30650, lat0: 1290, lat1: 1690, y: 540 },
      { u0: 29100, u1: 29450, lat0: 1000, lat1: 1470, y: 800 },
    ],
  },
];
