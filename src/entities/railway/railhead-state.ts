import { Group } from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { FIXED, PLAYER_R } from '../../constants.ts';
import { carry, CARRY } from '../../physics/platforms.ts';
import { angleLerp } from '../../math.ts';
import { me } from '../../player/state.ts';
import type { Body } from '../../physics/engine.ts';
import { siteExit } from '../../place/site-clearance.ts';
import type { outOf as moveOutside } from '../../place/sites.ts';
import { RING_S, line2World, line2Y } from './line2-path.ts';
import { BENTS, deckProfile, headU, leanClock, PLATFORM, SIDE } from './railhead-shape.ts';
import { haulU } from '../../sim/railway-ring-haul.ts';
import { aperture, type ReadWorld } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { q7Laid } from '../../sim/railway-queries.ts';
import { BOTTOM, makeCar, snapCar, type Car } from './car.ts';
import { BRIDGE, bridgeHalf } from './table-bridge.ts';

export type RailheadDeck = { car: Car; snap(): void; drive(fn: () => void): void };
const sideMid = (SIDE.lat0 + SIDE.lat1) / 2;
const initialU = headU(0);
const start = { ...line2World(RING_S + initialU - PLATFORM.len / 2, sideMid, { x: 0, z: 0 }) };
const end = { ...line2World(RING_S + headU(BENTS) - PLATFORM.len / 2, sideMid, { x: 0, z: 0 }) };
const length = Math.hypot(end.x - start.x, end.z - start.z);
const sin = (end.x - start.x) / length,
  cos = (end.z - start.z) / length;
export const deckU = (pos: { x: number; z: number }) => initialU + (pos.x - start.x) * sin + (pos.z - start.z) * cos;
const startY = line2Y(RING_S + initialU - PLATFORM.len / 2);
/** What every tab draws of the railhead, written once a frame by railhead-view.ts: the deck's end (m out), whether the
 * haul has settled (the railhead's prompts and the Railhead lever wait for it), and `live` once Q7 has opened it. */
export const railheadDrawn = { u: initialU, settled: true, live: false };
let drawnCar: Car | null = null;
/** The deck's end as drawn now, read off the car's interpolated pose, so a view updated before railhead-view.ts in the
 * frame (halts-view.ts's lever) is not a frame behind the deck. */
export const railheadEnd = () =>
  railheadDrawn.live && drawnCar ? deckU(drawnCar.body.interpolatedPosition) : railheadDrawn.u;
const deckYaw = Math.atan2(sin, cos);
export function createRailheadDeck(owner: OwnedView): RailheadDeck {
  let drive: (() => void) | undefined;
  const profile = deckProfile();
  const car = makeCar(profile.spec, new Group(), () => drive?.(), { shapes: [profile.surface] }, owner);
  car.platform.id = 'railway:railhead';
  car.platform.shared = true;
  car.platform.topAt = profile.topAt;
  car.speedLimit = 7.5;
  car.yaw = deckYaw;
  snapCar(car);
  drawnCar = car;
  return {
    car,
    snap: () => snapCar(car),
    drive(fn) {
      drive = fn;
    },
  };
}
/** The deck's driver, its platform's `move` every fixed step (railhead-view.ts hands it the adapter's read): before Q7
 * opens it waits under the sea; after, the rule clock leans on `tickNow` and the deck goes where the row's haul has it.
 * Returns the new rule clock, -1 while it waits. */
