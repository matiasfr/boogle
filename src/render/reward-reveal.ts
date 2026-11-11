// "You got ___": a new thing (a cosmetic, a tool, a move) is held up over your head, turning and glowing, under a text box
// you dismiss. Generic finds (logs, stone, rails, money, crystals, gold) never come through here. You stand still while it's
// up: Interact, Back, a click or a tap puts it away, and the next one in the queue comes up. Local and cosmetic.
import * as THREE from 'three/webgpu';
import { camConstraints, me } from '../player/player.ts';
import { faceCamera, frameBuddy, holdCamera } from './buddy-frame.ts';
import { reducedMotion } from '../constants.ts';
import { inputState } from '../player/input-state.ts';
import { setPadGrab } from '../player/controls.ts';
import { glyph } from '../player/glyphs.ts';
import type { Avatar } from '../player/avatars.ts';
import { acquisitionMotes, acquisitionTint, rewardSparkles } from './reward-particles.ts';
import { headwearTop } from './head-clearance.ts';
import { camera } from './scene.ts';
import { dismissPointer } from '../player/dismiss-pointer.ts';
import { clamp } from '../math-pure.ts';
import { holdMoment } from '../ui/moment-banner.ts';
import { outCubic } from './motion.ts';

export type Got = {
  /** Local presentation identity for a shared unlock; never saved or sent. */
  key?: string;
  /** As it reads after "You got": "the multi-axe", "a pack frame". */
  name: string;
  line?: string;
  rarity?: string;
  color?: string;
  model: THREE.Object3D;
  /** Where it rises from (an opened crate); over your head when missing. */
  from?: THREE.Vector3;
  done?: () => void;
};

