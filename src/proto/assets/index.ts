// Prototype: the asset pipeline end to end (?proto=assets; docs/plans/asset-pipeline.md). Two scaffold bays rise side
// by side near spawn, piece by piece, then clear and rise again: on the left from the Blender-made kit
// (assets/src/scaffold-kit.py, built by `npm run assets`, loaded by src/render/assets.ts, each piece dropped by the
// kit's glTF "drop" clip), on the right from the same pieces built in code and dropped by a code tween. Code places and
// times both. Serves "Small and readable" (DESIGN.md): it is the check that models stay cheap to add and to read.
// Local: decoration only, each tab runs its own.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { precompile } from '../../render/precompile.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { SPAWN } from '../../constants.ts';
import { registerAsset } from '../../render/asset-manifest.ts';
import kitUrl from '../../../assets/built/scaffold-kit.glb?url';

const KIT = registerAsset({
  id: 'scaffold-kit',
  url: kitUrl,
  kind: 'model',
  priority: 'first',
  when: { proto: 'assets' },
});

type Piece = 'pole' | 'clamp' | 'plank';
type Slot = { piece: Piece; x: number; y: number; z: number; yaw: number };

// One bay, 2.2 x 0.9 m between poles, two lifts. Pieces drop in this order, STAGGER seconds apart.
const BAY = { hx: 1.1, hz: 0.45, lifts: [1.4, 2.8] };
const STAGGER = 0.22; // s between pieces
const HOLD = 3; // s standing finished before it clears and rises again
const SLOTS: Slot[] = [];
for (const [sx, sz] of [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
])
  SLOTS.push({ piece: 'pole', x: sx * BAY.hx, y: 0, z: sz * BAY.hz, yaw: 0 });
for (const h of BAY.lifts) {
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ])
    SLOTS.push({ piece: 'clamp', x: sx * BAY.hx, y: h, z: sz * BAY.hz, yaw: sx < 0 ? Math.PI : 0 });
  for (const z of [-0.3, 0, 0.3]) SLOTS.push({ piece: 'plank', x: 0, y: h + 0.06, z, yaw: 0 });
}
const CYCLE = SLOTS.length * STAGGER + 0.6 + HOLD;

// ---------------------------------------------------------------- the code-built kit (the same shapes and colours)
function codeKit(): Record<Piece, THREE.Mesh> {
  const mat = (hex: string, roughness = 0.9) =>
    new THREE.MeshStandardNodeMaterial({ color: hex, roughness, flatShading: true });
  const pole = mergeGeometries([
    new THREE.CylinderGeometry(0.06, 0.075, 3, 8).translate(0, 1.5, 0),
    new THREE.CylinderGeometry(0.08, 0.085, 0.1, 8).translate(0, 2.7, 0),
  ]);
  const plank = new THREE.BoxGeometry(2.4, 0.06, 0.3).translate(0, 0.03, 0);
  const clamp = mergeGeometries([
    new THREE.CylinderGeometry(0.1, 0.1, 0.12, 8, 1, true),
    new THREE.BoxGeometry(0.1, 0.1, 0.06).translate(0.14, 0, 0),
  ]);
  return {
    pole: new THREE.Mesh(pole, mat('#7a5634')),
    plank: new THREE.Mesh(plank, mat('#c49a62')),
    clamp: new THREE.Mesh(clamp, mat('#4d4b52', 0.6)),
  };
}
// The kit's drop clip, by hand: fall 2.5 m with a tilt over 8 frames, squash, settle (30 fps keys, as in the .py).
function codeDrop(o: THREE.Object3D, t: number) {
  const f = t * 30;
  const fall = Math.min(f / 8, 1);
  o.position.y = 2.5 * (1 - fall * fall);
  o.rotation.x = ((10 * Math.PI) / 180) * (1 - fall); // Blender's tilt about X keeps its sign in Y up
  const squash =
    f < 8 ? 0 : f < 11 ? (f - 8) / 3 : f < 14 ? 1 - ((f - 11) / 3) * 1.3 : f < 18 ? -0.3 * (1 - (f - 14) / 4) : 0;
  o.scale.set(1 + 0.12 * squash, 1 - 0.2 * squash, 1 + 0.12 * squash);
}

type Placed = { holder: THREE.Object3D; started: boolean };
async function build() {
  const { loadAssetById, play } = await import('../../render/assets.ts');
  const kit = await loadAssetById(KIT);
  const code = codeKit();
  const y = groundHeight(SPAWN.x, SPAWN.z - 4);
  const roots: THREE.Object3D[] = [];
  const bay = (cx: number, model: boolean) => {
    const root = new THREE.Group();
    root.position.set(cx, y, SPAWN.z - 4);
    const placed: Placed[] = SLOTS.map((s) => {
      const holder = model ? kit.instance(s.piece) : new THREE.Group().add(code[s.piece].clone());
      holder.position.set(s.x, s.y, s.z);
      holder.rotation.y = s.yaw;
      holder.visible = false;
      root.add(holder);
      return { holder, started: false };
    });
    scene.add(root);
    roots.push(root);
    return placed;
  };
  const model = bay(SPAWN.x - 2.6, true);
  const coded = bay(SPAWN.x + 2.6, false);
  for (const r of roots) await precompile(r);
  const bays = [
    { list: model, isModel: true },
    { list: coded, isModel: false },
  ];
  let t = 0;
  onFrame(
    ({ dt }) => {
      t = (t + dt) % CYCLE;
      for (let i = 0; i < SLOTS.length; i++) {
        const at = t - i * STAGGER;
        const show = at >= 0 && t < CYCLE - 0.3;
        for (const { list, isModel } of bays) {
          const p = list[i];
          p.holder.visible = show;
          if (!show) p.started = false;
          else if (isModel && !p.started) {
            p.started = true;
            play(p.holder, kit.clip('drop', SLOTS[i].piece));
          } else if (!isModel) codeDrop(p.holder.children[0], Math.min(at, 0.6));
        }
      }
    },
    { phase: 'update', order: 40 },
  );
  (window as unknown as { __assets?: unknown }).__assets = { kit, t: () => t, seek: (s: number) => (t = s) };
}

void build(); // gated by src/features/proto-assets.ts