export function driveDeck(
  deck: RailheadDeck,
  read: { world(): ReadWorld; whole(): boolean; tickNow(): number },
  clock: number,
  outOf: typeof moveOutside,
) {
  const state = read.world();
  if (!read.whole() || !line2Trains(state) || !q7Laid(state)) {
    deck.car.y = -60;
    return -1;
  }
  const next = leanClock(clock, read.tickNow(), FIXED);
  placeDeck(deck, haulU(aperture(state), next) / 100, clock < 0, me.body, me.coyote, outOf);
  return next;
}
const idleOffsets = new WeakMap<Car, { body: Body; x: number; z: number }>();
// The deck's local -x side is the walkway's outer edge, over the sea, and its +z end is the railhead face, with only
// the open gap ahead. Stretching the footprint both ways before the shared nearest-edge clearance leaves only the
// track side and the back end (the built walkway) as exits; siteExit's overlap test still uses the real solids, so
// nobody outside the deck is moved.
const AWAY = 50;
const landward =
  (outOf: typeof moveOutside): typeof moveOutside =>
  (f, p, r) =>
    outOf(
      {
        ...f,
        x: f.x + (AWAY / 2) * (f.s - f.c),
        z: f.z + (AWAY / 2) * (f.c + f.s),
        hw: f.hw + AWAY / 2,
        hd: f.hd + AWAY / 2,
      },
      p,
      r,
    );
export function placeDeck(
  deck: RailheadDeck,
  u: number,
  opening: boolean,
  rider: Body | null | undefined,
  coyote: number,
  outOf: typeof moveOutside,
) {
  const { car } = deck;
  if (rider && !opening && carry.on === car.platform && coyote > 0 && me.jumpQueued <= 0 && me.wish.lengthSq() === 0) {
    const origin = car.body.position;
    const x = rider.position.x - origin.x,
      z = rider.position.z - origin.z;
    const held = idleOffsets.get(car);
    if (held?.body === rider && Math.hypot(x - held.x, z - held.z) < 0.001) {
      rider.position.set(origin.x + held.x, rider.position.y, origin.z + held.z);
    } else idleOffsets.set(car, { body: rider, x, z });
  } else idleOffsets.delete(car);
  car.x = start.x + (u - initialU) * sin;
  car.z = start.z + (u - initialU) * cos;
  const top = car.platform.topAt!(0, 0, 0);
  car.y = startY - 0.04 * (u - initialU) + PLATFORM.up + 0.08 - top;
  car.yaw = deckYaw;

  if (rider) {
    const localZ = (rider.position.x - car.x) * sin + (rider.position.z - car.z) * cos;
    const localX = (rider.position.x - car.x) * cos - (rider.position.z - car.z) * sin;
    const surface = car.y + car.platform.topAt!(localX, localZ, 0);
    if (opening) {
      const foot = { x: car.x, z: car.z, c: cos, s: sin, hw: car.platform.hx, hd: car.platform.hz };
      const exit = siteExit(
        rider.position,
        foot,
        car.y,
        [
          { dx: 0, dy: 0, dz: 0, hx: foot.hw, hy: car.hy, hz: foot.hd },
          { dx: 0, dy: surface - car.y - 0.05, dz: 0, hx: foot.hw, hy: 0.05, hz: foot.hd },
        ],
        landward(outOf),
      );
      if (exit) rider.position.set(exit.x, rider.position.y, exit.z);
    } else if (
      u > deckU(car.body.position) + 0.0005 &&
      u - deckU(car.body.position) <= car.speedLimit * FIXED &&
      coyote > 0 &&
      Math.abs(localX) <= car.platform.hx &&
      localZ >= car.platform.hz - 0.15 &&
      localZ <= car.platform.hz + 0.9 &&
      Math.abs(rider.position.y - PLAYER_R - (surface - PLATFORM.up)) < 0.25
    ) {
      const back = localZ - car.platform.hz + PLAYER_R;
      rider.position.set(
        rider.position.x - back * sin,
        surface + back * 0.04 + PLAYER_R,
        rider.position.z - back * cos,
      );
    }
  }
  if (opening) deck.snap();
}

