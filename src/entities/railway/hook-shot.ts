// The shared hook fact grants an Owner pull. Local targeting/presentation never changes the railway ledger.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import { account, rail } from '../../sim/railway-rows.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { GRAVITY, PLAYER_MASS, PLAYER_R } from '../../constants.ts';
import { onStart } from '../../loop.ts';
import { fallArrival } from '../../fall/arrival.ts';
import { me, camForward, followEye } from '../../player/player.ts';
import { inputState } from '../../player/input-state.ts';
import { registerAction, wrapAction } from '../../player/controls.ts';
import { getMask, raycastClosest, rayHit, sweepSphere } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { addPresenceField } from '../../netplay/net.ts';
import {
  buildPull,
  cancelVelocity,
  createHookLatch,
  holdPick,
  overLip,
  ringScore,
  stepPull,
  type HookRing,
  type Pull,
} from './hook-path.ts';
import { createRailwayHookView } from './hook-view.ts';
import { registerHookProbe } from './state.ts';
import { playMark } from '../../proto/mark.ts';

type Active = { press: () => void; cancel: () => void; pulling: () => boolean; ring: () => string | null };
let active: Active | null = null;
let registered = false;
addPresenceField('railwayHook', () => active?.ring() ?? null);
onStart(() =>
  wrapAction('back', {
    down: (next) => {
      if (active?.pulling()) active.cancel();
      else next();
    },
  }),
);

