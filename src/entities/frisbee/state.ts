// One disc for a completed Boathouse. The current owner advances the glide. A new
// owner starts at the last sampled pose, including its velocity on disconnect.
import { Vector3 } from 'three';
import { REACH } from '../../constants.ts';
import { stepDisc, STEP } from '../../physics/flight.ts';
import { toyGround } from '../../physics/toy-ground.ts';
import { me, handPosition } from '../../player/state.ts';
import { createOwnerSync, type OwnerClaim } from '../../netplay/owner-sync.ts';
import { addPresenceField, onRemotePresence, sendPresence } from '../../netplay/net.ts';

export const disc = {
  enabled: false,
  e: 0,
  myE: 0,
  mine: false,
  remoteOwned: false,
  held: false,
  p: new Vector3(),
  v: new Vector3(),
  rack: new Vector3(),
};
type DiscClaim = OwnerClaim & { h: number };
const owner = createOwnerSync<DiscClaim>(disc, {
  setMode() {}, // Kinematic flight uses p and v directly.
  loadBody() {},
  writePose(p, _a, b) {
    disc.p.fromArray(p);
    disc.v.fromArray(b.v);
  },
  adoptOrphan() {
    if (disc.p.distanceToSquared(disc.rack) > 0.01 && !disc.v.lengthSq()) disc.v.y = -0.1;
    disc.held = false;
    owner.claim('sim');
  },
  onRelease() {
    disc.held = false;
  },
  onOwner(c) {
    disc.held = c?.h === 1;
  },
  extrapolateMs: 150,
});
addPresenceField('frisbee', () =>
  disc.enabled && disc.mine
    ? {
        e: disc.myE,
        p: disc.p.toArray(),
        v: disc.v.toArray(),
        q: [0, 0, 0, 1],
        h: Number(disc.held),
      }
    : null,
);
onRemotePresence((r, pr, time) => {
  const c = pr.frisbee as Partial<DiscClaim> | null;
  owner.hear(
    r.peer,
    c &&
      (c.h === 0 || c.h === 1) &&
      Number.isSafeInteger(c.e) &&
      c.e! >= 0 &&
      c.e! < 2 ** 48 &&
      Array.isArray(c.p) &&
      c.p.length === 3 &&
      c.p.every((n) => Math.abs(n) < 16384) &&
      Array.isArray(c.v) &&
      c.v.length === 3 &&
      c.v.every((n) => Math.abs(n) <= 256)
      ? c
      : null,
    time,
  );
});

export function enableDisc(at: Vector3) {
  disc.rack.copy(at);
  disc.p.copy(at);
  disc.v.set(0, 0, 0);
  disc.enabled = true;
}
export const yieldDisc = owner.release;
export function disableDisc() {
  disc.enabled = false;
  owner.release();
  disc.held = false;
}
export function grabDisc() {
  if (!disc.enabled || disc.held || handPosition().distanceTo(disc.p) >= REACH) return false;
  disc.held = true;
  disc.v.set(0, 0, 0);
  owner.claim('ghost');
  return true;
}
export function recallDisc() {
  if (!disc.enabled || disc.held) return;
  disc.p.copy(disc.rack);
  disc.v.set(0, 0, 0);
  owner.claim('sim');
}
export function releaseDisc(p: Vector3, v: Vector3) {
  if (!disc.mine || !disc.held) return;
  disc.p.copy(p);
  disc.v.copy(v);
  disc.held = false;
  sendPresence();
}
export function updateDisc(now: number, dt: number) {
  owner.resolve(now);
  owner.sample();
  if (!disc.mine) return;
  if (disc.held && me.body) {
    handPosition(disc.p);
    return;
  }
  if (!disc.v.lengthSq()) return;
  for (let left = dt; left > 0; left -= STEP) {
    stepDisc(disc.p, disc.v, Math.min(STEP, left));
    const { x, y, z } = disc.p;
    if (!toyGround.inside(x, z) || y < -1) {
      recallDisc();
      return;
    }
    const floor = toyGround.under(x, z);
    if (y <= floor + 0.04) {
      disc.p.y = floor + 0.04;
      disc.v.set(0, 0, 0);
      return;
    }
  }
}
