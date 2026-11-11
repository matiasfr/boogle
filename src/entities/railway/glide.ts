// The glider: a shared fact (the Rail row's `glide`) grants an Owner glide, ported from Place's moves.ts. Physics is this tab's;
// a partner sees the canopy through presence `railwayGlide` (true while it's out, null when shut). Which move has the
// body each step (hook, then glide, then the jump) is decided in move-order.ts, not here.
//
// Opening: Jump in the air once no air jump is left, or the Glide action (LB / Q / touch) as a toggle. Jump while it's
// open does nothing. A shouldered great beam or boiler keeps it shut (docs/brainstorms/glider-placement.md, call 16).
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { account, rail } from '../../sim/railway-rows.ts';
import { boilerHeld, held } from '../../sim/railway-queries.ts';
import { GRAVITY, PLAYER_MASS } from '../../constants.ts';
import { fallArrival } from '../../fall/arrival.ts';
import { me } from '../../player/player.ts';
import { inputState } from '../../player/input-state.ts';
import { registerAction } from '../../player/controls.ts';
import { addPresenceField } from '../../netplay/net.ts';
import { getMask, raycastClosest, rayHit } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { playMark } from '../../proto/mark.ts';
import { createHookLatch } from './hook-path.ts';
import { GLIDE_ARM_MS, closeGlide, createGlide, openGlide, rearmGlide, stepGlide } from './glide-step.ts';
import { createRailwayGlideView } from './glide-view.ts';

type Active = { toggle: () => void; open: () => boolean };
let active: Active | null = null;
let registered = false;
addPresenceField('railwayGlide', () => (active?.open() ? true : null));
/** Your canopy is out (the first-fall teach in ability-arrival.ts ends on it). */
export const railwayGlideOpen = () => active?.open() ?? false;
/** Below this much air under you, a Jump press stays the controller's landing buffer rather than opening the canopy. */
const JUMP_OPEN_CLEARANCE = 1.6;

export async function createRailwayGlide(adapter: RailwayAdapter, owner: OwnedView, hookPulling: () => boolean) {
  const view = await createRailwayGlideView(owner);
  const latch = createHookLatch();
  const g = createGlide();
  const before = { x: 0, z: 0 },
    v = { x: 0, y: 0, z: 0 };
  const from = new THREE.Vector3(),
    to = new THREE.Vector3();
  const hit = rayHit();
  let owned = false,
    has = false,
    jumpOpens = 0,
    toggles = 0;
  const shouldered = () => {
    const w = adapter.read.world(),
      pid = adapter.read.pid;
    return held(w, pid) || boilerHeld(w, pid) || !!account(w, pid)?.foot;
  };
  const canAct = () =>
    owned &&
    !!me.body &&
    !fallArrival.active &&
    !me.swimming &&
    !inputState.seated &&
    !inputState.held &&
    !me.down &&
    !shouldered();
  const grounded = () => me.coyote > 0;
  function open() {
    openGlide(g);
    if (g.opened === 1) playMark('glide opened', { authority: 'local' });
  }
  function toggle() {
    if (!canAct() || hookPulling()) return;
    toggles++;
    if (g.open) return closeGlide(g);
    if (grounded()) {
      g.armUntil = performance.now() + GLIDE_ARM_MS; // a press as you step off still counts
      return;
    }
    open();
  }
  /** Enough air under you that a Jump press means the canopy, not a jump on landing. */
  function airUnder() {
    const b = me.body!;
    from.set(b.position.x, b.position.y, b.position.z);
    to.set(b.position.x, b.position.y - JUMP_OPEN_CLEARANCE, b.position.z);
    return !raycastClosest(from, to, { mask: getMask(b) & GROUP.SCENERY }, hit);
  }
  const controls: Active = { toggle, open: () => g.open };
  active = controls;
  owner.cleanup(() => {
    closeGlide(g);
    if (active === controls) {
      active = null;
      document.body.classList.remove('place-has-glide');
    }
  });
  return {
    /** Entity fixedPre order 23, before the controller (40): the velocity whose steering the glide keeps. */
    noteVelocity() {
      const b = me.body;
      if (!b) return;
      before.x = b.velocity.x;
      before.z = b.velocity.z;
    },
    /** The hook has the body: it closes the canopy (move-order.ts). */
    close: () => closeGlide(g),
    /** After the air jump's step (move-order.ts); airJumped: it fired this step. */
    fixedPre(airJumped: boolean) {
      const b = me.body;
      if (!b) return;
      if (!canAct()) return closeGlide(g);
      if (grounded()) {
        if (g.open) closeGlide(g);
        return;
      }
      if (g.armUntil && performance.now() < g.armUntil) open();
      if (airJumped) rearmGlide(g);
      else if (me.jumpQueued > 0 && airUnder()) {
        // No air jump left (or none found): Jump opens it; while it's open, Jump does nothing.
        if (!g.open) {
          open();
          jumpOpens++;
        }
        me.jumpQueued = 0;
      }
      if (!g.open) return;
      v.x = b.velocity.x;
      v.y = b.velocity.y;
      v.z = b.velocity.z;
      // The numbers are the room's `railGlide*` tunables, through the adapter's movement (a GlideMove subset), read.movement().
      if (!stepGlide(g, before, v, me.wish, adapter.read.movement())) return;
      b.velocity.set(v.x, v.y, v.z);
      b.force.y = PLAYER_MASS * GRAVITY; // gravity's taken out once, and nothing else has a say
    },
    update(dt: number, now: number) {
      const ready = adapter.read.ready(),
        glide = rail(adapter.read.world()).glide;
      has = ready && glide;
      owned = latch(ready, glide, dt);
      if (owned && !registered) {
        registered = true;
        // LB/Q, checked free against `npm run registry -- --json`; off the guide and touch layout until it's granted.
        registerAction('glide', {
          pad: 'lb',
          key: 'KeyQ',
          label: 'Open or close the glider, in the air',
          touch: { label: 'Glide', className: 'place-glide-btn' },
          group: 'move',
          order: 3,
          down: () => active?.toggle(),
        });
      }
      document.body.classList.toggle('place-has-glide', owned);
      view.update(dt, now, has, g.open, g.holding);
    },
    inspect: () => ({
      owned,
      open: g.open,
      holding: g.holding,
      opened: g.opened,
      flights: g.flights,
      jumpOpens,
      toggles,
      shouldered: shouldered(),
      ...view.inspect(),
    }),
  };
}
