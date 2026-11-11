// Owner-only, installed by the cove experiment. No change to moving friction or shared physics rules.
import { GRAVITY, PLAYER_MASS, WALKABLE_NY } from '../constants.ts';
import { forEachContact, forEachStatic, type Body } from '../physics/engine.ts';
import { carry } from '../physics/platforms.ts';
import { GROUP } from '../physics/physics.ts';
import { me } from '../player/state.ts';

const staticSupports = new WeakSet<Body>();
export function holdCoveStop() {
  const b = me.body;
  if (!b || !me.entered || me.down || me.swimming || carry.on || me.jumpQueued > 0 || me.wish.lengthSq() > 0.0001)
    return;
  if (Math.hypot(b.velocity.x, b.velocity.z) > 0.1 || b.velocity.y < -1 || b.velocity.y > 0.05 || b.force.y > 0) return;
  let nx = 0,
    ny = WALKABLE_NY,
    nz = 0;
  forEachContact(b, (x, y, z, other) => {
    if (y <= ny) return;
    if (!staticSupports.has(other)) forEachStatic(GROUP.SCENERY, (body) => staticSupports.add(body));
    if (staticSupports.has(other)) {
      nx = x;
      ny = y;
      nz = z;
    }
  });
  if (ny === WALKABLE_NY) return;
  // The controller has zero friction: braking X/Z alone lets each subsequent gravity step slide again.
  // Cancel only gravity tangent to actual walkable support, retaining its normal load/contact.
  const weight = PLAYER_MASS * GRAVITY - Math.min(0, b.force.y);
  b.velocity.set(0, 0, 0);
  b.force.x -= weight * ny * nx;
  b.force.y += weight * (1 - ny * ny);
  b.force.z -= weight * ny * nz;
}
