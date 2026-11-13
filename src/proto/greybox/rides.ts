// The panel's line-2 rides, with the timings the 2D economy model uses: the depot cart's trip, the line 2 train and the
// boiler walk. Pure (no three.js): each leg is a run of metres along Place's real rails (`LINES.north` is line 1,
// `LINES.east` line 2), so the greybox rides the actual track at its real rail height and a test checks the lengths.
import { CART, EAST, LINES, STUB, lineAt, railY } from '../../place/layout.ts';
import type { MapData } from './map-data.ts';

export type RideLeg = { line: 'north' | 'east'; from: number; to: number; stop: string; dwellS: number };
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
      name: 'Cart trip: camp, turntable and forge stop, Q4 rack (9 m/s)',
      mps: CART.speed,
      startS: CART.loadS,
      legs: [
        { line: 'north', from: CART_LOAD_S, to: 0, stop: 'Turntable and forge stop', dwellS: CART.forgeS },
        { line: 'east', from: 0, to: CART_Q4_S, stop: 'Q4 rack', dwellS: 0 },
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
        { line: 'east', from: EAST.head, to: 0, stop: 'Apron', dwellS: 0 },
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
    const line = LINES[leg.line];
    const n = Math.max(1, Math.ceil(legLength(leg) / step));
    for (let k = out.length ? 1 : 0; k <= n; k++) {
      const s = leg.from + ((leg.to - leg.from) * k) / n;
      lineAt(line, s, p);
      out.push([p.x, railY(line, s), p.z]);
    }
  }
  return out;
}
