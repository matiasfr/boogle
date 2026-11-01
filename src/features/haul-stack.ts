// The haul stack: what you carry, drawn as a bundle of pieces on your back (and on everyone else's, from the lockstep
// stacks matched to avatars through presence `pid`). A small chip shows your count and your own contribution tier
// (from the plaques). Pickups fly to your back the moment you walk into a pile (Local), while the host confirms
// (~0.5 s). Placeholder visuals (0.1 groundwork). No control of its own: pickup is walking into a pile, pouring is
// walking into a site's ring (work-sites.ts).
// Serves DESIGN.md 1 (toys before chores: wood on your back, carried around with nothing to do). Lockstep counts,
// Local look.
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
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
import { TIERS, tierOf } from '../sim/tiers.ts';

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

// Pieces flying from a pile to your back: { from, n, t0 }.
const flights: { from: THREE.Vector3; n: number; t0: number }[] = [];
onFly((from, n) => flights.push({ from: from.clone(), n: Math.min(n, 6), t0: performance.now() }));

const chip = document.createElement('div');
chip.className = 'haul-chip';
document.body.append(chip);
let chipText = '';

onFrame(
  ({ now }: { now: number }) => {
    const mine = myStack();
    let c = 0,
      b = 0;
    const draw = (a: THREE.Object3D | null, pid: string | null | undefined) => {
      const { n, k } = stackOf(pid);
      if (!a || !n) return;
      a.updateMatrixWorld();
      const f = frameOf(a);
      const len = lenOf(n),
        shown = shownOf(n);
      for (let m = 0; m < shown; m++) {
        mesh.setMatrixAt(c, pieceAt(f, m, len, m4));
        mesh.setColorAt(c++, pieceColor(k));
      }
      if (shown >= 3 && b + 2 <= bands.instanceMatrix.count)
        for (const side of [-1, 1]) bands.setMatrixAt(b++, bandAt(f, shown, len, side, m4));
    };
    draw(me.entered ? me.avatar : null, identity.pid);
    for (const r of remotes.values()) draw(r.visible ? r.avatar : null, r.pid);
    // fly-ins: a short hop from the pile to the top of your bundle
    for (let f = flights.length - 1; f >= 0; f--) {
      const fl = flights[f];
      const u = (now - fl.t0) / haulFeel.flyMs;
      if (u >= 1 || !me.avatar) {
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
    updateChip(mine);
  },
  { phase: 'update', order: 32 },
);

// The chip: your material and count, and your own tier only (brief 8: no readout on anyone else), derived from the
// plaques; rebuilt only when your stack or the sites change.
let chipKey = '';
function updateChip(mine: Stack): void {
  const key = `${mine.n}/${mine.k}/${rules.sites.sites.rev}`;
  if (key === chipKey) return;
  chipKey = key;
  const tier = TIERS[tierOf(identity.pid ? rules.sites.points(identity.pid) : 0)]?.name;
  const text = [mine.n ? `${MATERIALS[mine.k]} ${mine.n}` : '', tier ?? ''].filter(Boolean).join(' · ');
  if (text !== chipText) {
    chipText = text;
    chip.textContent = text;
    chip.classList.toggle('on', !!text);
  }
}
