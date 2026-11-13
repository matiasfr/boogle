// Line two's pinned numeric catalog: the forge, Q1-Q7, the pack chest and the gates' switches and hook device.
// Coordinates are world centimetres pinned from Place's layout/tech-layout/ladder (6-7 November 2026);
// no runtime prototype imports or native trig in lockstep. Q7 (v27, ring-island-build1 R3b) is the last: the double
// deck over the pier's six bents, opened by the crossing.
import { pairsOf, type LineStation } from './railway-line-layout.ts';
import { RING_Q7_FRAME } from './railway-ring-layout.ts';

export const RAILS = 2;
/** The forge takes 24 logs for its frame, then 32 for walls and chimney; then it is lit and pours rails. */
export const LINE2_FORGE = {
  bills: [24, 32] as const,
  logs: 56,
  x: 91200,
  z: -1200,
  rackX: 91547,
  rackZ: 1005,
  rackMax: 24,
  pourTicks: 5,
  turnTicks: 26,
} as const;
export type Line2StationId = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5' | 'Q6' | 'Q7';
/** `bill[1]` is rails. Panels are the station's rails, evenly spaced; `speed` scales the room's laying speed.
 * `depot`: the cart brings its logs to a rack by the frame; `shelf`: it also moves its rails there from the forge rack.
 * `gate`: the frame takes nothing until that gate is down. `feed: 'train'`: its kit (its bill, call 63) loads onto a
 * line 2 train at the Village and unloads at line 2's halt `kitStop` (call 62: Q6's at Far Head, Q7's at the Pier).
 * `opens: 'crossing'`: it is not the active stretch until the crossing's footings are all set (Works.crossing). */
export type Line2Station = Omit<LineStation, 'id'> & {
  id: Line2StationId;
  speed: number;
  depot: boolean;
  shelf: boolean;
  gate?: 'quarry' | 'sea';
  feed?: 'train';
  kitStop?: number;
  opens?: 'crossing';
};
export const LINE2_STATIONS: readonly Line2Station[] = [
  {
    id: 'Q1',
    bill: [16, 6],
    beam: 0,
    fromCm: 700,
    toCm: 4200,
    x: 92507,
    z: 1751,
    panels: 6,
    crate: false,
    speed: 100,
    depot: false,
    shelf: false,
  },
  {
    id: 'Q2',
    bill: [24, 12],
    beam: 0,
    fromCm: 4200,
    toCm: 12200,
    x: 95948,
    z: -151,
    panels: 12,
    crate: true,
    speed: 120,
    depot: true,
    shelf: false,
  },
  {
    id: 'Q3',
    bill: [16, 12],
    beam: 0,
    fromCm: 12200,
    toCm: 17800,
    x: 102803,
    z: 2676,
    panels: 12,
    crate: true,
    speed: 120,
    depot: true,
    shelf: false,
  },
  {
    id: 'Q4',
    bill: [16, 16],
    beam: 0,
    fromCm: 17800,
    toCm: 28600,
    x: 108147,
    z: 3073,
    panels: 16,
    crate: true,
    speed: 160,
    depot: true,
    shelf: true,
    gate: 'quarry',
  },
  {
    id: 'Q5',
    bill: [24, 24],
    beam: 0,
    fromCm: 28600,
    toCm: 54600,
    x: 116668,
    z: -2831,
    panels: 24,
    crate: true,
    speed: 180,
    depot: true,
    shelf: true,
    gate: 'sea',
  },
  {
    id: 'Q6',
    bill: [32, 32],
    beam: 0,
    fromCm: 54600,
    toCm: 74200,
    x: 137293,
    z: -18355,
    panels: 32,
    crate: true,
    speed: 180,
    depot: true,
    shelf: true,
    feed: 'train',
    kitStop: 2,
  },
  // v27: the double deck over the pier's six bents (u 0-120 m), its frame on its own piled deck by the Pier (call 55).
  {
    id: 'Q7',
    bill: [20, 20],
    beam: 0,
    fromCm: 74200,
    toCm: 86200,
    x: RING_Q7_FRAME.x,
    z: RING_Q7_FRAME.z,
    panels: 20,
    crate: true,
    speed: 180,
    depot: true,
    shelf: true,
    feed: 'train',
    kitStop: 3,
    opens: 'crossing',
  },
];
/** Q7's slot: the double deck to the railhead, whose completion opens the Railhead halt and the ring's footings. */
export const Q7 = 6;
/** Q6's slot: the job whose completion opens the pier (the Pier halt, the pier's footings, the breaker). Read this, not
 * `LINE2_STATIONS.length`, wherever a rule means "Q6 is laid": v27 appends Q7 (ring-island-build1, R3b). */
