// Owner-only, installed with Home's ground (land.ts; until 24 November by the sculpted cove face's view, which is gone:
// docs/plans/cliff-kit-everywhere.md, step 1). No change to moving friction or shared physics rules.
import { GRAVITY, PLAYER_MASS, WALKABLE_NY } from '../constants.ts';
import { defineKind, despawn, spawn } from '../entity/entity.ts';
import type { OwnedView } from '../render/owned-view.ts';
import { forEachContact, forEachStatic, type Body } from '../physics/engine.ts';
import { carry } from '../physics/platforms.ts';
import { GROUP } from '../physics/physics.ts';
import { me } from '../player/state.ts';

defineKind('place-cove-stop', { fixedPre: 44 });
/** Holds an idle player still on static scenery (Home's ground, the cliff kit, the landing) while the ground's view
 * stands. */
export function installCoveStop(owner: OwnedView) {
  const stop = spawn({ kind: 'place-cove-stop', fixedPre: holdCoveStop });
  owner.cleanup(() => despawn(stop));
}

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
