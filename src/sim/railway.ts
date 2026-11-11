// The railway's shared types and guards (docs/plans/ecs-e.md, section 4). Its state lives in an E world
// (./railway-components.ts), its rules are systems (./railway-systems.ts) and its facts are queries on the world
// (./railway-queries*.ts).
import { RAILWAY_SOURCES } from './railway-layout.ts';

export const RAILWAY_OUTCOMES = 64;
export const RAILWAY_WINDOW = 8;
export const RAILWAY_PILES = 128;
export const RAILWAY_MAX_INT = 2147483647;
export const RAILWAY_MAX_MARKER = Number.MAX_SAFE_INTEGER;
export type RailAccount = {
  pid: string;
  carry: number;
  stone?: number;
  rails?: number;
  /** A footing on your back (0 or 1): it fills it. */
  foot?: number;
  epoch: number;
  request: number;
};
export type RailResult = {
  pid: string;
  epoch: number;
  request: number;
  status: 'accepted' | 'noop' | 'rejected' | 'snapshot-required';
  accepted: number;
};
export type RailRequest = { epoch: number; request: number };
export type RailAction = RailRequest & {
  op: string;
  id?: number;
  n?: number;
  x?: number;
  z?: number;
  y?: number;
  yaw?: number;
  collapsed?: boolean;
  kind?: number;
  station?: string;
  revision?: number;
  /** rail.footTake: 0 the Works rack, 1 the pier rack, 2 the railhead rack (v27). */
  rack?: number;
  /** rail.footSet: 0 the stall, 1 the cradle, 2 the pier, 3 the railhead jib (v27). */
  site?: number;
  /** rail.turn: the road the table turns to (0 the stall road, 1 line 2's). */
  to?: number;
  /** rail.call: the way the train is asked to be going, -1 to stop 0's end, +1 to the far end (never an open end's
   * way in). */
  dir?: number;
  /** rail.call aboard: the slot of the rider's train (absent: the halt's lever, from its platform for `dir`). */
  train?: number;
  /** rail.wake: the rule tick its actor pressed at (the client's estimate); the server bounds it (railWakeTick). */
  tk?: number;
};
export const railInt = (v: unknown, max = RAILWAY_MAX_INT, min = 0): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max && !Object.is(v, -0);
export const railYaw = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 6.283185307179586 && !Object.is(v, -0);
export const railSource = (id: number) => RAILWAY_SOURCES.findIndex((row) => row[0] === id);
