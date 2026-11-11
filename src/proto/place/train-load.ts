// Settled train cargo shares the car's kinematic body and carry frame. Flights never collide with riders.
// Owner physics, derived locally from the existing train load; no new shared state or cart cargo behavior.
import { PLAYER_R } from '../../constants.ts';
import { setShapes, teleport, type Shape } from '../../physics/engine.ts';
import { CARRY, carry, toPlatform } from '../../physics/platforms.ts';
import { me } from '../../player/player.ts';
import { deckBox, type Deck } from '../../render/crates.ts';
import type { Car } from './rail.ts';

export function solidTrainLoad(car: Car, load: Deck) {
  let mask = -1;
  let boxes: ReturnType<typeof deckBox>[] = [];
  const local = { x: 0, y: 0, z: 0, yaw: 0 };
  const boxAt = (x: number, z: number) => {
    let support: (typeof boxes)[number] | undefined;
    for (const box of boxes)
      if (
        Math.abs(x - box.x) <= box.size / 2 + CARRY.edge &&
        Math.abs(z - box.z) <= box.size / 2 + CARRY.edge &&
        (!support || box.bottom + box.size > support.bottom + support.size)
      )
        support = box;
    return support;
  };
  const topAt = (x: number, z: number) => {
    const box = boxAt(x, z);
    return car.hy + (box ? box.bottom + box.size : 0);
  };
  car.platform.topAt = topAt;
  car.supportAt = (x, z) => {
    const box = boxAt(x, z);
    return box && { x: box.x, z: box.z, hx: box.size / 2, hz: box.size / 2 };
  };
  return () => {
    let next = 0;
    load.held.forEach((c, k) => {
      if (c?.landed) next |= 1 << k;
    });
    if (next === mask) return;
    mask = next;
    const rider = carry.on === car.platform ? me.body : null;
    if (rider) toPlatform(car.platform, rider.position, me.yaw, local);
    const wasTop = topAt(local.x, local.z);
    boxes = load.held.flatMap((c, k) => (c?.landed ? [deckBox(k)] : []));
    const shapes: Shape[] = [{ kind: 'box', hx: car.spec.hx, hy: car.hy, hz: car.spec.hz }];
    for (const box of boxes)
      shapes.push({
        kind: 'box',
        hx: box.size / 2,
        hy: box.size / 2,
        hz: box.size / 2,
        offset: { x: box.x, y: car.hy + box.bottom + box.size / 2, z: box.z },
      });
    // A crate arriving/disappearing under someone changes their support, not their launch velocity.
    if (rider && me.jumpQueued <= 0 && rider.velocity.y - carry.y <= CARRY.leaveVy) {
      const gap = local.y - PLAYER_R - wasTop;
      if (gap >= -CARRY.below && gap <= CARRY.above) {
        const delta = topAt(local.x, local.z) - wasTop;
        if (delta) teleport(rider, rider.position.x, rider.position.y + delta, rider.position.z);
      }
    }
    setShapes(car.body, shapes);
  };
}
