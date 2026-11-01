// The haul stack: what you carry, drawn as a bundle of pieces on your back (and on everyone else's, from the lockstep
// stacks matched to avatars through presence `pid`). A small chip shows your count (no contribution tier: tiers stay
// data in src/sim/tiers.ts until rewards are designed; docs/proposals/boogle-2.md, 2026-11-02). Pickups fly to your back the moment you walk into a pile (Local), while the host confirms
// (~0.5 s). Placeholder visuals (0.1 groundwork). No control of its own: pickup is walking into a pile, pouring is
// walking into a site's ring (work-sites.ts).
// Serves DESIGN.md 1 (toys before chores: wood on your back, carried around with nothing to do). Lockstep counts,
// Local look. With ?proto=uisfx (docs/research/ui-patterns.md, rec 3) the chip is a play-size wood pill with a log
// icon, and its number ticks one by one toward the host-confirmed count with a pop and a count sound per step.
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import '../render/ui-kit.css';
import './haul-stack.css';
import * as THREE from 'three/webgpu';
import { onFrame } from '../loop.ts';
import { identity } from '../player/identity.ts';
import { me } from '../player/player.ts';
import { remotes, onRemotePresence } from '../netplay/net.ts';
import { okPid } from '../sim/roster.ts';
import { HARD_CAP } from '../sim/stacks.ts';
import { scene } from '../render/scene.ts';
import { pieceMesh, pieceColor, commitPieces, PIECE, onFly } from '../render/haul-pieces.ts';
import { haulFeel } from '../player/haul-feel.ts';
import { MATERIALS } from '../sim/materials.ts';
import { uiSound, replay, UI_KIT } from '../render/ui-sound.ts';
import { protoActivity } from '../proto/mark.ts';

// The bundle: logs lying crosswise, stacked up and out from the back on a hex lattice (slots filled nearest-first, so
// it fills out rather than up), with two rope bands round it. At most SHOWN pieces drawn, growing more slowly than the
// count (shownOf), and the logs get longer as the count grows: 4 and 60 read differently without ever towering. No
// motion of its own: it rides the avatar's walk bob and lean.
const SHOWN = 22;
const RS = 0.75; // piece radius in the bundle, as a fraction of a ground piece's
const R = PIECE.r * RS;
const BACK = 0.45; // the avatar's back (PLAYER_R), local +z
const FLOOR = 0.16; // the bundle's bottom, in the avatar's space (the foot sphere's centre is 0)
// [y, z] per slot: height above the bundle's bottom, distance out from the back.
const slots: [number, number][] = (() => {
  const pts: [number, number][] = [];
  for (let j = 0; j < 8; j++) for (let i = 0; i < 9; i++) pts.push([(i + (j % 2) * 0.5) * 2 * R, j * 2 * R * 0.866]);
  const score = ([y, z]: [number, number]) => (y / 1.4) ** 2 + z ** 2; // a little taller than deep
  return pts.sort((p, r) => score(p) - score(r) || p[0] - r[0]).slice(0, SHOWN);
})();
// The bundle's extent with k pieces: [top, depth] of the slot centres, for the rope bands.
const extents = slots.map((_, k) => [
  Math.max(...slots.slice(0, k + 1).map((s) => s[0])),
  Math.max(...slots.slice(0, k + 1).map((s) => s[1])),
]);
const shownOf = (n: number): number => (n <= 12 ? n : Math.min(SHOWN, Math.round(12 + (n - 12) * 0.21)));
const lenOf = (n: number): number => 1 + 0.55 * Math.min(1, n / HARD_CAP);

