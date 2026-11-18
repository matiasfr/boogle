import { Group } from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { FIXED, PLAYER_R } from '../../constants.ts';
import { carry } from '../../physics/platforms.ts';
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
import { makeCar, snapCar, type Car } from './car.ts';

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
