// The panel's line-2 rides, with the timings the 2D economy model uses: the depot cart's trip, the line 2 train and the
// boiler walk. Pure (no three.js): legs follow Place's real rails, cart road or the apron between buffer ends;
// the greybox uses their real rail heights and a test checks the lengths.
import { CART, EAST, LINES, STUB, lineAt, railY } from '../../place/layout.ts';
import { CART_FORGE, cartRoadAt, cartRoadY } from '../../place/home-station.ts';
import type { MapData } from './map-data.ts';

export type RideLeg = {
  line: 'north' | 'east' | 'cart' | 'apron';
  from: number;
  to: number;
  stop: string;
  dwellS: number;
};
export type WorkRide = {
  id: string;
  name: string;
  /** Cruising speed, m/s. */
  mps: number;
  /** Seconds before it moves (boarding, loading). */
  startS: number;
  legs: RideLeg[];
};

/** Where the depot cart loads, on line 1 (Place's deleted depot.ts `L1_FROM`), and its Q4 stop on line 2 (`stopFor`). */
export const CART_LOAD_S = STUB.camp + 5;
export const CART_Q4_S = EAST.quarry - 13;
const northHead = { x: LINES.north.xs[0]!, z: LINES.north.zs[0]! };
const eastHead = { x: LINES.east.xs[0]!, z: LINES.east.zs[0]! };
/** The walk across the apron between the two buffer ends. */
export const APRON_CONNECTOR = Math.hypot(northHead.x - eastHead.x, northHead.z - eastHead.z);
/** The boiler's carry: "546 m home, about 98 s" (docs/game-design/place.md, The run 7). */
export const BOILER_MPS = EAST.head / 98;

export function workRides(ride: MapData['ride']): WorkRide[] {
  const E = LINES.east.len;
  const train = (from: number, to: number, stop: string): RideLeg => ({
    line: 'east',
    from,
    to,
    stop,
    dwellS: ride.accelS + ride.dwellS,
  });
  return [
    {
      id: 'cart',
      name: 'Cart trip: camp, leg and forge stop, Q4 rack (9 m/s)',
      mps: CART.speed,
      startS: CART.loadS,
      legs: [
        { line: 'cart', from: 0, to: CART_FORGE, stop: 'Forge stop', dwellS: CART.forgeS },
        { line: 'cart', from: CART_FORGE, to: CART_FORGE + CART_Q4_S, stop: 'Q4 rack', dwellS: 0 },
      ],
    },
    {
      id: 'train2',
      name: 'Line 2 train: Village, quarry stop, Far Head stop, pier (20 m/s)',
      mps: ride.speed,
      startS: ride.boardS,
      legs: [
        train(18.25, EAST.quarry - 4, 'Quarry stop'), // line 2's Village stop (v33, fourth-car R2)
        train(EAST.quarry - 4, EAST.headStop, 'Far Head stop'),
        train(EAST.headStop, E, 'Pier'),
      ],
    },
    {
      id: 'boiler',
      name: 'Boiler walk: Far Head, apron, camp (shouldered, about 5.6 m/s)',
      mps: BOILER_MPS,
      startS: 0,
      legs: [
        { line: 'east', from: EAST.head, to: 0, stop: 'Apron, road 2', dwellS: 0 },
        { line: 'apron', from: 0, to: APRON_CONNECTOR, stop: 'Apron, road 1', dwellS: 0 },
        { line: 'north', from: 0, to: CART_LOAD_S, stop: 'Old train at the camp', dwellS: 0 },
      ],
    },
  ];
}

export const legLength = (l: RideLeg) => Math.abs(l.to - l.from);
export const rideLength = (r: WorkRide) => r.legs.reduce((s, l) => s + legLength(l), 0);
/** Seconds the model gives the ride: the start, each leg at cruise, and each stop's dwell. */
export const rideModelSeconds = (r: WorkRide) =>
  r.startS + r.legs.reduce((s, l) => s + legLength(l) / r.mps + l.dwellS, 0);

/** The ride as points in Place-local metres, every `step` metres of rail, at the rail's own height. */
export function ridePoints(r: WorkRide, step = 4): [x: number, y: number, z: number][] {
  const out: [number, number, number][] = [];
  const p = { x: 0, z: 0, ux: 0, uz: 0 };
  for (const leg of r.legs) {
    const n = Math.max(1, Math.ceil(legLength(leg) / step));
    for (let k = out.length ? 1 : 0; k <= n; k++) {
      const s = leg.from + ((leg.to - leg.from) * k) / n;
      if (leg.line === 'cart') {
        const at = cartRoadAt(s, LINES);
        const y = cartRoadY(s, { north: (d) => railY(LINES.north, d), east: (d) => railY(LINES.east, d) });
        out.push([at.x, y, at.z]);
      } else if (leg.line === 'apron') {
        const u = s / APRON_CONNECTOR;
        out.push([
          eastHead.x + (northHead.x - eastHead.x) * u,
          railY(LINES.east, 0) + (railY(LINES.north, 0) - railY(LINES.east, 0)) * u,
          eastHead.z + (northHead.z - eastHead.z) * u,
        ]);
      } else {
        const line = LINES[leg.line];
        lineAt(line, s, p);
        out.push([p.x, railY(line, s), p.z]);
      }
    }
  }
  return out;
}
