// Co-op abilities, option E (docs/brainstorms/coop-abilities.md): an ability is the room's the moment anyone finds it
// (one accepted railway fact), and each player is shown it their own way. The finder gets the full "You got" card
// (tools.ts, line2-view.ts); everyone else gets a small flourish where they stand that never holds input: a teal puff
// at the ankles, the pickup's two notes and the charge mark lit by Buddy's feet. A friend who wasn't there gets that
// flourish once on their first landing. All Local: what this player has been shown lives in this browser only.
//
//   seen(key) / remember(key)   this player's record per railway room: 'jump', 'hook', 'glide', 'multi-axe', 'axe',
//                               'pack', 'boiler', 'jump-taught', 'glide-taught', 'plinth:jump'
//
// The axes follow the same rule. The multi-axe is the machine's wake: the player who pressed wake gets the card (once
// the server has accepted it, reward.ts); everyone else gets the flourish as the wake finishes. The proper axe is
// the chest's: the opener gets the card, everyone else the flourish. An axe has no charge ring: a small model of it
// pops up over Buddy and settles away. The pack frame (the forge's chest, a back of 16 for everyone) works the same,
// and so does the boiler (fitted on the old train, trains for everyone): the fitter has the wake, the rest a small
// boiler over Buddy (boiler-first-choice plan, step 9).
//   update(dt)                  late flourishes, the charge mark, the first-jump teach and the first-fall glide teach
//
// The glider's teach is everyone's, the finder's too (its device teaches nothing): the first time you fall fast with the
// glider and the canopy shut, the Glide action's glyph pulses at Buddy's back. Glide, not Jump, while the double jump is
// still yours: Jump spends the air jump first and opens the canopy only on a second press (glider-b plan, finding 2).
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { me } from '../../player/player.ts';
import { inputState } from '../../player/input-state.ts';
import { glyph } from '../../player/glyphs.ts';
import { fallArrival } from '../../fall/arrival.ts';
import { localJumpCount } from '../player/state.ts';
import { getRoomId } from '../../netplay/net.ts';
import { identity } from '../../player/identity.ts';
import { PLAYER_R, reducedMotion } from '../../constants.ts';
import { placeSound, type PlaceCue } from '../../render/place-sfx.ts';
import { rewardSparkles } from '../../render/reward-particles.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';
import { toScreen } from '../../render/scene.ts';
import { railwayRoomId } from '../../world/railway-namespace.ts';
import { railwayGlideOpen } from './glide.ts';
import { rail, type ReadWorld } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { railPhase } from '../../sim/railway-queries-line1.ts';

/** What an ability's `has` reads: the rows now, and the estimated tick the line-one phase is judged at. */
type Look = { w: ReadWorld; tick: number; phase: ReturnType<typeof railPhase> };
const AWAKE = ({ w, phase }: Look) => rail(w).awake >= 0 && phase !== 'asleep' && phase !== 'waking';
const ABILITIES: {
  key: string;
  op: RailwayAccepted['op'];
  cue: PlaceCue;
  has: (l: Look) => boolean;
  /** An axe's flourish is a floating model of it rather than a charge mark; the model comes from the caller. */
  badge?: boolean;
  /** Shown when the state turns (the wake's end), not when the event arrives. */
  atState?: boolean;
}[] = [
  { key: 'jump', op: 'rail.jump', cue: 'pickupJump', has: ({ w }) => rail(w).jump },
  { key: 'hook', op: 'rail.hook', cue: 'pickupHook', has: ({ w }) => rail(w).hook },
  { key: 'glide', op: 'rail.glide', cue: 'pickupGlider', has: ({ w }) => rail(w).glide, badge: true },
  { key: 'multi-axe', op: 'rail.wake', cue: 'pickupHook', has: AWAKE, badge: true, atState: true },
  { key: 'axe', op: 'rail.axe', cue: 'pickupHook', has: ({ w }) => rail(w).axe, badge: true },
  { key: 'pack', op: 'rail.pack', cue: 'pickupHook', has: ({ w }) => rail(w).pack, badge: true },
  { key: 'boiler', op: 'rail.boilerFit', cue: 'pickupHook', has: ({ w }) => line2Trains(w), badge: true },
];
const BADGE_S = 1.5;
const TEAL = new THREE.Color('#39e6c6');
const FLASH_S = 1.6; // the mark stays lit this long after a flourish
const FILL_S = 0.9; // and this long after it fills on landing
const TEACH_S = 1.3;
/** The glide teach: falling faster than this (m/s) with the canopy shut, a little over the step-off. */
const GLIDE_TEACH_FALL = 4;
const GLIDE_TEACH_UP = 1.2; // m over Buddy's feet: at the back, where the roll is

