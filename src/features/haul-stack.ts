// The haul stack: what you carry, drawn as a bundle of pieces on your back (and on everyone else's, from the lockstep
// stacks matched to avatars through presence `pid`). A small chip shows your count (no contribution tier: tiers stay
// data in src/sim/tiers.ts until rewards are designed; docs/decisions.md, 2026-11-02). Pickups fly to your back the moment you walk into a pile (Local), while the host confirms
// (~0.5 s). Placeholder visuals (0.1 groundwork). No control of its own: pickup is walking into a pile, pouring is
// walking into a site's ring (work-sites.ts).
// Serves DESIGN.md 1 (toys before chores: wood on your back, carried around with nothing to do). Lockstep counts,
// Local look. The chip is a play-size wood pill with a log icon, and its number ticks one by one toward the
// host-confirmed count with a pop and a count sound per step (docs/research/ui-patterns.md, rec 3).
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import { backSeam, type CarryReadout } from '../player/haul-back.ts';
export { backSeam } from '../player/haul-back.ts';
import '../ui/ui-kit.css';
import './haul-stack.css';
import * as THREE from 'three/webgpu';
import { defineKind, spawn } from '../entity/entity.ts';
import { identity } from '../player/identity.ts';
import { me } from '../player/player.ts';
import { remotes, onRemotePresence } from '../netplay/net.ts';
import { okPid } from '../sim/roster.ts';
import { pieceMesh, pieceColor, commitPieces, onFly } from '../render/haul-pieces.ts';
import {
  SHOWN,
  shownOf,
  lenOf,
  frameOf,
  fitOf,
  slotAt,
  pieceAt,
  bandAt,
  makeBundleBands,
} from '../render/haul-bundle.ts';
import { haulFeel } from '../player/haul-feel.ts';
import { MATERIALS } from '../sim/materials.ts';
import { uiSound, replay } from '../ui/ui-sound.ts';
import { protoActivity } from '../proto/mark.ts';
import { camera, toScreen } from '../render/scene.ts';
import { PLAYER_R } from '../constants.ts';
import { pauseSections } from '../player/pause-pages.ts';
import { padModal } from '../player/controls.ts';

// The bundle: logs lying crosswise, stacked up and out from the back on a hex lattice (slots filled nearest-first, so
// it fills out rather than up), with two rope bands round it. At most SHOWN pieces drawn, growing more slowly than the
// count (shownOf), and the logs get longer as the count grows: 4 and 60 read differently without ever towering. No
// motion of its own: it rides the avatar's walk bob and lean.
const mesh = pieceMesh(9 * SHOWN + 48);
const bands = makeBundleBands(18);
const bundles = new THREE.Group();
bundles.add(mesh, bands);
const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  e = new THREE.Euler(),
  v = new THREE.Vector3(),
  one = new THREE.Vector3(1, 1, 1),
  top = new THREE.Vector3();

onRemotePresence((r: { pid?: string | null }, pr: { pid?: unknown }) => (r.pid = okPid(pr.pid) ? pr.pid : null));

type Stack = { n: number; k: number };
const stackOf = (pid: string | null | undefined): Stack => {
  const k = pid ? rules.roster.indexOf(pid) : -1;
  return k < 0 ? { n: 0, k: -1 } : { n: rules.stacks.countAt(k), k: rules.stacks.kindAt(k) };
};
const myStack = () => stackOf(identity.pid);
protoActivity(() => (myStack().n ? 'carrying' : null)); // for the playtest trace (src/proto/trace/)

// One stack of n pieces of kind k on avatar a, into the bundle and band meshes from slot c and b on.
let c = 0,
  b = 0;
function draw(a: THREE.Object3D | null, n: number, k: number): void {
  if (a) (a.userData as { load?: number }).load = n;
  if (!a || !n) return;
  a.updateMatrixWorld();
  const f = frameOf(a),
    fit = fitOf(a);
  const len = lenOf(n) * fit.len,
    shown = shownOf(n);
  for (let m = 0; m < shown && c < mesh.instanceMatrix.count; m++) {
    mesh.setMatrixAt(c, pieceAt(f, fit, m, len, m4));
    mesh.setColorAt(c++, pieceColor(k));
  }
  if (shown < 3 || b + 2 > bands.instanceMatrix.count) return;
  bands.setMatrixAt(b++, bandAt(f, fit, shown, len, -1, m4));
  bands.setMatrixAt(b++, bandAt(f, fit, shown, len, 1, m4));
}

// Pieces flying from a pile to your back: { from, n, t0 }.
const flights: { from: THREE.Vector3; n: number; t0: number }[] = [];
onFly((from, n) => backSeam.flyIns && flights.push({ from: from.clone(), n: Math.min(n, 6), t0: performance.now() }));

