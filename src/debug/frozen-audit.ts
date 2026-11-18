// Dev server only (src/features/frozen-audit.ts loads it): every 30 frames, each node frozen by freezeInPlace
// (src/render/instances.ts, matrixWorldAutoUpdate = false) is checked against matrices rebuilt from its own and its
// ancestors' position, rotation and scale. A frozen node never recomputes its matrices, so one that a later change
// moves would draw in its old place without a word; this names it with a console.error instead, which `npm run look`
// and the scenarios count as a failure. Once per node. `window.__frozenAudit` holds the counts for evals.
import * as THREE from 'three/webgpu';
import { scene } from '../render/scene-graph.ts';
import { onFrame } from '../loop.ts';

const EVERY = 30;
const LOCAL = 1e-4,
  WORLD = 1e-3;
const state = { checks: 0, frozen: 0, reported: 0 };
(window as unknown as { __frozenAudit: typeof state }).__frozenAudit = state;

const composed = new THREE.Matrix4();
const rebuilt = new THREE.Matrix4();
const step = new THREE.Matrix4();
const seen = new WeakSet<THREE.Object3D>();
const chain: THREE.Object3D[] = [];

const gap = (a: THREE.Matrix4, b: THREE.Matrix4) => {
  let d = 0;
  for (let i = 0; i < 16; i++) d = Math.max(d, Math.abs(a.elements[i]! - b.elements[i]!));
  return d;
};
const pathOf = (o: THREE.Object3D) => {
  const names: string[] = [];
  for (let n: THREE.Object3D | null = o; n && n !== scene; n = n.parent) names.push(n.name || n.type);
  return names.reverse().join('/');
};
// The world matrix the node should have: each link from its transform, except a node that keeps a hand-set matrix
// (matrixAutoUpdate off and not frozen, as ring-island-far's root), whose matrix is the truth.
function trueWorld(o: THREE.Object3D, out: THREE.Matrix4) {
  chain.length = 0;
  for (let n: THREE.Object3D | null = o; n; n = n.parent) chain.push(n);
  out.identity();
  for (let i = chain.length - 1; i >= 0; i--) {
    const n = chain[i]!;
    const own = n.matrixAutoUpdate || !n.matrixWorldAutoUpdate;
    out.multiply(own ? step.compose(n.position, n.quaternion, n.scale) : n.matrix);
  }
  return out;
}

function audit() {
  let frozen = 0;
  scene.traverse((o) => {
    if (o.matrixWorldAutoUpdate) return;
    frozen++;
    if (seen.has(o)) return;
    const local = gap(o.matrix, composed.compose(o.position, o.quaternion, o.scale));
    const world = gap(o.matrixWorld, trueWorld(o, rebuilt));
    if (local <= LOCAL && world <= WORLD) return;
    seen.add(o);
    state.reported++;
    console.error(
      `[frozen-matrix] ${pathOf(o)} (id ${o.id}) is out of date: it or a parent moved after freezeInPlace, so it still ` +
        `draws where it was frozen ` +
        `(local off by ${local.toFixed(4)}, world by ${world.toFixed(4)}): don't freeze what moves (render/instances.ts)`,
    );
  });
  state.frozen = frozen;
  state.checks++;
}

let frame = 0;
// First in the frame: the last frame's render has used every frozen matrix, and nothing has moved since.
onFrame(
  () => {
    if (++frame % EVERY === 0) audit();
  },
  { phase: 'prePhysics', order: -1e9 },
);