// ---------------------------------------------------------------- the turntable's deck as a ride
// The turntable's deck as a ride (./roundhouse-view.ts). At rest the deck is static boxes; they go for a turn, so the
// deck never shoves anyone in the pit. Whoever has their feet on the deck's top (at rest or turning; never while rising
// from below, out of the pit: a jump from the pit floor that clears the top and comes down on it does land on it) rides a kinematic copy of it on their own tab (./car.ts, the carry the trains and the railhead
// traveller use: velocity, spin and the idle edge hold); it waits under the land for anyone else. Leaving it (a jump,
// a step off) drops the deck's speed, so they land on the deck or in the pit, never thrown past the pit's wall.
// The deck is a shared platform (`railway:table`): a rider sends their place on it (the `riding` presence,
// src/entities/remote-player/), and every tab draws them on its own deck, whatever yaw that tab shows. For that a
// marker car, a 1 cm box at the deck's centre, follows the drawn deck on every tab. It is only found by id, for
// drawing: it collides with nothing (mask 0) and is never stood on (its `topAt` is out of reach, so the carry never
// takes it). It registers first, so it is what `platformById` finds; on the rider's tab the two agree.
type XZ = { x: number; z: number };
/** Feet this far over the deck's top (a jump) still ride it; under it, as far as the carry counts (CARRY.below). A
 * ride starts only with the feet at the top, within START of it, and not rising (0.1 m/s at most). */
const ABOVE = 3,
  START = 0.05,
  PARKED = -60, // m: the riding deck waits under the land, as a train not yet needed does
  ID = 'railway:table';

export function createTableRide(owner: OwnedView, table: XZ, r: number, top: number) {
  const half = bridgeHalf(r);
  let riding = false,
    stood = false, // the carry stood this tab's player on the deck in the last step
    yaw = 0,
    rate = 0, // rad/s the drawn deck turned over the last frame
    since = 0; // s stepped since the last frame's yaw
  const centre = top - BRIDGE.h / 2;
  const marker = makeCar({ hx: 0.005, hz: 0.005, top: BOTTOM + 0.01 }, new Group(), step, { mask: 0 }, owner);
  const car = makeCar({ hx: half.hx, hz: half.hz, top: BOTTOM + BRIDGE.h }, new Group(), drive, {}, owner);
  for (const c of [marker, car]) {
    c.platform.id = ID;
    c.platform.shared = true;
    // A show-off turn peaks at about π rad/s; the deck is drawn at its yaw, so the bodies follow it exactly.
    c.spinLimit = 2 * Math.PI;
    c.spinGain = 1 / FIXED;
  }
  // No top anyone's feet can reach: the carry (src/physics/platforms.ts, stands) never holds anyone on the marker.
  marker.platform.topAt = () => Infinity;
  /** The drawn deck's pose, led by its turn since the frame drew it (physics steps before the views draw, so without
   * the lead the rider would trail the drawn deck by a frame). */
  function pose(c: Car) {
    c.x = table.x;
    c.z = table.z;
    c.y = centre;
    c.yaw = yaw + rate * since;
  }
  /** Every fixed step, first (the marker registered first): the drawn deck's pose. */
  function step() {
    since += FIXED;
    pose(marker);
  }
  /** Then, before the carry: whether this tab's player rides the deck. */
  function drive() {
    pose(car);
    const b = me.body;
    // Off the deck since the last step: the deck's speed goes with it (a train's or the railhead's keeps it).
    if (stood && carry.on !== car.platform && b) {
      b.velocity.x -= carry.x;
      b.velocity.z -= carry.z;
      carry.x = carry.z = 0;
    }
    stood = carry.on === car.platform;
    riding = !!b && (riding ? over(b, car.yaw, -CARRY.below) : b.velocity.y <= 0.1 && over(b, car.yaw, -START));
    if (!riding) car.y = PARKED;
  }
  /** Whether the body is over the deck turned `at`, its feet from `low` to ABOVE over its top. */
  function over(b: Body, at: number, low: number) {
    const dx = b.position.x - table.x,
      dz = b.position.z - table.z;
    const across = dx * Math.cos(at) - dz * Math.sin(at),
      along = dx * Math.sin(at) + dz * Math.cos(at),
      feet = b.position.y - PLAYER_R - top;
    return (
      Math.abs(across) <= half.hx + CARRY.edge &&
      Math.abs(along) <= half.hz + CARRY.edge &&
      feet >= low &&
      feet <= ABOVE
    );
  }
  return {
    /** Once a frame with the deck's drawn yaw. */
    update(drawn: number, dt: number) {
      rate = dt > 0 ? (angleLerp(yaw, drawn, 1) - yaw) / dt : 0;
      yaw = drawn;
      since = 0;
    },
  };
}
