// The haul stack: what you carry, drawn as a bundle of pieces on your back (and on everyone else's, from the lockstep
// stacks matched to avatars through presence `pid`). A small chip shows your count (no contribution tier: tiers stay
// data in src/sim/tiers.ts until rewards are designed; docs/proposals/boogle-2.md, 2026-11-02). Pickups fly to your back the moment you walk into a pile (Local), while the host confirms
// (~0.5 s). Placeholder visuals (0.1 groundwork). No control of its own: pickup is walking into a pile, pouring is
// walking into a site's ring (work-sites.ts).
// Serves DESIGN.md 1 (toys before chores: wood on your back, carried around with nothing to do). Lockstep counts,
// Local look. The chip is a play-size wood pill with a log icon, and its number ticks one by one toward the
// host-confirmed count with a pop and a count sound per step (docs/research/ui-patterns.md, rec 3).
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
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
  BUNDLE_SCALE,
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

// Seams for a haul variant that draws pickups its own way (?proto=haul&v=magnet, src/proto/haul/magnet.ts): with
// `flyIns` false this module draws no fly-ins; `count(n)` is what your chip and your own bundle show while the host's
// count is n (the magnet moves it one arrival at a time). Local.
export const backSeam = {
  flyIns: true,
  count: (n: number) => n,
  remote: null as ((peer: string) => number) | null, // ?proto=place&coop=1: a partner's logs, from their presence
};
export { BUNDLE_SCALE };
/** Where the next piece onto your bundle goes, holding `n` now: its world position and the bundle's world rotation. */
export function myBundleNext(n: number, out: THREE.Vector3, rot: THREE.Quaternion): boolean {
  if (!me.avatar || !me.entered) return false;
  me.avatar.updateMatrixWorld();
  const f = frameOf(me.avatar);
  f.localToWorld(slotAt(Math.min(SHOWN, shownOf(n + 1)) - 1, fitOf(me.avatar), out));
  f.getWorldQuaternion(rot);
  return true;
}

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

defineKind('haul-stack', { update: 32 });
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
    tickChip(mine, now);
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