export const Q6 = 5;
/** Whether the pier is open: `completed` QJob slots done, Q6's among them. */
export const pierLaid = (completed: number) => completed > Q6;
/** The depot's cart brings logs from the camp to a rack by the frame, never past the bill; from Q4 it stops at the
 * forge for rails too (24 a trip, one full rack: Place held 16). Its trip and what a load holds: ./railway-cart.ts. `reach`:
 * how near the frame a take from the rack or shelf is heard. */
export const LINE2_DEPOT = { reach: 700 } as const;
/** The pack chest beside the forge (Place ladder.ts CHEST_AT.pack): the forge's first bill (24 logs) puts it there, and
 * opening it gives everyone in the world a back that carries `carry` instead of RAILWAY_T1.carry. */
export const LINE2_PACK = { x: 91400, z: -900, carry: 16 } as const;
/** The lever on the quarry apron (2.2 m up), and the hook device on pillar p2's top. p2 stands 11 m left of line 2 at
 * s 89.5 since the second track's formation (generic-lines step 2, 10 November; was 7 m at s 92, device at 99954, 2086,
 * 2350): a position only, no saved field holds it. */
export const LINE2_LEVER = { x: 109740, z: 4220, y: 2620 } as const;
export const LINE2_HOOK = { x: 99669, z: 1680, y: 2294 } as const;
/** Place tech-layout.ts SEA_SWITCH, on Needle Bell's summit deck. */
export const LINE2_SEA = { x: 101180, z: -600, y: 10240 } as const;
/** The glider device on the same deck (glider piece B), 4.5 m from the switch handle and clear of the top rock drum: Q5
 * wakes it and `rail.glide` takes it (docs/plans/glider-b-home-flow.md). */
export const LINE2_GLIDE = { x: 101600, z: -450, y: 10240 } as const;
/** Readiness from accepted completions only: Q2 builds the hook walkway, Q3 the quarry ramp and winch drive. */
export const line2Routes = (completed: number) => ({ hook: completed >= 2, quarry: completed >= 3 });
/** Integer-centimetre rail-pair boundaries for a line-two stretch: each stock rail lays as its rail pairs. */
export function line2Panels(station: Line2Station) {
  const span = station.toCm - station.fromCm;
  return Array.from({ length: station.panels }, (_, i) =>
    pairsOf(
      station.fromCm + Math.round((i * span) / station.panels),
      i === station.panels - 1 ? station.toCm : station.fromCm + Math.round(((i + 1) * span) / station.panels),
    ),
  )
    .flat()
    .map((pair, index) => ({ station: station.id, index, ...pair }));
}

/** Boiler pickup and camp fit anchors, world cm, pinned from Place. */
export const LINE2_BOILER = { x: 92200, z: -117, y: 1800, reach: 420 } as const;
export const LINE2_OLD_TRAIN = { x: 100964, z: -14900, reach: 800 } as const;

export const LINE2_BOILER_AREA = { x0: 88000, x1: 104000, z0: -17200, z1: 3500, y0: 1000, y1: 4500 } as const;
export function line2BoilerGround(x: number, y: number, z: number) {
  const a = LINE2_BOILER_AREA;
  return x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1 && z >= a.z0 && z <= a.z1;
}
export const LINE2_KIT = { logs: 32, rails: 32 } as const;
