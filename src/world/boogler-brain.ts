// Headless extraction of the lead tab's frame-driven brain. Inputs retain their caller's order and cadence.
import { clamp, lerp } from '../math-pure.ts';
import { HALF } from './grid.ts';
import { SPEED, FLEE_SPEED, RIDDEN_SPEED, stepBooglerWalk, turnBooglerToward } from './boogler-walk.ts';
import type { BooglerLand } from './boogler-land.ts';

export const W_R = 0.8;
export const MIN_H = 0.45;
export const ACT = { NONE: 0, TALK: 1, RIDE: 2 };
export const MODE = { CALM: 0, FLEE: 1, RIDDEN: 2 };
export type BooglerVisitor = { pid?: string; x: number; z: number; act: number; wary: boolean };
export type BooglerState = {
  x: number;
  z: number;
  yaw: number;
  walking: boolean;
  tx: number;
  tz: number;
  wait: number;
  mode: number;
  fleeCheck: number;
  trip: { x: number; z: number } | null;
  look: string;
};

const MAX_H = 30; // the whole island, massif included
const MAX_STEP = 0.55; // max height change per metre of path
const MAP_LIMIT = HALF - 25;
// Home is the meadow east of the court: he drifts back towards it, and only now and then sets off to see the rest of the
// island.
const HOME_X = 30,
  HOME_Z = 2.5;
const HOME_RANGE = 22; // metres around home where he just potters about
const TRIP_CHANCE = 0.08; // per stop near home: chance to head off somewhere far
const FACE_RANGE = 7; // turns to look at players this close while idle
const FLEE_RANGE = 9;
const ATTEND_RANGE = 5;

// A Boogler already inside a footprint may leave it, including after taking over an older tab's pose.
function blocked(land: BooglerLand, x: number, z: number, pad = 0, fromX = NaN, fromZ = NaN) {
  if (Math.abs(x) > MAP_LIMIT || Math.abs(z) > MAP_LIMIT) return true;
  const h = land.height(x, z);
  if (h < MIN_H || h > MAX_H) return true;
  return land.blocked(x, z, W_R + pad) && !land.blocked(fromX, fromZ, W_R + pad);
}

export const validBooglerSpot = (land: BooglerLand, x: number, z: number) =>
  Number.isFinite(x) && Number.isFinite(z) && !blocked(land, x, z);

function pathClear(land: BooglerLand, x0: number, z0: number, x1: number, z1: number) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.ceil(len));
  let prev = land.height(x0, z0);
  for (let k = 1; k <= n; k++) {
    const x = lerp(x0, x1, k / n),
      z = lerp(z0, z1, k / n);
    if (blocked(land, x, z, 0.2, x0, z0)) return false;
    const h = land.height(x, z);
    if (Math.abs(h - prev) > (MAX_STEP * len) / n) return false;
    prev = h;
  }
  return true;
}

export function findStart(land: BooglerLand) {
  // A spot on dry land near the spawn, so new players meet him early.
  for (let ring = 4; ring < 40; ring += 2)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const x = 6 + Math.cos(a) * ring,
        z = 22 + Math.sin(a) * ring;
      if (!blocked(land, x, z, 0.5)) return { x, z };
    }
  return { x: 0, z: 0 };
}

