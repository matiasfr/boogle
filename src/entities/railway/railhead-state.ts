import { FIXED, PLAYER_R } from '../../constants.ts';
import { carry } from '../../physics/platforms.ts';
import { me } from '../../player/state.ts';
import type { Body } from '../../physics/engine.ts';
import { siteExit } from '../../place/site-clearance.ts';
import type { outOf as moveOutside } from '../../place/sites.ts';
import { RING_S, line2World, line2Y } from './line2-path.ts';
import { BENTS, headU, PLATFORM, SIDE } from './railhead-shape.ts';
import type { Car } from './car.ts';

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
export const railheadDrawn = { u: initialU };
export const deckYaw = Math.atan2(sin, cos);
const idleOffsets = new WeakMap<Car, { body: Body; x: number; z: number }>();
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
        outOf,
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