const chip = document.createElement('div');
chip.className = 'haul-chip';
document.body.append(chip);

// Project after late camera overrides as well as the normal follow camera.
defineKind('haul-stack', { update: 32, lateUpdate: 1100 });
spawn({
  kind: 'haul-stack',
  mesh: bundles,
  update({ now }) {
    const mine = myStack();
    c = b = 0;
    draw(me.entered ? me.avatar : null, backSeam.count(mine.n), mine.k);
    for (const r of remotes.values()) {
      if (!r.visible || !r.avatar) continue;
      const st = stackOf(r.pid);
      draw(r.avatar, backSeam.remote?.(r.peer) ?? st.n, st.k);
    }
    // fly-ins: a short hop from the pile to the top of your bundle
    for (let f = flights.length - 1; f >= 0; f--) {
      const fl = flights[f]!;
      const u = (now - fl.t0) / haulFeel.flyMs;
      if (u >= 1 || !me.avatar) {
        flights.splice(f, 1);
        continue;
      }
      me.avatar.updateMatrixWorld();
      const to = frameOf(me.avatar).localToWorld(slotAt(Math.max(0, shownOf(mine.n) - 1), fitOf(me.avatar), top));
      for (let m = 0; m < fl.n && c < mesh.instanceMatrix.count; m++) {
        const w = Math.min(1, Math.max(0, u * 1.4 - m * 0.08));
        v.lerpVectors(fl.from, to, w);
        v.y += Math.sin(w * Math.PI) * 1.2 + m * 0.05;
        e.set(w * 6, w * 3 + m, 0);
        mesh.setMatrixAt(c, m4.compose(v, q.setFromEuler(e), one));
        mesh.setColorAt(c++, pieceColor(Math.max(0, mine.k)));
      }
    }
    if (c || mesh.count) commitPieces(mesh, c);
    if (b || bands.count) {
      bands.count = b;
      bands.instanceMatrix.needsUpdate = true;
    }
    if (!backSeam.carry) tickChip(mine, now);
  },
  lateUpdate({ now }) {
    if (backSeam.carry) tickCarry(backSeam.carry(), now);
  },
});

// The chip: your material and count, only while you carry something, the count ticking toward the confirmed one (about
// 300 ms per change).
chip.innerHTML =
  '<svg class="haul-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="7" width="18" height="10" rx="5"/>' +
  '<ellipse cx="19" cy="12" rx="3.2" ry="5"/><ellipse cx="19" cy="12" rx="1.3" ry="2"/></svg>' +
  '<span class="haul-n"></span><span class="haul-what"></span>';
const [chipN, chipWhat] = [...chip.querySelectorAll('span')] as HTMLElement[];
const shown = { n: 0, to: 0, step: 0, at: 0, key: '' };
function tickChip(host: Stack, now: number): void {
  const mine = { n: backSeam.count(host.n), k: host.k };
  if (mine.n !== shown.to) {
    // A big jump (a new age, a reload) skips most of the way, so the run stays short.
    if (Math.abs(mine.n - shown.n) > 24) shown.n = mine.n - Math.sign(mine.n - shown.n) * 24;
    shown.to = mine.n;
    shown.step = Math.min(90, Math.max(18, 300 / Math.abs(mine.n - shown.n || 1)));
  }
  if (shown.n !== shown.to && now - shown.at >= shown.step) {
    const d = Math.sign(shown.to - shown.n);
    shown.n += d;
    shown.at = now;
    uiSound('count', d);
    replay(chipN, 'ui-tick');
  }
  const key = `${shown.n}/${mine.k}`;
  if (key === shown.key) return;
  shown.key = key;
  chipN!.textContent = shown.n ? String(shown.n) : '';
  chipWhat!.textContent = shown.n ? (MATERIALS[Math.max(0, mine.k)] ?? '') : '';
  chip.classList.toggle('on', !!shown.n);
  chip.classList.toggle('full', !!shown.n && shown.n >= rules.stacks.hard());
}