export async function createRailwayHook(adapter: RailwayAdapter, owner: OwnedView) {
  const [view, tech] = await Promise.all([createRailwayHookView(owner), import('../../place/tech-layout.ts')]);
  const { MOVE } = tech;
  const latch = createHookLatch(),
    hold = holdPick();
  let owned = false,
    pick: HookRing | null = null,
    pull: Pull | null = null;
  let pulls = 0,
    denied = 0,
    ended = 0;
  let demoLeft = -1;
  let summitReached = false;
  const range = new Set<HookRing>();
  const fwd = new THREE.Vector3(),
    to = new THREE.Vector3(),
    from = new THREE.Vector3(),
    end = new THREE.Vector3();
  const hit = rayHit();
  // Not with a footing on your back (docs/plans/works-late-game.md, step 2b): carrying one opens no new travel edge.
  const canPress = () =>
    owned &&
    !!me.body &&
    !fallArrival.active &&
    !me.swimming &&
    !inputState.seated &&
    !inputState.held &&
    !me.down &&
    !account(adapter.read.world(), adapter.read.pid)?.foot;
  function score(r: HookRing) {
    const b = me.body!;
    // The player's aim, never a cinematic's camera: a switch shot must not steer or blank the pick.
    to.set(r.at.x - followEye.x, r.at.y - followEye.y, r.at.z - followEye.z).normalize();
    return ringScore(
      to.dot(fwd),
      Math.hypot(r.at.x - b.position.x, r.at.y - b.position.y, r.at.z - b.position.z),
      MOVE.hookCone,
    );
  }
  function clearFor(r: HookRing) {
    const b = me.body!;
    const lip = overLip(r, b.position.x, b.position.z),
      mask = getMask(b) & GROUP.SCENERY;
    for (const dy of [0, 0.8]) {
      from.set(b.position.x, b.position.y + dy + 1.3, b.position.z);
      end.set(lip.x, lip.y + dy, lip.z);
      if (sweepSphere(from, end, PLAYER_R * 0.8, { mask, thin: 'skip' }) >= 0) return false;
    }
    return true;
  }
  function whyNot(r: HookRing) {
    const b = me.body;
    if (!b) return 'no body';
    camForward(fwd);
    const d = Math.hypot(r.at.x - b.position.x, r.at.y - b.position.y, r.at.z - b.position.z);
    if (d > MOVE.hookRange) return `too far, ${d.toFixed(1)} m`;
    if (score(r) < 0) return 'off the middle of the view';
    from.set(b.position.x, b.position.y + 0.8, b.position.z);
    end.set(r.at.x, r.at.y, r.at.z).sub(from);
    end.setLength(Math.max(0, end.length() - 1.2)).add(from);
    if (raycastClosest(from, end, { mask: getMask(b) & GROUP.SCENERY, skipBackfaces: true }, hit))
      return `something in the way at ${hit.distance.toFixed(1)} of ${from.distanceTo(end).toFixed(1)} m`;
    return clearFor(r) ? 'nothing' : 'no room for the body';
  }
  function pickRing(now: number) {
    range.clear();
    const b = me.body;
    if (!owned || !b || pull) {
      pick = null;
      return;
    }
    camForward(fwd);
    let best: HookRing | null = null,
      bestScore = Infinity,
      currentScore = Infinity;
    for (const r of view.rings) {
      if (Math.hypot(r.at.x - b.position.x, r.at.y - b.position.y, r.at.z - b.position.z) > MOVE.hookRange) continue;
      if (
        Math.hypot(r.land.x - b.position.x, r.land.z - b.position.z) < r.pad.hx + 0.6 &&
        Math.abs(r.pad.top + 1 - b.position.y) < 2.2
      )
        continue;
      range.add(r);
      const sc = score(r);
      if (sc < 0 || whyNot(r) !== 'nothing') continue;
      if (r === pick) currentScore = sc;
      if (sc < bestScore) {
        bestScore = sc;
        best = r;
      }
    }
    const id = hold(pick?.id ?? null, currentScore, best?.id ?? null, bestScore, now);
    pick = id ? (view.ringById.get(id) ?? null) : null;
  }
  function endPull() {
    pull = null;
    ended++;
    view.end();
  }
  function cancel() {
    if (!pull) return;
    const b = me.body;
    if (b) {
      const v = cancelVelocity(b.velocity, MOVE);
      b.velocity.set(v.x, v.y, v.z);
    }
    endPull();
  }
  function press(ring: HookRing | null = pick) {
    if (!canPress()) return;
    if (pull) {
      cancel();
      return;
    }
    if (!ring) {
      denied++;
      view.deny();
      return;
    }
    pull = buildPull(me.body!.position, ring);
    me.jumpQueued = 0;
    pulls++;
    playMark('hook pulled', { ring: ring.id, authority: 'local' });
    view.fire(ring);
  }
  const controls: Active = { press: () => press(), cancel, pulling: () => !!pull, ring: () => pull?.ring.id ?? null };
  active = controls;
  const offProbe = registerHookProbe((id) => {
    const ring = view.ringById.get(id);
    return ring ? whyNot(ring) : 'unknown ring';
  });
  owner.cleanup(() => {
    pull = null;
    if (active === controls) {
      active = null;
      document.body.classList.remove('place-has-hook');
    }
    offProbe();
  });
  return {
    /** The island's ring on its sea pile, once the gap is footed (hook-view.ts). */
    setIslandRing: view.setIslandRing,
    demo() {
      demoLeft = 0.3;
    },
    prePhysics() {
      if (pull && me.jumpQueued > 0) cancel();
    },
    fixedPre() {
      if (!pull) return false;
      const b = me.body;
      if (!b || fallArrival.active || me.swimming || inputState.seated || me.down) {
        cancel();
        return false;
      }
      const step = stepPull(pull, b.position, MOVE);
      if (step.stall) {
        cancel();
        return true;
      }
      b.velocity.set(step.v.x, step.v.y, step.v.z);
      b.force.y = PLAYER_MASS * GRAVITY;
      me.wish.set(0, 0, 0);
      me.coyote = 0;
      if (step.done) endPull();
      return true;
    },
    update(dt: number, now: number) {
      owned = latch(adapter.read.ready(), rail(adapter.read.world()).hook, dt);
      const summit = view.ringById.get('summit');
      const p = me.body?.position;
      if (
        !summitReached &&
        owned &&
        summit &&
        p &&
        !me.swimming &&
        Math.abs(p.x - summit.land.x) <= summit.pad.hx &&
        Math.abs(p.z - summit.land.z) <= summit.pad.hz &&
        Math.abs(p.y - PLAYER_R - summit.pad.top) < 1
      ) {
        summitReached = true;
        playMark('needle bell summit reached', { authority: 'local' });
      }
      if (owned && !registered) {
        registered = true;
        registerAction('hook', {
          pad: 'rb',
          key: 'KeyF',
          label: 'Hook shot, at a ring',
          touch: { label: 'Hook', className: 'place-hook-btn' },
          group: 'move',
          order: 2,
          down: () => active?.press(),
        });
      }
      document.body.classList.toggle('place-has-hook', owned);
      if (demoLeft >= 0) {
        demoLeft -= dt;
        if (demoLeft <= 0) {
          demoLeft = -1;
          const p2 = view.ringById.get('p2')!,
            t0 = view.ringById.get('t0')!,
            b = me.body;
          if (
            b &&
            !pull &&
            me.coyote > 0 &&
            Math.abs(b.position.y - PLAYER_R - p2.pad.top) < 1 &&
            Math.hypot(b.position.x - p2.land.x, b.position.z - p2.land.z) < 4 &&
            clearFor(t0)
          )
            press(t0);
        }
      }
      pickRing(now);
      view.update(dt, now, owned, pick, pull?.ring ?? null, range, pulls);
    },
    inspect: () => ({
      owned,
      pick: pick?.id ?? null,
      pulling: !!pull,
      ring: pull?.ring.id ?? null,
      pulls,
      denied,
      ended,
      rings: view.rings.map((r) => ({ id: r.id, x: r.at.x, y: r.at.y, z: r.at.z })),
      remoteCables: view.remoteCables(),
      chip: view.chip(),
    }),
  };
}