/** This player's record of what they've been shown, per railway room. Unavailable storage just forgets. */
function createSeen() {
  const storageKey = `boogle.railway-seen.v0:${railwayRoomId(getRoomId())}:${identity.pid}`;
  let keys = new Set<string>();
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (Array.isArray(saved)) keys = new Set(saved.filter((k): k is string => typeof k === 'string'));
  } catch {
    // An unreadable record is an empty one.
  }
  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...keys]));
    } catch {
      // Unavailable storage: shown again on the next visit, which is harmless.
    }
  };
  return {
    has: (key: string) => keys.has(key),
    add(key: string) {
      if (keys.has(key)) return;
      keys.add(key);
      save();
    },
    /** A world that no longer has the ability (a fresh start) gets its moments again. */
    forget(prefix: string) {
      const before = keys.size;
      for (const k of keys) if (k === prefix || k.startsWith(`${prefix}-`) || k.endsWith(`:${prefix}`)) keys.delete(k);
      if (keys.size !== before) save();
    },
  };
}
export type AbilitySeen = ReturnType<typeof createSeen>;

export function createAbilityArrival(
  adapter: RailwayAdapter,
  owner: OwnedView,
  env: {
    /** A "You got" card is up or waiting (the finder's own). */
    busy: () => boolean;
    /** The second jump's charge (tools.ts fixedPre): whether one is left, and whether it is being spent now. */
    jump: () => { charge: boolean; second: boolean };
    /** A fresh model of each axe for its flourish (shared materials; this file never disposes them). */
    axeModel: (key: string) => THREE.Object3D | null;
  },
) {
  const seen = createSeen();
  const stats = { flourishes: 0, late: 0, teaches: 0, fills: 0, keys: [] as string[] };
  /** Seconds each ability has been missing from a ready world: a fresh start, once it lasts (a resync's frozen view
   * can briefly show an older state). */
  const missing = new Map<string, number>();
  const watched = new Set<string>();

  // The charge mark: a filled teal ring under Buddy's feet, lit only by a flourish (hollow when its unlock arrived
  // mid-flight, filling on landing) and by the one-time first-jump teach. An ordinary jump draws nothing under you.
  const geometries = [
    new THREE.RingGeometry(0.24, 0.32, 32).rotateX(-Math.PI / 2),
    new THREE.CircleGeometry(0.2, 28).rotateX(-Math.PI / 2),
    new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2),
  ];
  const material = readableUnlit(new THREE.MeshBasicNodeMaterial({ color: TEAL, side: THREE.DoubleSide }));
  const mark = new THREE.Group();
  const ring = new THREE.Mesh(geometries[0], material);
  const fill = new THREE.Mesh(geometries[1], material);
  mark.add(ring, fill);
  mark.visible = false;
  for (const m of [ring, fill]) m.renderOrder = 2;
  owner.root.add(mark);
  // A flourish's ripple: a teal ring running out over the ground from Buddy's feet, readable from behind.
  const rippleMaterial = readableUnlit(
    new THREE.MeshBasicNodeMaterial({
      color: TEAL,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const ripple = new THREE.Mesh(geometries[2], rippleMaterial);
  ripple.visible = false;
  owner.root.add(ripple);
  // The jump button's own glyph beside the mark at the top of the first jump (moves-view.ts's chip, place.css).
  const chip = document.createElement('div');
  chip.className = 'place-key';
  (document.querySelector('.hud') ?? document.body).append(chip);
  const screen = { x: 0, y: 0 };
  const at = new THREE.Vector3();
  const CHIP_OFFSET = new THREE.Vector3(0.55, 0.15, 0);

  // An axe's flourish: its model rising over Buddy's head, popping in and shrinking away, a little spin.
  const badge = new THREE.Group();
  badge.visible = false;
  owner.root.add(badge);
  const BADGE_SIZE = 1.1; // m across, whatever it is
  const box = new THREE.Box3();
  const extent = new THREE.Vector3();
  let badgeT = 0;

  let flash = 0,
    pulse = 0,
    glidePulse = 0,
    deferred = false,
    lastVy = 0,
    lateWait = 0,
    rippleT = 0,
    jumpsGrounded = localJumpCount();
  const RIPPLE_S = 0.7;

  /** Where Buddy's feet are, a little under them. */
  const feet = (out: THREE.Vector3) => {
    const p = me.body!.interpolatedPosition;
    return out.set(p.x, p.y - PLAYER_R - 0.06, p.z);
  };
  function flourish(key: string, late: boolean) {
    const ability = ABILITIES.find((a) => a.key === key)!;
    seen.add(key);
    stats.flourishes++;
    if (late) stats.late++;
    stats.keys.push(key);
    const b = me.body;
    if (!b) return;
    feet(at);
    placeSound(ability.cue, at.x, at.z);
    if (!reducedMotion)
      rewardSparkles(at.x, at.y + 0.25, at.z, 34, 2.4, {
        color: TEAL,
        life: 0.6,
        lifeJitter: 0.5,
        size: 0.12,
        sizeJitter: 0.08,
        gravity: 1,
        drag: 1.4,
      });
    rippleT = RIPPLE_S;
    if (ability.badge) {
      const model = env.axeModel(key);
      if (model) {
        badge.clear();
        // Its bounds sit where the shared geometry was built, not under Buddy: never cull it by them.
        model.traverse((o) => {
          o.frustumCulled = false;
          o.castShadow = false;
        });
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        model.scale.setScalar(1);
        box.setFromObject(model);
        box.getSize(extent);
        model.scale.setScalar(BADGE_SIZE / Math.max(extent.x, extent.y, extent.z, 0.01));
        box.setFromObject(model);
        model.position.sub(box.getCenter(extent));
        badge.add(model);
        badgeT = BADGE_S;
        if (!reducedMotion)
          rewardSparkles(at.x, at.y + 2.4, at.z, 14, 1.4, { color: TEAL, life: 0.5, size: 0.1, gravity: 0.3 });
      }
    }
    if (key === 'jump') {
      flash = FLASH_S;
      // In the air the mark shows hollow and fills on landing (tools.ts never adds a jump mid-flight).
      deferred = me.coyote <= 0;
    }
  }

  const offAccepted = adapter.onAccepted((event) => {
    if (event.accepted <= 0) return;
    const ability = ABILITIES.find((a) => a.op === event.op);
    if (!ability) return;
    if (event.pid === adapter.read.pid) {
      // The finder has the card and the place itself; the plinth gives them the crowd, not a second card.
      seen.add(ability.key);
      if (ability.key === 'jump') seen.add('jump-taught');
      return;
    }
    if (ability.atState) return; // the wake's flourish comes as it ends (update)
    if (!seen.has(ability.key)) flourish(ability.key, false);
  });
  // A wake you pressed was predicted: if the server refuses it, there is no card, and nothing is marked as shown.
  const offCorrected = adapter.onCorrected((c) => {
    if (c.event.op === 'rail.wake') seen.forget('multi-axe');
    // A refused glider take: no card stands for it, and no flourish was marked as shown.
    if (c.event.op === 'rail.glide') seen.forget('glide');
  });

  const api = {
    seen,
    inspect: () => ({
      ...stats,
      keys: [...stats.keys],
      mark: mark.visible ? (fill.visible ? 'filled' : 'hollow') : 'off',
      teaching: pulse > 0,
      glideTeaching: glidePulse > 0,
      badge: badge.visible ? [badge.position.x, badge.position.y, badge.position.z, badge.scale.x] : null,
      seen: ABILITIES.filter((a) => seen.has(a.key)).map((a) => a.key),
    }),
    update(dt: number) {
      const ready = adapter.read.ready();
      const b = me.body;
      if (!ready || !b) {
        mark.visible = false;
        chip.classList.remove('on');
        return;
      }
      // The rows, re-read each frame and never held: a refill swaps the world.
      // The line-one phase is worked out once, with the frame's tick.
      const w = adapter.read.world(),
        tick = adapter.read.tick();
      const look: Look = { w, tick, phase: railPhase(w, tick, tick) };
      const row = rail(look.w);
      for (const a of ABILITIES) {
        const gone = a.has(look) ? 0 : (missing.get(a.key) ?? 0) + dt;
        // Seen going from missing to there in this session: its flourish is the live one, not a late one.
        if (!gone && (missing.get(a.key) ?? 0) > 0) watched.add(a.key);
        missing.set(a.key, gone);
        if (gone > 3) seen.forget(a.key);
      }
      const grounded = me.coyote > 0 && !me.swimming;
      const free = !fallArrival.active && !inputState.seated && !env.busy();
      // Late: one flourish per ability gained while away, on the first landing, one after another.
      lateWait = Math.max(0, lateWait - dt);
      if (grounded && free && !lateWait) {
        const missed = ABILITIES.find((a) => a.has(look) && !seen.has(a.key));
        if (missed) {
          flourish(missed.key, !(missed.atState && watched.has(missed.key)));
          lateWait = 1.2;
        }
      }
      // The charge mark.
      const { charge, second } = env.jump();
      const airborne = !grounded && !fallArrival.active && !inputState.seated && !me.swimming;
      // An unlock that arrived in the air shows hollow until the landing fills it (whatever frame the charge itself
      // catches up on).
      if (deferred && grounded) {
        deferred = false;
        flash = Math.max(flash, FILL_S);
        stats.fills++;
        if (!reducedMotion) {
          feet(at);
          rewardSparkles(at.x, at.y + 0.1, at.z, 10, 1.2, { color: TEAL, life: 0.35, size: 0.08, gravity: 1 });
          rippleT = RIPPLE_S * 0.7;
        }
      }
      flash = Math.max(0, flash - dt);
      // The first jump after an unlock that wasn't yours: at its top, the mark pulses with the Jump glyph, once.
      // Only a jump of yours counts, not a step up or a bounce.
      const vy = b.velocity.y;
      if (grounded) jumpsGrounded = localJumpCount();
      if (
        row.jump &&
        localJumpCount() > jumpsGrounded &&
        airborne &&
        charge &&
        !second &&
        !seen.has('jump-taught') &&
        lastVy > 0.3 &&
        vy <= 0.3 &&
        !env.busy()
      ) {
        seen.add('jump-taught');
        pulse = TEACH_S;
        stats.teaches++;
      }
      lastVy = vy;
      if (pulse > 0 && (second || grounded)) pulse = Math.min(pulse, 0.15);
      pulse = Math.max(0, pulse - dt);
      // The first fast fall with the glider and the canopy shut: the Glide glyph at Buddy's back, once.
      const canopy = railwayGlideOpen();
      if (
        row.glide &&
        airborne &&
        vy < -GLIDE_TEACH_FALL &&
        !canopy &&
        !env.busy() &&
        !pulse &&
        !seen.has('glide-taught')
      ) {
        seen.add('glide-taught');
        glidePulse = TEACH_S;
        stats.teaches++;
      }
      if (glidePulse > 0 && (canopy || grounded)) glidePulse = 0;
      glidePulse = Math.max(0, glidePulse - dt);
      // Only for a flourish or the one-time teach: nothing is drawn under you on an ordinary jump, the second jump's
      // glints are its only effect (owner, 9 November).
      mark.visible = row.jump && !me.swimming && (flash > 0 || pulse > 0);
      if (mark.visible) {
        feet(mark.position);
        fill.visible = charge && !deferred;
        const pop = flash > FLASH_S - 0.25 ? 1 + (flash - (FLASH_S - 0.25)) * 2.4 : 1;
        const beat = pulse > 0 && !reducedMotion ? 1 + 0.35 * Math.abs(Math.sin((TEACH_S - pulse) * 9)) : 1;
        mark.scale.setScalar(pop * beat);
      }
      badgeT = Math.max(0, badgeT - dt);
      badge.visible = badgeT > 0;
      if (badge.visible) {
        const u = 1 - badgeT / BADGE_S;
        // Pops in with a small overshoot, hangs, then shrinks away upward.
        const k =
          u < 0.15
            ? 1.25 * (u / 0.15)
            : u < 0.25
              ? 1.25 - 0.25 * ((u - 0.15) / 0.1)
              : u < 0.75
                ? 1
                : 1 - (u - 0.75) / 0.25;
        feet(badge.position);
        badge.position.y += 2.1 + (reducedMotion ? 0 : 0.35 * u);
        badge.scale.setScalar(Math.max(0.001, k));
        badge.rotation.y = reducedMotion ? 0 : u * 5;
      }
      rippleT = Math.max(0, rippleT - dt);
      ripple.visible = rippleT > 0 && !reducedMotion;
      if (ripple.visible) {
        const u = 1 - rippleT / RIPPLE_S;
        feet(ripple.position).y += 0.04;
        ripple.scale.setScalar(0.35 + 1.6 * (1 - (1 - u) ** 2));
        rippleMaterial.opacity = 1 - u;
      }
      const label = pulse > 0 ? glyph('jump') : glidePulse > 0 ? glyph('glide') : '';
      chip.classList.toggle('on', !!label);
      if (label) {
        if (chip.innerHTML !== label) chip.innerHTML = label;
        if (pulse > 0) at.copy(mark.position).add(CHIP_OFFSET);
        else feet(at).y += GLIDE_TEACH_UP;
        toScreen(at, screen, innerWidth, innerHeight);
        chip.style.transform = `translate(calc(${screen.x}px - 50%), calc(${screen.y}px - 50%))`;
      }
    },
    dispose() {
      offAccepted();
      offCorrected();
      badge.removeFromParent();
      chip.remove();
      mark.removeFromParent();
      ripple.removeFromParent();
      for (const g of geometries) g.dispose();
      material.dispose();
      rippleMaterial.dispose();
    },
  };
  owner.cleanup(api.dispose);
  return api;
}
