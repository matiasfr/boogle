// The railway's train engine, A at 1.25× with a walk-in cab (docs/plans/engine-previz.md, "Build plan: the picked
// engine"): its size, cab, boiler seat, collider and decks, from the same sidecar its Blender recipe reads
// (assets/src/engine.json, assets/src/engine.py), in the car's frame: x across, y up from the rail line, z forward,
// the origin halfway along the frame. No three.js, so the layout tests read the numbers the views and colliders use.
// Client-side only: no src/sim, wire or save reads any of this.
import spec from '../../../assets/src/engine.json' with { type: 'json' };
import type { CarSpec } from './cars.ts';

const S = spec.scale,
  cab = spec.cab;
// The derivation engine.py makes (fitBuddy in character/engine-previz-parts.ts): the unit cab scaled, lengthened
// behind until Buddy's doorway fits, its floor on the footplate, its roof over Buddy's collider and the headroom.
const zFront = cab.zFront * S,
  oldLength = (cab.zFront - cab.zBack) * S,
  length = Math.max(oldLength, cab.post + cab.door + cab.ahead),
  stretch = length - oldLength,
  zBack = zFront - length,
  floor = cab.floor * S + 0.02,
  roofUnder = floor + cab.fits + cab.headroom,
  hx = cab.hxIn + cab.wall,
  rear = -(spec.frame.hz * S + stretch),
  front = spec.frame.hz * S,
  shift = -(front + rear) / 2;
const door0 = zBack + cab.post + shift;

/** The engine's car: the frame and footplate, its deck top the cab floor. Line 2's trains lead with it; the wagon
 * prototype and the track layer keep LOCO. */
export const ENGINE: CarSpec = {
  hx: Math.max(spec.frame.hx * S, hx),
  hz: (front - rear) / 2,
  top: floor,
};

/** The walk-in cab (owner, 10 November: Buddy fits in it), in the car's frame. */
export const ENGINE_CAB = {
  floor,
  roofUnder,
  roofTop: roofUnder + 0.1,
  /** The roof's half width and its ends, eaves included. */
  roofHx: hx + 0.1,
  roofZ: [zBack - 0.12 + shift, zFront + 0.12 + shift] as const,
  /** The side walls' outer face and their thickness. */
  hx,
  wall: cab.wall,
  zBack: zBack + shift,
  zFront: zFront + shift,
  /** Each side's doorway (one at +x, one at −x), at the back of the cab, and its head. */
  door: { z: [door0, door0 + cab.door] as const, top: Math.min(roofUnder - 0.12, floor + cab.fits + cab.doorHead) },
  /** The step under each doorway, halfway up from the halt deck. */
  step: (cab.haltDeck + floor) / 2 + 0.03,
};

/** The fitted boiler: its barrel's axis height and radius, its top (the rideable top, as today's), and its back end
 * (the backhead, in the cab) and front (the smokebox door). */
export const ENGINE_BOILER = {
  y: spec.boiler.y * S,
  r: spec.boiler.r * S,
  top: (spec.boiler.y + spec.boiler.r) * S,
  zBack: spec.boiler.z[0]! * S + shift,
  zFront: spec.boiler.smokebox.z[1]! * S + shift,
  /** Where the steam leaves the chimney's cap. */
  chimney: { y: (spec.boiler.y + spec.boiler.r + 0.47) * S, z: spec.boiler.chimneyZ * S + shift },
};

/** The drivers (the place kit's wheel batch): radius, and their axles either side of the middle. */
export const ENGINE_WHEELS = {
  r: spec.wheels.r * S,
  // The back drivers moved back with the cab's lengthening, so they stand even about the middle.
  z: spec.wheels.z[1]! * S + shift,
  /** The side rods' crank throw. */
  throw: 0.12 * S,
};

/** The little guy's tall stool: where it stands, its seat top and its footrest. */
export const ENGINE_STOOL = {
  x: -(cab.hxIn - 0.58 / 2 - 0.1),
  z: zFront - 0.6 + shift,
  seat: floor + spec.stool.seat,
  footrest: floor + spec.stool.footrest,
};

/** The longer boiler's frame (the upgrade, not yet in the game): 0.5 m longer ahead, the cab where it is. */
export const ENGINE_LONG_AHEAD = spec.long.ahead * S;

