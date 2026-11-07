// Co-op abilities, option E (docs/brainstorms/coop-abilities.md): an ability is the room's the moment anyone finds it
// (one accepted railway fact), and each player is shown it their own way. The finder gets the full "You got" card
// (tools.ts, line2-view.ts); everyone else gets a small flourish where they stand that never holds input: a teal puff
// at the ankles, the pickup's two notes and the charge mark lit by Buddy's feet. A friend who wasn't there gets that
// flourish once on their first landing. All Local: what this player has been shown lives in this browser only.
//
//   seen(key) / remember(key)   this player's record per railway room: 'jump', 'hook', 'jump-taught', 'plinth:jump'
//   update(dt)                  late flourishes, the charge mark and the first-jump teach
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { me } from '../../player/player.ts';
import { inputState } from '../../player/input-state.ts';
import { glyph } from '../../player/glyphs.ts';
import { fallArrival } from '../../fall/arrival.ts';
import { getRoomId } from '../../netplay/net.ts';
import { identity } from '../../player/identity.ts';
import { PLAYER_R, reducedMotion } from '../../constants.ts';
import { placeSound, type PlaceCue } from '../../render/place-sfx.ts';
import { rewardSparkles } from '../../render/reward-particles.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';
import { toScreen } from '../../render/scene.ts';
import { railwayRoomId } from '../../world/railway-namespace.ts';

type Inspection = ReturnType<RailwayAdapter['inspect']>;
const ABILITIES: { key: string; op: RailwayAccepted['op']; cue: PlaceCue; has: (s: Inspection) => boolean }[] = [
  { key: 'jump', op: 'rail.jump', cue: 'pickupJump', has: (s) => s.jump },
  { key: 'hook', op: 'rail.hook', cue: 'pickupHook', has: (s) => s.line2.hook },
];
const TEAL = new THREE.Color('#39e6c6');
const FLASH_S = 1.6; // the mark stays lit this long after a flourish
const FILL_S = 0.9; // and this long after it fills on landing
const TEACH_S = 1.3;

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
  },
) {
  const seen = createSeen();
  const stats = { flourishes: 0, late: 0, teaches: 0, fills: 0, last: '' };

  // The charge mark: a teal ring under Buddy's feet in the air, filled while the second jump is there to spend.
  const geometries = [
    new THREE.RingGeometry(0.24, 0.32, 32).rotateX(-Math.PI / 2),
    new THREE.CircleGeometry(0.2, 28).rotateX(-Math.PI / 2),
  ];
  const material = readableUnlit(new THREE.MeshBasicNodeMaterial({ color: TEAL, side: THREE.DoubleSide }));
  const mark = new THREE.Group();
  const ring = new THREE.Mesh(geometries[0], material);
  const fill = new THREE.Mesh(geometries[1], material);
  mark.add(ring, fill);
  mark.visible = false;
  for (const m of [ring, fill]) m.renderOrder = 2;
  owner.root.add(mark);
  // The jump button's own glyph beside the mark at the top of the first jump (moves-view.ts's chip, place.css).
  const chip = document.createElement('div');
  chip.className = 'place-key';
  (document.querySelector('.hud') ?? document.body).append(chip);
  const screen = { x: 0, y: 0 };
  const at = new THREE.Vector3();
  const CHIP_OFFSET = new THREE.Vector3(0.55, 0.15, 0);

  let flash = 0,
    pulse = 0,
    deferred = false,
    wasCharge = true,
    lastVy = 0,
    lateWait = 0;

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
    stats.last = key;
    const b = me.body;
    if (!b) return;
    feet(at);
    placeSound(ability.cue, at.x, at.z);
    if (!reducedMotion)
      rewardSparkles(at.x, at.y + 0.25, at.z, 22, 1.9, {
        color: TEAL,
        life: 0.5,
        lifeJitter: 0.4,
        size: 0.1,
        sizeJitter: 0.06,
        gravity: 2,
        drag: 1.6,
      });
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
    if (event.pid === adapter.inspect().pid) {
      // The finder has the card and the place itself; the plinth gives them the crowd, not a second card.
      seen.add(ability.key);
      if (ability.key === 'jump') seen.add('jump-taught');
      return;
    }
    if (!seen.has(ability.key)) flourish(ability.key, false);
  });

  const api = {
    seen,
    inspect: () => ({
      ...stats,
      mark: mark.visible ? (fill.visible ? 'filled' : 'hollow') : 'off',
      teaching: pulse > 0,
      seen: ABILITIES.filter((a) => seen.has(a.key)).map((a) => a.key),
    }),
    update(dt: number) {
      const state = adapter.inspect();
      const b = me.body;
      if (!state.ready || !b) {
        mark.visible = false;
        chip.classList.remove('on');
        return;
      }
      for (const a of ABILITIES) if (!a.has(state)) seen.forget(a.key);
      const grounded = me.coyote > 0 && !me.swimming;
      const free = !fallArrival.active && !inputState.seated && !env.busy();
      // Late: one flourish per ability gained while away, on the first landing, one after another.
      lateWait = Math.max(0, lateWait - dt);
      if (grounded && free && !lateWait) {
        const missed = ABILITIES.find((a) => a.has(state) && !seen.has(a.key));
        if (missed) {
          flourish(missed.key, true);
          lateWait = 1.2;
        }
      }
      // The charge mark.
      const { charge, second } = env.jump();
      const airborne = !grounded && !fallArrival.active && !inputState.seated && !me.swimming;
      if (charge && !wasCharge && deferred) {
        deferred = false;
        flash = Math.max(flash, FILL_S);
        stats.fills++;
        if (!reducedMotion) {
          feet(at);
          rewardSparkles(at.x, at.y + 0.1, at.z, 10, 1.2, { color: TEAL, life: 0.35, size: 0.08, gravity: 1 });
        }
      }
      wasCharge = charge;
      flash = Math.max(0, flash - dt);
      // The first jump after an unlock that wasn't yours: at its top, the mark pulses with the Jump glyph, once.
      const vy = b.velocity.y;
      if (
        state.jump &&
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
      mark.visible = state.jump && !me.swimming && (airborne || flash > 0 || pulse > 0);
      if (mark.visible) {
        feet(mark.position);
        fill.visible = charge;
        const pop = flash > FLASH_S - 0.25 ? 1 + (flash - (FLASH_S - 0.25)) * 2.4 : 1;
        const beat = pulse > 0 && !reducedMotion ? 1 + 0.35 * Math.abs(Math.sin((TEACH_S - pulse) * 9)) : 1;
        mark.scale.setScalar(pop * beat);
      }
      const label = pulse > 0 ? glyph('jump') : '';
      chip.classList.toggle('on', !!label);
      if (label) {
        if (chip.innerHTML !== label) chip.innerHTML = label;
        toScreen(at.copy(mark.position).add(CHIP_OFFSET), screen, innerWidth, innerHeight);
        chip.style.transform = `translate(calc(${screen.x}px - 50%), calc(${screen.y}px - 50%))`;
      }
    },
    dispose() {
      offAccepted();
      chip.remove();
      mark.removeFromParent();
      for (const g of geometries) g.dispose();
      material.dispose();
    },
  };
  owner.cleanup(api.dispose);
  return api;
}