const mesh = pieceMesh(9 * SHOWN + 48);
const bands = new THREE.InstancedMesh(
  new THREE.CylinderGeometry(1, 1, 0.09, 18, 1, true).rotateZ(Math.PI / 2), // an open ring round the x axis
  new THREE.MeshStandardNodeMaterial({ color: '#d6b878', roughness: 1, side: THREE.DoubleSide, flatShading: true }),
  18,
);
bands.count = 0;
bands.frustumCulled = false;
bands.castShadow = true;
scene.add(bands);
const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  e = new THREE.Euler(),
  v = new THREE.Vector3(),
  sc = new THREE.Vector3(),
  one = new THREE.Vector3(1, 1, 1),
  top = new THREE.Vector3();

onRemotePresence((r: { pid?: string | null }, pr: { pid?: unknown }) => (r.pid = okPid(pr.pid) ? pr.pid : null));

type Stack = { n: number; k: number };
const stackOf = (pid: string | null | undefined): Stack => {
  const k = pid ? rules.roster.indexOf(pid) : -1;
  return k < 0 ? { n: 0, k: -1 } : { n: rules.stacks.countAt(k), k: rules.stacks.kindAt(k) };
};
export const myStack = () => stackOf(identity.pid);
protoActivity(() => (myStack().n ? 'carrying' : null)); // for the playtest trace (src/proto/trace/)
// A player whose stack is drawn somewhere else (the haul prototype's wheelbarrow tray): no bundle on their back and no
// fly-ins to it. Local.
const elsewhere = new Set<string>();
export const setBackBundleHidden = (pid: string, hidden: boolean): void =>
  void (hidden ? elsewhere.add(pid) : elsewhere.delete(pid));

// The bundle's frame: the avatar's inner group (it bobs, leans and squashes with the walk), so the logs ride along.
const frameOf = (a: THREE.Object3D): THREE.Object3D => (a.userData as { inner?: THREE.Object3D }).inner ?? a;
// Slot m in the frame's space, its log end a little ragged.
const slotAt = (m: number, out: THREE.Vector3): THREE.Vector3 =>
  out.set((((m * 37) % 7) - 3) * 0.012, FLOOR + R + slots[m][0], BACK + R + slots[m][1]);
function pieceAt(f: THREE.Object3D, m: number, len: number, out: THREE.Matrix4): THREE.Matrix4 {
  q.setFromEuler(e.set(0, (((m * 13) % 5) - 2) * 0.03, (((m * 7) % 5) - 2) * 0.02));
  sc.set(len * (1 + (((m * 11) % 5) - 2) * 0.03), RS, RS);
  return out.compose(slotAt(m, v), q, sc).premultiply(f.matrixWorld);
}
// The two rope bands round k pieces: an ellipse a little outside the bundle's cross-section.
function bandAt(f: THREE.Object3D, k: number, len: number, side: number, out: THREE.Matrix4): THREE.Matrix4 {
  const [y1, z1] = extents[k - 1];
  v.set(side * 0.28 * PIECE.len * len, FLOOR + R + y1 / 2, BACK + R + z1 / 2);
  sc.set(1, y1 / 2 + R * 1.05, z1 / 2 + R * 1.05);
  return out.compose(v, q.identity(), sc).premultiply(f.matrixWorld);
}

// Seams for a haul variant that draws pickups its own way (?proto=haul&v=magnet, src/proto/haul/magnet.ts): with
// `flyIns` false this module draws no fly-ins; `count(n)` is what your chip and your own bundle show while the host's
// count is n (the magnet moves it one arrival at a time). Local.
export const backSeam = { flyIns: true, count: (n: number) => n };
export const BUNDLE_SCALE = RS;
/** Where the next piece onto your bundle goes, holding `n` now: its world position and the bundle's world rotation. */
export function myBundleNext(n: number, out: THREE.Vector3, rot: THREE.Quaternion): boolean {
  if (!me.avatar || !me.entered) return false;
  me.avatar.updateMatrixWorld();
  const f = frameOf(me.avatar);
  f.localToWorld(slotAt(Math.min(SHOWN, shownOf(n + 1)) - 1, out));
  f.getWorldQuaternion(rot);
  return true;
}

// One stack of n pieces of kind k on avatar a, into the bundle and band meshes from slot c and b on.
let c = 0,
  b = 0;