export type RewardGlow = { mat: THREE.MeshBasicNodeMaterial; strength: { value: number } };
/** The original reward card, owned by its caller rather than by a module import. */
export function createRewardReveal({
  parent,
  fanfare,
  pop,
  softGlow,
}: {
  parent: THREE.Object3D;
  fanfare: (big: boolean) => void;
  pop: (note: number, volume: number) => void;
  softGlow: (color: string, strength: number, fade?: boolean | 'up') => RewardGlow;
}) {
  const listeners = new AbortController();
  const queue: Got[] = [];
  const shown = new Set<string>();
  const rememberGot = (key: string) => void shown.add(key);
  /** A missed shared reset starts new unlock history without cancelling an in-progress personal prize. */
  const resetGotHistory = () => shown.clear();
  let cur: (Got & { t: number; start: THREE.Vector3; tint?: THREE.Color }) | null = null;
  const gettingItem = () => !!cur || queue.length > 0;

  const BUILD_S = 0.45;
  const RISE_S = 0.45;
  const REVEAL_S = BUILD_S + RISE_S;
  const MIN_S = REVEAL_S + 0.6; // readable reveal time; its initiating press cannot dismiss it
  const SIZE = 0.95; // m across, whatever it is

  const holder = new THREE.Group();
  holder.visible = false;
  const haloGlow = softGlow('#fff2b8', 0.35);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14), haloGlow.mat);
  const raysGlow = softGlow('#ffe08a', 0.4, 'up');
  const rays = new THREE.Group();
  const rayGeo = new THREE.PlaneGeometry(0.12, 1.5).translate(0, 0.75, 0);
  for (let k = 0; k < 8; k++) {
    const r = new THREE.Mesh(rayGeo, raysGlow.mat);
    r.rotation.z = (k / 8) * Math.PI * 2;
    rays.add(r);
  }
  const spin = new THREE.Group();
  holder.add(halo, rays, spin);
  parent.add(holder);

  const box = document.createElement('div');
  box.className = 'place-got';
  box.hidden = true;
  box.innerHTML =
    '<div class="place-got-text"><b></b><small></small><span></span></div><div class="place-got-hint"></div>';
  const title = box.querySelector('b')!,
    rarity = box.querySelector('small')!,
    sub = box.querySelector('span')!,
    hint = box.querySelector<HTMLElement>('.place-got-hint')!;
  (document.querySelector('.hud') ?? document.body).append(box);

  /** Hold it up: now, or after whatever's up already. */
  function youGot(g: Got) {
    if (g.key) {
      if (shown.has(g.key)) return false;
      shown.add(g.key);
    }
    queue.push(g);
    if (!cur) next();
    return true;
  }

  function next() {
    const g = queue.shift();
    if (!g) return;
    cur = { ...g, t: 0, start: new THREE.Vector3(), tint: acquisitionTint(g.key) };
    resetTouch();
    spin.clear();
    const fit = new THREE.Box3().setFromObject(g.model).getSize(new THREE.Vector3());
    g.model.scale.multiplyScalar(SIZE / Math.max(fit.x, fit.y, fit.z, 0.01));
    const mid = new THREE.Box3().setFromObject(g.model).getCenter(new THREE.Vector3());
    g.model.position.sub(mid);
    spin.add(g.model);
    overHead(cur.start);
    if (g.from) cur.start.copy(g.from);
    holder.position.copy(cur.start);
    holder.visible = true;
    document.body.classList.add('place-getting');
    inputState.held = true;
    me.charging = false;
    faceCamera(); // turned to face you
    setAloft(false);
    setPadGrab(
      (slot) => {
        if (slot === 'x') press();
      },
      ['a', 'b', 'x', 'rt'],
      { stick: true },
    );
    title.textContent = `You got ${g.name.charAt(0).toLowerCase()}${g.name.slice(1)}!`;
    title.style.color = g.color ?? '';
    sub.textContent = g.line ?? '';
    sub.hidden = !g.line;
    rarity.textContent = g.rarity ?? '';
    rarity.hidden = !g.rarity;
    hint.innerHTML = '';
    box.hidden = true;
    box.classList.remove('on');
    spin.visible = rays.visible = false;
    haloGlow.strength.value = 0.08;
  }

  function putAway() {
    if (!cur) return;
    const g = cur;
    cur = null;
    holder.visible = false;
    box.hidden = true;
    document.body.classList.remove('place-getting');
    setAloft(false);
    inputState.held = false;
    setPadGrab(null);
    if (!reducedMotion && !g.tint) sparkles(holder.position, 24, 3.4);
    pop(7, 0.7);
    g.done?.();
    next();
  }

  /** Start over: whatever's up or waiting goes, with nothing handed over. */
  function dropGot() {
    resetGotHistory();
    queue.length = 0;
    cameraWeight = 0;
    if (!cur) return;
    cur.done = undefined;
    putAway();
  }

  /** A deliberate press puts it away, once it's been up long enough to read. */
  function press() {
    if (cur && cur.t >= MIN_S) putAway();
  }

  function setAloft(on: boolean) {
    const a = me.avatar as Avatar | null;
    if (a) a.userData.aloft = on;
  }

  function overHead(out: THREE.Vector3) {
    const b = me.body;
    if (b) {
      const p = b.interpolatedPosition;
      const crown = me.avatar ? headwearTop(me.avatar) : p.y + 1.18;
      out.set(p.x, Math.max(p.y + 1.72, crown + SIZE / 2 + 0.12), p.z);
    }
    return out;
  }

  // The reveal's own lighter sparkle: smaller and shorter-lived than a box's, readable like every reward particle.
  const sparkles = (at: THREE.Vector3, n: number, sp: number) =>
    rewardSparkles(at.x, at.y, at.z, n, sp, {
      life: 0.6,
      lifeJitter: 0.5,
      size: 0.12,
      sizeJitter: 0.08,
      gravity: 3,
      drag: 1.2,
    });

  const top = new THREE.Vector3();
  const self = {};
  let cameraWeight = 0;
  const cameraConstraint: (typeof camConstraints)[number] = (look, pos) => {
    if (reducedMotion || cameraWeight <= 0 || !me.body) return false;
    overHead(top);
    frameBuddy(look, pos, cameraWeight, top.y + SIZE / 2);
    return false; // keep the ordinary ground safety constraint
  };
  camConstraints.push(cameraConstraint);
  function updateGot(dt: number) {
    cameraWeight += ((cur ? 1 : 0) - cameraWeight) * (1 - Math.exp(-dt * (cur ? 3.5 : 7)));
    if (cameraWeight < 0.001) cameraWeight = 0;
    holdCamera(self, cameraWeight > 0 || gettingItem());
    holdMoment(self, gettingItem() ? Infinity : null); // the shared full-screen check (src/ui/moment-banner.ts)
    if (!cur) return;
    const u = (cur.t += dt);
    overHead(top);
    const rise = clamp((u - BUILD_S) / RISE_S, 0, 1),
      ease = outCubic(rise);
    holder.position.lerpVectors(cur.start, top, reducedMotion ? 1 : ease);
    spin.visible = u >= BUILD_S;
    rays.visible = u >= REVEAL_S;
    setAloft(u >= BUILD_S);
    if (u >= REVEAL_S && box.hidden) {
      box.hidden = false;
      box.classList.add('on');
      fanfare(true);
    }
    holder.position.y += reducedMotion ? 0 : Math.sin(u * 2.2) * 0.06 * rise;
    spin.rotation.y = reducedMotion ? 0 : Math.max(0, u - BUILD_S) * 1.7;
    spin.scale.setScalar(reducedMotion ? 1 : 0.4 + 0.6 * ease);
    // Turned towards the view, so the rays fan out around it.
    rays.quaternion.copy(camera.quaternion);
    if (!reducedMotion) rays.rotation.z += u * 0.5;
    haloGlow.strength.value =
      u < BUILD_S ? 0.08 + (u / BUILD_S) * 0.16 : reducedMotion ? 0.3 : 0.3 + Math.sin(u * 5) * 0.06;
    raysGlow.strength.value = 0.35 * ease;
    // Gather towards Buddy, open a ring at the reveal, then settle on the prize. All gone before MIN_S:
    // a dismissal never starts another burst, and waiting on the card cannot keep emitting particles.
    if (!reducedMotion && cur.tint) {
      const before = u - dt;
      if (before < 0.08 && u >= 0.08) acquisitionMotes(top, cur.tint, 'gather', 32);
      if (before < REVEAL_S && u >= REVEAL_S) acquisitionMotes(holder.position, cur.tint, 'burst', 40);
      if (u >= BUILD_S && u < 1.1 && Math.floor(u * 24) !== Math.floor(before * 24))
        acquisitionMotes(holder.position, cur.tint, 'settle', 3);
    }
    if (!reducedMotion && !cur.tint && u >= REVEAL_S && Math.floor(u * 6) !== Math.floor((u - dt) * 6))
      sparkles(holder.position, 3, 1.6);
    if (u >= MIN_S && !hint.innerHTML) hint.innerHTML = `${glyph('interact')}<i>▼</i>`;
  }

  // Capture phase on window, before the game's own handlers: the keys that answer a text box put it away and go no further.
  const MOVE_KEYS = new Set([
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ShiftLeft',
    'ShiftRight',
  ]);
  addEventListener(
    'keydown',
    (e) => {
      if (!cur || MOVE_KEYS.has(e.code)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat && (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Escape')) press();
    },
    { capture: true, signal: listeners.signal },
  );
  const resetTouch = dismissPointer(
    () => !!cur,
    () => !!cur && cur.t >= MIN_S,
    press,
    listeners.signal,
  );
  addEventListener('mousedown', (e) => cur && e.stopImmediatePropagation(), {
    capture: true,
    signal: listeners.signal,
  });
  return {
    rememberGot,
    resetGotHistory,
    gettingItem,
    youGot,
    dropGot,
    press,
    updateGot,
    dispose() {
      dropGot();
      holdCamera(self, false);
      holdMoment(self, null);
      listeners.abort();
      const index = camConstraints.indexOf(cameraConstraint);
      if (index >= 0) camConstraints.splice(index, 1);
      box.remove();
      holder.removeFromParent();
      halo.geometry.dispose();
      rayGeo.dispose();
      haloGlow.mat.dispose();
      raysGlow.mat.dispose();
    },
  };
}