export function createBooglerBrain({
  land,
  rng,
  start,
  walk = stepBooglerWalk,
}: {
  land: BooglerLand;
  rng: () => number;
  start: { x: number; z: number };
  walk?: typeof stepBooglerWalk;
}) {
  const range = (a: number, b: number) => a + rng() * (b - a);
  const sim: BooglerState = {
    x: start.x,
    z: start.z,
    yaw: 0,
    walking: false,
    tx: 0,
    tz: 0,
    wait: 1,
    mode: MODE.CALM,
    fleeCheck: 0,
    trip: null,
    look: '',
  };
  const canBlock = (x: number, z: number, pad: number, fromX: number, fromZ: number) =>
    blocked(land, x, z, pad, fromX, fromZ);

  // Sets his next walk target if the way there is clear.
  function headFor(x: number, z: number) {
    if (!pathClear(land, sim.x, sim.z, x, z)) return false;
    sim.tx = x;
    sim.tz = z;
    return true;
  }

  function tryStep(a: number, dmin: number, dmax: number) {
    for (let tries = 0; tries < 12; tries++) {
      const aa = a + (rng() - 0.5) * (tries < 6 ? 0.9 : 2.6),
        d = range(dmin, dmax);
      if (headFor(sim.x + Math.cos(aa) * d, sim.z + Math.sin(aa) * d)) return true;
    }
    return false;
  }

  function pickTarget() {
    const homeD = Math.hypot(HOME_X - sim.x, HOME_Z - sim.z);
    if (!sim.trip && homeD < HOME_RANGE * 1.5 && rng() < TRIP_CHANCE) {
      // Off to see a POI (or somewhere random), standing a little way from it.
      const spots = land.keepOut;
      if (spots.length && rng() < 0.7) {
        const k = spots[Math.floor(rng() * spots.length)]!;
        const a = rng() * Math.PI * 2;
        sim.trip = { x: k.x + Math.cos(a) * (k.r + 6), z: k.z + Math.sin(a) * (k.r + 6) };
      } else
        sim.trip = {
          x: range(land.mainland.x - land.mainland.rx, land.mainland.x + land.mainland.rx),
          z: range(land.mainland.z - land.mainland.rz, 0),
        };
    }
    if (sim.trip) {
      const d = Math.hypot(sim.trip.x - sim.x, sim.trip.z - sim.z);
      if (d < 8 || rng() < 0.03)
        sim.trip = null; // arrived (or got bored on the way)
      else if (tryStep(Math.atan2(sim.trip.z - sim.z, sim.trip.x - sim.x), 8, Math.min(22, d))) return true;
      else sim.trip = null;
    }
    // Pottering: random little walks, pulled back towards home the further he strays.
    const pull = clamp((homeD - HOME_RANGE) / 40, 0, 0.85);
    if (rng() < pull && tryStep(Math.atan2(HOME_Z - sim.z, HOME_X - sim.x), 6, 18)) return true;
    return tryStep(rng() * Math.PI * 2, 5, 20);
  }

  function fleeFrom(t: BooglerVisitor) {
    const away = Math.atan2(sim.z - t.z, sim.x - t.x);
    for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
      const d = range(7, 12);
      if (headFor(sim.x + Math.cos(away + off) * d, sim.z + Math.sin(away + off) * d)) return true;
    }
    return false;
  }

  const facing = (p: BooglerVisitor) => Math.atan2(-(p.x - sim.x), -(p.z - sim.z));

  function step(dt: number, visitors: readonly BooglerVisitor[], count = visitors.length) {
    let focus: BooglerVisitor | null = null,
      focusD = ATTEND_RANGE,
      threat: BooglerVisitor | null = null,
      threatD = FLEE_RANGE,
      nearest: BooglerVisitor | null = null, // whoever he turns to look at while idle
      nearestD = FACE_RANGE,
      ridden = false;
    for (let k = 0; k < count; k++) {
      const v = visitors[k]!;
      const d = Math.sqrt((v.x - sim.x) * (v.x - sim.x) + (v.z - sim.z) * (v.z - sim.z));
      if (d < nearestD && d > 0.5) {
        nearest = v;
        nearestD = d;
      }
      if (v.act === ACT.RIDE && d < W_R + 0.8) ridden = true;
      else if (v.act === ACT.TALK) {
        if (d < focusD) {
          focus = v;
          focusD = d;
        }
      } else if (v.wary && d < threatD) {
        threat = v;
        threatD = d;
      }
    }
    sim.mode = threat ? MODE.FLEE : ridden ? MODE.RIDDEN : MODE.CALM;
    sim.look = (focus && !ridden ? focus : !sim.walking ? nearest : null)?.pid ?? '';

    if (focus && !ridden) {
      sim.walking = false;
      sim.wait = Math.max(sim.wait, 1);
      turnBooglerToward(sim, facing(focus), dt);
      return;
    }
    if (threat) {
      sim.fleeCheck -= dt;
      if (!sim.walking || sim.fleeCheck <= 0) {
        sim.fleeCheck = 0.8;
        sim.walking = fleeFrom(threat) || sim.walking;
      }
    } else if (ridden) sim.wait = Math.min(sim.wait, 0.3);

    if (!sim.walking) {
      if (nearest) turnBooglerToward(sim, facing(nearest), dt);
      sim.wait -= dt;
      if (sim.wait <= 0) {
        if (pickTarget()) sim.walking = true;
        else sim.wait = 1;
      }
      return;
    }
    const speed = sim.mode === MODE.FLEE ? FLEE_SPEED : sim.mode === MODE.RIDDEN ? RIDDEN_SPEED : SPEED;
    const result = walk(sim, dt, speed, canBlock);
    if (result === 'arrived') {
      sim.walking = false;
      sim.wait = range(1.5, 5);
    } else if (result === 'blocked') {
      sim.walking = false;
      sim.wait = range(0.5, 1.5);
    }
  }

  return {
    state: sim,
    step,
    snapshot: (): BooglerState => ({ ...sim, trip: sim.trip ? { ...sim.trip } : null }),
    takeover(pose: { x: number; z: number; yaw: number }) {
      // Preserve the original reset: trip, RNG, target, mode and fleeCheck survive a takeover.
      sim.x = pose.x;
      sim.z = pose.z;
      sim.yaw = pose.yaw;
      sim.walking = false;
      sim.wait = 0.6;
    },
  };
}
