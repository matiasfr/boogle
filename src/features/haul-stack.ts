// Railway carry presentation: accepted counts enter through backSeam; the bundle and HUD are Local.
import { backSeam, type CarryKind, type CarryReadout } from '../player/haul-back.ts';
export { backSeam } from '../player/haul-back.ts';
import '../ui/ui-kit.css';
import './haul-stack.css';
import * as THREE from 'three/webgpu';
import { defineKind, spawn } from '../entity/entity.ts';
import { me } from '../player/player.ts';
import { remotes, onRemotePresence } from '../netplay/net.ts';
import { okPid } from '../sim/roster.ts';
import { pieceMesh, pieceColor, commitPieces } from '../render/haul-pieces.ts';
import { SHOWN, shownOf, lenOf, frameOf, fitOf, pieceAt, bandAt, makeBundleBands } from '../render/haul-bundle.ts';
import { camera, toScreen } from '../render/scene.ts';
import { PLAYER_R, reducedMotion } from '../constants.ts';
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
const m4 = new THREE.Matrix4();

// Railway effects and remote bundles match account ids to their avatars through presence.
onRemotePresence((r: { pid?: string | null }, pr: { pid?: unknown }) => (r.pid = okPid(pr.pid) ? pr.pid : null));

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

// Project after late camera overrides as well as the normal follow camera.
defineKind('haul-stack', { update: 32, lateUpdate: 1100 });
spawn({
  kind: 'haul-stack',
  mesh: bundles,
  update() {
    c = b = 0;
    draw(me.entered ? me.avatar : null, backSeam.count(0), 0);
    for (const r of remotes.values()) {
      if (r.visible && r.avatar) draw(r.avatar, backSeam.remote?.(r.peer) ?? 0, 0);
    }
    if (c || mesh.count) commitPieces(mesh, c);
    if (b || bands.count) {
      bands.count = b;
      bands.instanceMatrix.needsUpdate = true;
    }
  },
  lateUpdate({ now }) {
    if (backSeam.carry) tickCarry(backSeam.carry(), now);
  },
});

// One temporary tag: what you carry, as little squares, one row a kind (separate capacities, owner 17 November 2026:
// "i liked the little squares for inventory"). No numbers on the tag; its aria-label and Pause keep the exact counts.
const carryLane = document.createElement('div');
carryLane.className = 'carry-lane';
const tag = document.createElement('div');
tag.className = 'carry-tag';
carryLane.append(tag);
document.body.append(carryLane);
const bigLabel = document.createElement('div');
bigLabel.className = 'carry-big';
const rowsEl = document.createElement('div');
rowsEl.className = 'carry-rows';
tag.append(bigLabel, rowsEl);
const pauseCarry = document.createElement('div');
pauseCarry.className = 'carry-pause';
const pauseTitle = document.createElement('div');
pauseTitle.textContent = 'Carrying';
const pauseBig = document.createElement('div');
pauseBig.className = 'carry-big';
const pauseRows = document.createElement('div');
pauseRows.className = 'carry-rows';
pauseCarry.append(pauseTitle, pauseBig, pauseRows);
// Logs, then stone, then rails, each a row as long as that kind's capacity.
const kinds = ['logs', 'stone', 'rails'] as const satisfies readonly CarryKind[];
type Row = { el: HTMLElement; squares: HTMLElement[]; filled: number };
function makeRow(kind: CarryKind, parent: HTMLElement): Row {
  const el = document.createElement('div');
  el.className = 'carry-row';
  el.dataset.kind = kind;
  el.hidden = true;
  parent.append(el);
  return { el, squares: [], filled: 0 };
}
const tagRows = Object.fromEntries(kinds.map((k) => [k, makeRow(k, rowsEl)])) as Record<CarryKind, Row>;
const pauseRowsBy = Object.fromEntries(kinds.map((k) => [k, makeRow(k, pauseRows)])) as Record<CarryKind, Row>;
/** Draws `filled` of `capacity` squares into a row; newly filled ones pop when `pop` (the tag, not Pause). */
function fillRow(row: Row, capacity: number, filled: number, pop: boolean) {
  while (row.squares.length < capacity) {
    const sq = document.createElement('span');
    sq.className = 'carry-sq';
    row.el.append(sq);
    row.squares.push(sq);
  }
  while (row.squares.length > capacity) row.squares.pop()!.remove();
  const n = Math.min(filled, capacity);
  row.squares.forEach((sq, k) => {
    const on = k < n;
    if (sq.dataset.filled === String(on)) return;
    sq.dataset.filled = String(on);
    // Each piece pops into its square as it lands (transform only); reduced motion: no pop.
    if (on && pop && k >= row.filled && !reducedMotion)
      sq.animate([{ transform: 'scale(1.45)' }, { transform: 'scale(0.92)' }, { transform: 'scale(1)' }], {
        duration: 200,
        easing: 'ease-out',
      });
  });
  row.filled = n;
  if (n >= capacity) row.el.dataset.full = '';
  else delete row.el.dataset.full;
}
/** A refused pickup of a full kind: its row shakes (transform only); reduced motion flashes it instead. */
function shake(row: Row) {
  if (reducedMotion) {
    row.el.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 180, iterations: 2 });
    return;
  }
  row.el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 180, easing: 'ease-in-out' },
  );
}
let carryKey = '',
  carryUntil = 0,
  carryStarted = false,
  carrySide = 1,
  lastRefused: CarryKind | null = null;