function draw(a: THREE.Object3D | null, pid: string | null | undefined, n: number, k: number): void {
  if (!a || !n || (pid && elsewhere.has(pid))) return;
  a.updateMatrixWorld();
  const f = frameOf(a);
  const len = lenOf(n),
    shown = shownOf(n);
  for (let m = 0; m < shown; m++) {
    mesh.setMatrixAt(c, pieceAt(f, m, len, m4));
    mesh.setColorAt(c++, pieceColor(k));
  }
  if (shown < 3 || b + 2 > bands.instanceMatrix.count) return;
  bands.setMatrixAt(b++, bandAt(f, shown, len, -1, m4));
  bands.setMatrixAt(b++, bandAt(f, shown, len, 1, m4));
}

// Pieces flying from a pile to your back: { from, n, t0 }.
const flights: { from: THREE.Vector3; n: number; t0: number }[] = [];
onFly((from, n) => backSeam.flyIns && flights.push({ from: from.clone(), n: Math.min(n, 6), t0: performance.now() }));

const chip = document.createElement('div');
chip.className = 'haul-chip';
document.body.append(chip);
let chipText = '';

onFrame(
  ({ now }: { now: number }) => {
    const mine = myStack();
    c = b = 0;
    draw(me.entered ? me.avatar : null, identity.pid, backSeam.count(mine.n), mine.k);
    for (const r of remotes.values()) {
      if (!r.visible || !r.avatar) continue;
      const st = stackOf(r.pid);
      draw(r.avatar, r.pid, st.n, st.k);
    }
    // fly-ins: a short hop from the pile to the top of your bundle
    for (let f = flights.length - 1; f >= 0; f--) {
      const fl = flights[f];
      const u = (now - fl.t0) / haulFeel.flyMs;
      if (u >= 1 || !me.avatar || (identity.pid && elsewhere.has(identity.pid))) {
        flights.splice(f, 1);
        continue;
      }
      me.avatar.updateMatrixWorld();
      const to = frameOf(me.avatar).localToWorld(slotAt(Math.max(0, shownOf(mine.n) - 1), top));
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
    if (UI_KIT) tickChip(mine, now);
    else updateChip(mine);
  },
  { phase: 'update', order: 32 },
);

// The chip: your material and count, only while you carry something.
function updateChip(host: Stack): void {
  const n = backSeam.count(host.n);
  const text = n ? `${MATERIALS[host.k]} ${n}` : '';
  if (text !== chipText) {
    chipText = text;
    chip.textContent = text;
    chip.classList.toggle('on', !!text);
  }
}

// ?proto=uisfx: the chip's parts, and the count it shows ticking toward the confirmed one (about 300 ms per change).
const kit = { n: null as HTMLElement | null, what: null as HTMLElement | null };
const shown = { n: 0, to: 0, step: 0, at: 0, key: '' };
if (UI_KIT) {
  chip.classList.add('kit');
  chip.innerHTML =
    '<svg class="haul-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="7" width="18" height="10" rx="5"/>' +
    '<ellipse cx="19" cy="12" rx="3.2" ry="5"/><ellipse cx="19" cy="12" rx="1.3" ry="2"/></svg>' +
    '<span class="haul-n"></span><span class="haul-what"></span>';
  [kit.n, kit.what] = [...chip.querySelectorAll('span')] as HTMLElement[];
}
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
    replay(kit.n, 'ui-tick');
  }
  const key = `${shown.n}/${mine.k}`;
  if (key === shown.key) return;
  shown.key = key;
  kit.n!.textContent = shown.n ? String(shown.n) : '';
  kit.what!.textContent = shown.n ? MATERIALS[Math.max(0, mine.k)] : '';
  chip.classList.toggle('on', !!shown.n);
  chip.classList.toggle('carrying', !!shown.n);
  chip.classList.toggle('full', !!shown.n && shown.n >= rules.stacks.hard());
}