/** How far past the cab's inner faces (and under its floor, onto the step) someone already in it still counts as in:
 * through the wall's thickness and a little beyond, so a step back in the doorway doesn't flicker the cutaway. */
export const CAB_KEEP = 0.25;
/** Is a body in the cab's interior, for the cutaway (train-view.ts)? `x`, `z` are its middle and `feet` its feet, in
 * the car's frame. In means the middle is inside the walls' inner faces with the feet between the floor and the
 * roof's underside: beside the cab on a platform, in the air next to a doorway, on the step, on the roof, on the
 * coupling or on the footplate ahead is out (owner, 14 November: the roof came off when he jumped close to the cab).
 * `keep` is for whoever was in on the last frame: CAB_KEEP wider, and down to the step. */
export function inEngineCab(x: number, feet: number, z: number, keep = false) {
  const c = ENGINE_CAB,
    m = keep ? CAB_KEEP : 0,
    hxIn = c.hx - c.wall;
  return (
    Math.abs(x) < hxIn + m &&
    z > c.zBack + c.wall - m &&
    z < c.zFront - c.wall + m &&
    feet > (keep ? c.step : c.floor) - 0.15 &&
    feet < c.roofUnder
  );
}

type Box = { x: [number, number]; y: [number, number]; z: [number, number] };
/** The engine's solid parts beyond its deck box, in the car's frame (y from the rail line): the boiler (when fitted),
 * the cab's walls either side of each doorway, its front and back walls, the roof, the steps. The doors are not solid:
 * they swing open (train-view.ts), so a doorway never blocks the player's collider (0.9 m wide, 1.7 m tall). */
export function engineSolids(boiler: boolean): Box[] {
  const c = ENGINE_CAB,
    b = ENGINE_BOILER,
    w = c.wall,
    list: Box[] = [];
  if (boiler) list.push({ x: [-b.r, b.r], y: [c.floor, b.top], z: [b.zBack, b.zFront] });
  for (const side of [-1, 1]) {
    const x: [number, number] = side > 0 ? [c.hx - w, c.hx] : [-c.hx, -(c.hx - w)];
    list.push({ x, y: [c.floor, c.roofUnder], z: [c.zBack, c.door.z[0]] });
    list.push({ x, y: [c.floor, c.roofUnder], z: [c.door.z[1], c.zFront] });
    list.push({ x, y: [c.door.top, c.roofUnder], z: [c.door.z[0], c.door.z[1]] });
    const sx: [number, number] = side > 0 ? [c.hx - 0.1, c.hx + 0.2] : [-c.hx - 0.2, -c.hx + 0.1];
    list.push({ x: sx, y: [c.step - 0.07, c.step], z: [c.door.z[0] + 0.1, c.door.z[1] - 0.1] });
  }
  const inner: [number, number] = [-(c.hx - 0.03), c.hx - 0.03];
  list.push({ x: inner, y: [c.floor, c.roofUnder], z: [c.zFront - w, c.zFront - 0.01] });
  list.push({ x: inner, y: [c.floor, c.roofUnder], z: [c.zBack + 0.01, c.zBack + w] });
  list.push({ x: [-c.roofHx, c.roofHx], y: [c.roofUnder - 0.01, c.roofTop], z: [...c.roofZ] });
  return list;
}

/** The deck under a rider's feet, as the platform asks it (src/physics/platforms.ts, `topAt`), in the car's frame:
 * the roof or the boiler's top when they stand up there, the step outside a doorway, the cab floor and footplate
 * everywhere else. `feet` is how high their feet are; within `reach` under a top, they stand on it. */
export function engineDeckAt(x: number, z: number, feet: number, boiler: boolean, reach = 0.3) {
  const c = ENGINE_CAB,
    b = ENGINE_BOILER;
  if (Math.abs(x) <= c.roofHx && z >= c.roofZ[0] && z <= c.roofZ[1] && feet >= c.roofTop - reach) return c.roofTop;
  if (boiler && Math.abs(x) <= b.r && z >= b.zBack && z <= b.zFront && feet >= b.top - reach) return b.top;
  if (Math.abs(x) > c.hx && z >= c.door.z[0] + 0.1 && z <= c.door.z[1] - 0.1 && feet < c.floor - 0.15) return c.step;
  return c.floor;
}