const carryPoint = new THREE.Vector3();
const carryScreen = { x: 0, y: 0, behind: false };
// A row stays up for the tag's 2 s hold after its kind is refused or its capacity grows, even with nothing in it.
const rowUntil: Record<CarryKind, number> = { logs: 0, stone: 0, rails: 0 };
const lastCapacity: Record<CarryKind, number> = { logs: 0, stone: 0, rails: 0 };
const bigName = (kind: NonNullable<CarryReadout['big']>) =>
  kind === 'beam' ? 'Great beam' : kind === 'boiler' ? 'Boiler' : 'Footing';
const overlaps = (x: number, y: number, w: number, h: number, r: DOMRect) =>
  r.width > 0 && r.height > 0 && x < r.right + 12 && x + w > r.left - 12 && y < r.bottom + 12 && y + h > r.top - 12;

function tickCarry(load: CarryReadout, now: number) {
  if (!carryStarted) {
    carryStarted = true;
    pauseSections.push(pauseCarry);
  }
  const held = load.logs + load.rails + load.stone;
  // Logs in flight do not fill their squares until they land.
  const landed: Record<CarryKind, number> = {
    logs: Math.max(0, load.logs - load.flyingLogs),
    stone: load.stone,
    rails: load.rails,
  };
  for (const k of kinds) {
    if (lastCapacity[k] && load.capacity[k] > lastCapacity[k]) {
      rowUntil[k] = now + 2000;
      carryUntil = now + 2000;
    }
    lastCapacity[k] = load.capacity[k];
  }
  const refused = load.refused ?? null;
  if (refused && refused !== lastRefused) {
    rowUntil[refused] = now + 2000;
    carryUntil = now + 2000;
    if (!load.big) shake(tagRows[refused]);
  }
  lastRefused = refused;
  const key = `${load.logs}/${load.rails}/${load.stone}/${load.big}/${kinds.map((k) => load.capacity[k]).join(',')}`;
  if (key !== carryKey) {
    if (carryKey || held || load.big) carryUntil = now + 2000;
    carryKey = key;
    const exact = load.big
      ? bigName(load.big)
      : kinds
          .filter((k) => load[k])
          .map((k) => `${load[k]} of ${load.capacity[k]} ${k}`)
          .join(', ') || 'Empty';
    pauseBig.textContent = load.big ? bigName(load.big) : '';
    pauseBig.hidden = !load.big;
    for (const k of kinds) {
      pauseRowsBy[k].el.hidden = !!load.big || !load[k];
      fillRow(pauseRowsBy[k], load.capacity[k], load[k], false);
    }
    pauseCarry.hidden = !load.big && !held;
    tag.setAttribute('aria-label', exact);
  }
  // Big things show their name only; otherwise a row for each kind carried, or just refused or grown.
  bigLabel.textContent = load.big ? bigName(load.big) : '';
  bigLabel.hidden = !load.big;
  for (const k of kinds) {
    tagRows[k].el.hidden = !!load.big || (!load[k] && now >= rowUntil[k]);
    fillRow(tagRows[k], load.capacity[k], landed[k], true);
  }
  if (load.attention) carryUntil = Math.max(carryUntil, now + 2000);
  // Retain the tag's hold and fade as counts change.
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