// One temporary tag; only landed pieces fill its slots. Pause retains exact accepted inventory.
const carryLane = document.createElement('div');
carryLane.className = 'carry-lane';
const tag = document.createElement('div');
tag.className = 'carry-tag';
carryLane.append(tag);
document.body.append(carryLane);
const contents = document.createElement('div');
contents.className = 'carry-contents';
const slots = document.createElement('div');
slots.className = 'carry-slots';
const capacity = document.createElement('div');
capacity.className = 'carry-capacity';
tag.append(contents, slots, capacity);
capacity.textContent = 'Full';
const pauseCarry = document.createElement('div');
pauseCarry.className = 'carry-pause';
const icons = {
  logs: '<rect x="2" y="7" width="18" height="10" rx="5"/><ellipse cx="19" cy="12" rx="3" ry="5"/><ellipse cx="19" cy="12" rx="1" ry="2"/>',
  rails: '<path d="M4 3h16v4h-6v10h6v4H4v-4h6V7H4z"/>',
  stone: '<path d="m3 16 3-10 10-3 6 10-6 8H7z"/><path d="m6 6 7 6 9 1m-9-1 3 9"/>',
  beam: '<path d="m2 7 15-4 5 4v10L7 21l-5-4zM2 7l5 4 15-4M7 11v10"/>',
  boiler: '<rect x="3" y="7" width="18" height="14" rx="6"/><path d="M9 7V2h6v5M11 7v14"/>',
};
const item = (kind: keyof typeof icons, text: string) =>
  `<span class="carry-item"><svg class="carry-${kind}" viewBox="0 0 24 24" aria-hidden="true">${icons[kind]}</svg>${text}</span>`;
let carryKey = '',
  carryUntil = 0,
  carryStarted = false,
  carrySide = 1;
const carryPoint = new THREE.Vector3();
const carryScreen = { x: 0, y: 0, behind: false };
const materials = ['logs', 'rails', 'stone'] as const;
type CarryMaterial = (typeof materials)[number];
type CarrySlot = { el: HTMLSpanElement; at: number; filled: boolean };
const carrySlots: Record<CarryMaterial, CarrySlot[]> = { logs: [], rails: [], stone: [] };
const emptySlots = Array.from({ length: 16 }, () => {
  const el = document.createElement('span');
  el.className = 'carry-slot';
  return el;
});
let nextPop = 0;
function fillSlots(load: CarryReadout, now: number) {
  const reduced = getComputedStyle(tag).getPropertyValue('--carry-motion').trim() === '0';
  const nodes: HTMLSpanElement[] = [];
  let filled = 0;
  for (const kind of materials) {
    const count = load.big ? 0 : Math.max(0, load[kind] - (kind === 'logs' ? load.flyingLogs : 0));
    const row = carrySlots[kind];
    while (row.length > count) {
      const slot = row.pop()!;
      for (const animation of slot.el.getAnimations()) animation.cancel();
      slot.el.remove();
    }
    while (row.length < count) {
      const el = document.createElement('span');
      el.className = 'carry-slot';
      const at = reduced ? now : Math.max(now, nextPop);
      row.push({ el, at, filled: false });
      nextPop = at + 35;
    }
    for (const slot of row) {
      if (!slot.filled && (reduced || now >= slot.at)) {
        slot.filled = true;
        slot.el.dataset.material = kind;
        if (!reduced)
          slot.el.animate(
            kind === 'logs'
              ? [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.5 }, { transform: 'scale(1)' }]
              : [{ transform: 'scale(0.6)' }, { transform: 'scale(1.2)', offset: 0.55 }, { transform: 'scale(1)' }],
            { duration: kind === 'logs' ? 160 : 200, easing: 'ease-out' },
          );
      }
      if (reduced) for (const animation of slot.el.getAnimations()) animation.cancel();
      if (slot.filled) filled++;
      nodes.push(slot.el);
    }
  }
  // No layout animation: fixed cells and a reserved Full line keep projection stable.
  if (!load.big) nodes.push(...emptySlots.slice(0, Math.max(0, load.capacity - nodes.length)));
  for (let i = 0; i < nodes.length; i++) {
    if (slots.children[i] !== nodes[i]) slots.insertBefore(nodes[i]!, slots.children[i] ?? null);
  }
  while (slots.children.length > nodes.length) slots.lastElementChild!.remove();
  slots.hidden = !!load.big;
  capacity.hidden = !!load.big;
  capacity.style.visibility = filled >= load.capacity ? 'visible' : 'hidden';
  if (reduced || filled === nodes.length) nextPop = now;
}
const overlaps = (x: number, y: number, w: number, h: number, r: DOMRect) =>
  r.width > 0 && r.height > 0 && x < r.right + 12 && x + w > r.left - 12 && y < r.bottom + 12 && y + h > r.top - 12;

function tickCarry(load: CarryReadout, now: number) {
  if (!carryStarted) {
    carryStarted = true;
    chip.remove(); // classic Haul still owns its chip; Place replaces it entirely.
    pauseSections.push(pauseCarry);
  }
  const held = load.logs + load.rails + load.stone;
  const incoming = load.incoming ?? 0;
  const reserved = load.reserved ?? 0;
  const pending = incoming + reserved;
  const full = !load.big && held + pending >= load.capacity;
  const key = `${load.logs}/${load.rails}/${load.stone}/${load.big}/${load.capacity}/${incoming}/${reserved}`;
  if (key !== carryKey) {
    if (carryKey || held || pending || load.big) carryUntil = now + 2000;
    carryKey = key;
    contents.innerHTML = load.big ? item(load.big, load.big === 'beam' ? 'Great beam' : 'Boiler') : '';
    const fraction = `${held + pending}/${load.capacity}${full ? ' · Full' : ''}`;
    const exact = load.big
      ? load.big === 'beam'
        ? 'Great beam'
        : 'Boiler'
      : `${
          (['logs', 'rails', 'stone'] as const)
            .filter((k) => load[k])
            .map((k) => `${load[k]} ${k}`)
            .join(' · ') || 'Empty'
        } — ${fraction}` +
        (load.incoming ? ` · ${load.incoming} incoming` : '') +
        (load.reserved ? ` · ${load.reserved} reserved` : '');
    pauseCarry.textContent = `Carrying: ${exact}`;
    pauseCarry.hidden = !load.big && !held && !pending;
    tag.setAttribute('aria-label', exact);
  }
  fillSlots(load, now);
  if (load.attention) carryUntil = now + 2000;
  // The tag's original hold and fade do not depend on the slot animation.
  const opacity = me.entered && !padModal() ? Math.min(1, Math.max(0, (carryUntil + 200 - now) / 200)) : 0;
  tag.style.opacity = String(opacity);
  if (!opacity || !me.body) return;
  placeCarry(load.big);
}

function placeCarry(big: CarryReadout['big']) {
  const safe = carryLane.getBoundingClientRect();
  const roster = document.querySelector('.roster')?.getBoundingClientRect();
  const top = Math.max(safe.top, (roster?.bottom ?? safe.top - 16) + 16);
  const w = tag.offsetWidth,
    h = tag.offsetHeight;
  const p = me.body!.interpolatedPosition;
  // Stable body/load envelope, independent of walking bones and individual log ends.
  let left = Infinity,
    right = -Infinity,
    high = Infinity,
    low = -Infinity,
    behind = false;
  const project = (x: number, y: number, z: number) => {
    toScreen(carryPoint.set(x, y, z), carryScreen, innerWidth, innerHeight);
    behind ||= carryScreen.behind;
    left = Math.min(left, carryScreen.x);
    right = Math.max(right, carryScreen.x);
    high = Math.min(high, carryScreen.y);
    low = Math.max(low, carryScreen.y);
  };
  camera.updateMatrixWorld();
  for (const x of [-0.55, 0.55])
    for (const y of [0, 2]) for (const z of [-0.55, 0.55]) project(p.x + x, p.y - PLAYER_R + y, p.z + z);
  if (big && me.avatar) {
    const cargo = me.avatar.getObjectByName(`wear_carried_${big}`);
    if (cargo) {
      cargo.updateWorldMatrix(true, true);
      cargo.traverse((part) => {
        if (!(part instanceof THREE.Mesh)) return;
        if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
        const box = part.geometry.boundingBox;
        if (!box) return;
        // Project the oriented mesh bounds, not a rotated world's much larger empty box.
        for (const x of [box.min.x, box.max.x])
          for (const y of [box.min.y, box.max.y])
            for (const z of [box.min.z, box.max.z]) {
              carryPoint.set(x, y, z).applyMatrix4(part.matrixWorld);
              project(carryPoint.x, carryPoint.y, carryPoint.z);
            }
      });
    }
  }
  toScreen(carryPoint.set(p.x, p.y - PLAYER_R + 0.75, p.z), carryScreen, innerWidth, innerHeight);
  const y = Math.min(safe.bottom - h, Math.max(top, carryScreen.y - h / 2));
  const obstacles = [...document.querySelectorAll('.prompt, .held-tag, .reticle, .tbtn')].map((el) =>
    el.getBoundingClientRect(),
  );
  const fits = (x: number, margin = 0) =>
    x >= safe.left + margin &&
    x + w <= safe.right - margin &&
    y >= top &&
    y + h <= safe.bottom &&
    !obstacles.some((r) => overlaps(x, y, w, h, r));
  const rightX = right + 16,
    leftX = left - w - 16;
  let x = carrySide === 1 ? rightX : leftX;
  // Keep the chosen side until it fails; require spare room before switching.
  if (!fits(x) && fits(carrySide === 1 ? leftX : rightX, 24)) {
    carrySide *= -1;
    x = carrySide === 1 ? rightX : leftX;
  }
  const dock = innerWidth < 600 || behind || !Number.isFinite(x) || !fits(x) || high > innerHeight || low < 0;
  tag.dataset.placement = dock ? 'dock' : carrySide === 1 ? 'right' : 'left';
  tag.style.left = `${(dock ? safe.left : x) - safe.left}px`;
  tag.style.top = `${Math.min(safe.bottom - h, dock ? top : y) - safe.top}px`;
}
