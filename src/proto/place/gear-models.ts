// Pure wearable builders: game and asset stage share geometry and attachment contracts.
import * as THREE from 'three/webgpu';
import { merged, type Part } from './part-geometry.ts';
const TEAL = '#39e6c6';
const clothMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide });
const gearMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.3 });

// ---------------------------------------------------------------- the canopy
// Our own glider, not a parachute: a broad curved wing of cloth in panels on an old brass bar, wide enough to read from any
// distance and open at the back so the cargo stays in sight. About 2.5 m across, held in both hands, built in code.
function canopyGeometry() {
  const W = 12,
    D = 4;
  const pos: number[] = [],
    col: number[] = [],
    idx: number[] = [];
  const c = new THREE.Color();
  const A = new THREE.Color('#f2e6c8'),
    B = new THREE.Color('#2fb7a0');
  for (let j = 0; j <= D; j++)
    for (let i = 0; i <= W; i++) {
      const u = i / W - 0.5,
        v = j / D - 0.5;
      const x = u * 2.5;
      const y = 0.62 * (1 - (2 * u) ** 2) * 0.5 + 0.1 * (1 - (2 * v) ** 2);
      const z = v * 1.15 + Math.abs(u) * 0.18;
      pos.push(x, y, z);
      c.copy(Math.floor(i / 2) % 2 ? A : B);
      col.push(c.r, c.g, c.b);
    }
  for (let j = 0; j < D; j++)
    for (let i = 0; i < W; i++) {
      const a = i + j * (W + 1),
        b = a + 1,
        d = a + W + 1,
        e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const canopyGeo = canopyGeometry();
const barGeo = merged([
  ['b', 0, -0.02, -0.56, 2.5, 0.05, 0.06, '#c79a3e'],
  ['b', -0.34, -0.42, -0.3, 0.035, 0.85, 0.035, '#8a6a2c', 0.18, -0.22],
  ['b', 0.34, -0.42, -0.3, 0.035, 0.85, 0.035, '#8a6a2c', 0.18, 0.22],
]);
export type Canopy = { g: THREE.Group; w: number };
/** Game instances share immutable templates; the disposable stage explicitly requests owned resources. */
export function makeCanopy(owned = false): Canopy {
  const g = new THREE.Group();
  const cloth = new THREE.Mesh(owned ? canopyGeo.clone() : canopyGeo, owned ? clothMat.clone() : clothMat);
  cloth.castShadow = true;
  const bar = new THREE.Mesh(owned ? barGeo.clone() : barGeo, owned ? gearMat.clone() : gearMat);
  g.add(cloth, bar);
  g.visible = false;
  return { g, w: 0 };
}

// ---------------------------------------------------------------- arms, from directions in the world
const a = new THREE.Vector3(),
  b = new THREE.Vector3(),
  cur = new THREE.Vector3(),
  q1 = new THREE.Quaternion(),
  q2 = new THREE.Quaternion(),
  q3 = new THREE.Quaternion();
type Named = THREE.Object3D & { getObjectByName: (n: string) => THREE.Object3D | undefined };
/** Turns `bone` so the way to `child` points along `dir` (world), by `w`. The mixer rewrites it next frame. */
function aim(bone: THREE.Object3D, child: THREE.Object3D, dir: THREE.Vector3, w: number) {
  const p = bone.parent;
  if (!p) return;
  bone.getWorldPosition(a);
  child.getWorldPosition(b);
  cur.subVectors(b, a).normalize();
  q1.setFromUnitVectors(cur, dir);
  bone.getWorldQuaternion(q2);
  q1.multiply(q2); // what its world rotation would be
  p.getWorldQuaternion(q3).invert();
  q3.multiply(q1); // in its parent's terms
  bone.quaternion.slerp(q3, w);
}
const dirL = new THREE.Vector3(),
  dirR = new THREE.Vector3(),
  right = new THREE.Vector3(),
  up = new THREE.Vector3();
function armsToCanopy(root: Named, w: number) {
  const ul = root.getObjectByName('upperarm_l'),
    ll = root.getObjectByName('lowerarm_l'),
    hl = root.getObjectByName('hand_l'),
    ur = root.getObjectByName('upperarm_r'),
    lr = root.getObjectByName('lowerarm_r'),
    hr = root.getObjectByName('hand_r');
  if (!ul || !ll || !hl || !ur || !lr || !hr) return;
  right.subVectors(ul.getWorldPosition(a), ur.getWorldPosition(b)).normalize();
  up.set(0, 1, 0);
  dirL.copy(up).multiplyScalar(0.92).addScaledVector(right, 0.42).normalize();
  dirR.copy(up).multiplyScalar(0.92).addScaledVector(right, -0.42).normalize();
  aim(ul, ll, dirL, w);
  aim(ur, lr, dirR, w);
  dirL.copy(up).multiplyScalar(0.97).addScaledVector(right, 0.12).normalize();
  dirR.copy(up).multiplyScalar(0.97).addScaledVector(right, -0.12).normalize();
  aim(ll, hl, dirL, w);
  aim(lr, hr, dirR, w);
}
const toRing = new THREE.Vector3();
export function armToRing(root: Named, ring: THREE.Vector3, w: number) {
  const ur = root.getObjectByName('upperarm_r'),
    lr = root.getObjectByName('lowerarm_r'),
    hr = root.getObjectByName('hand_r');
  if (!ur || !lr || !hr) return;
  toRing.subVectors(ring, ur.getWorldPosition(a)).normalize();
  aim(ur, lr, toRing, w);
  aim(lr, hr, toRing, w);
}

/** The canopy over someone's head, in their avatar's space so a fast frame can't leave it behind. */
export function placeCanopy(root: Named, c: Canopy, want: number, dt: number, now: number) {
  c.w += (want - c.w) * (1 - Math.exp(-dt / (want > c.w ? 0.04 : 0.05)));
  if (c.w < 0.01) {
    c.w = 0;
    c.g.visible = false;
    return;
  }
  if (c.g.parent !== root) root.add(c.g);
  c.g.visible = true;
  armsToCanopy(root, Math.min(1, c.w * 1.3));
  const head = root.getObjectByName('Head');
  if (head) root.worldToLocal(head.getWorldPosition(a));
  else a.set(0, 0.9, 0);
  // Opens fast: from a bundle at your shoulders to the full width. The wing rides with you; no lean of the whole body.
  const s = c.w,
    flutter = Math.sin(now * 0.011) * 0.008;
  c.g.position.set(0, a.y + 0.22 + 0.45 * s, 0);
  c.g.scale.set(Math.max(0.12, s), Math.max(0.3, s) * (1 + flutter), Math.max(0.2, s));
  c.g.rotation.z = Math.sin(now * 0.0023) * 0.012;
}

/** Avatar load-socket coordinates: +Z behind Buddy, origin 0.45 m above the soles. */
export function packParts(): Part[] {
  const parts: Part[] = [
    ['b', 0, 0.23, 0.25, 0.62, 0.06, 0.06, '#a98249'],
    ['b', 0, 0.6, 0.25, 0.62, 0.06, 0.06, '#a98249'],
    ['b', 0, 0.14, 0.5, 0.62, 0.045, 0.5, '#c5a466'],
    ['b', 0, 0.2, 0.75, 0.62, 0.06, 0.06, '#a98249'],
  ];
  for (const x of [-0.28, 0.28])
    parts.push(['b', x, 0.4, 0.25, 0.055, 0.46, 0.055, '#a98249'], ['b', x, 0.2, 0.5, 0.045, 0.1, 0.5, '#69472e']);
  for (const x of [-0.205, 0.205])
    parts.push(
      ['strap', x, 0.49, 0.015, 1, 1, 1.13, '#c9a86a'],
      ['b', x, 0.42, -0.215, 0.056, 0.28, 0.035, '#c9a86a'],
      ['b', x, 0.4, 0.245, 0.056, 0.3, 0.035, '#c9a86a'],
      ['b', x, 0.32, -0.238, 0.075, 0.065, 0.025, '#d9a23a'],
    );
  return parts;
}
let frameGeometry: THREE.BufferGeometry | undefined;
const frameMaterial = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.92 });
export function packFrameMesh(owned = false) {
  const geometry = (frameGeometry ??= merged(packParts()));
  const mesh = new THREE.Mesh(owned ? geometry.clone() : geometry, owned ? frameMaterial.clone() : frameMaterial);
  mesh.name = 'wear_frame';
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export type GearState = { rings: boolean; spool: boolean; glider: boolean; frame: boolean; canopy: boolean };
export function makeGear() {
  // Decoded Buddy ankle radius at y=.225 is .088 m; foot dome ends at .196 m.
  // Inner radius .091 leaves a small rest gap; the 56 mm height reads as a fitted band.
  const ring = new THREE.TorusGeometry(0.105, 0.014, 8, 24).rotateX(Math.PI / 2).scale(1, 2, 1);
  const ringMat = new THREE.MeshStandardNodeMaterial({ color: TEAL, roughness: 0.4, metalness: 0.25 });
  const ankleL = new THREE.Mesh(ring, ringMat),
    ankleR = new THREE.Mesh(ring, ringMat);
  ankleL.name = 'wear_ankle_l';
  ankleR.name = 'wear_ankle_r';
  // A cuff round the forearm with the spool on its outer surface, rather than through the elbow.
  const spool = new THREE.Group();
  spool.name = 'wear_spool';
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.091, 0.012, 6, 18).rotateY(Math.PI / 2), ringMat);
  const reel = new THREE.Mesh(
    merged([
      ['c', 0, 0, -0.11, 0.075, 0.06, 0.075, '#c79a3e', Math.PI / 2],
      ['c', 0, 0, -0.148, 0.086, 0.022, 0.086, TEAL, Math.PI / 2],
    ]),
    gearMat.clone(),
  );
  spool.add(cuff, reel);
  const pack = new THREE.Group();
  pack.name = 'wear_glider';
  const roll = new THREE.Mesh(
    merged([
      ['c', 0, 0, 0, 0.068, 0.48, 0.068, '#f2e6c8', 0, Math.PI / 2],
      ['c', -0.16, 0, 0, 0.072, 0.065, 0.072, '#2fb7a0', 0, Math.PI / 2],
      ['c', 0.16, 0, 0, 0.072, 0.065, 0.072, '#2fb7a0', 0, Math.PI / 2],
      ['b', 0, -0.057, 0.025, 0.53, 0.028, 0.028, '#c79a3e'],
      ['b', -0.16, 0.07, -0.04, 0.035, 0.15, 0.025, '#69472e'],
      ['b', 0.16, 0.07, -0.04, 0.035, 0.15, 0.025, '#69472e'],
    ]),
    clothMat.clone(),
  );
  pack.add(roll);
  const gear = { ankleL, ankleR, spool, pack };
  for (const object of Object.values(gear))
    object.traverse((o) => {
      o.castShadow = true;
    });
  return gear;
}
type Gear = ReturnType<typeof makeGear>;

// Quantized glTF inverse binds include mesh decode scale/translation. Only the normalized
// rotation is needed for an offset from the named bone pivot in model-rest axes.
function attachAtRest(root: THREE.Object3D, mesh: THREE.Object3D, name: string, offset: THREE.Vector3) {
  const bone = root.getObjectByName(name);
  if (!bone || mesh.parent === bone) return;
  let inverse: THREE.Matrix4 | undefined;
  root.traverse((o) => {
    if (inverse || !(o instanceof THREE.SkinnedMesh)) return;
    const index = o.skeleton.bones.indexOf(bone as THREE.Bone);
    if (index >= 0) inverse = o.skeleton.boneInverses[index];
  });
  if (!inverse) return;
  inverse.decompose(new THREE.Vector3(), mesh.quaternion, new THREE.Vector3());
  mesh.quaternion.normalize();
  mesh.position.copy(offset).applyQuaternion(mesh.quaternion);
  bone.add(mesh);
}

/** Both owners call this after posing. Bone parenting preserves rotation as well as position. */
export function wearGear(root: THREE.Object3D, back: THREE.Object3D | undefined, gear: Gear, state: GearState) {
  attachAtRest(root, gear.ankleL, 'calf_l', new THREE.Vector3(0.002, -0.155, 0));
  attachAtRest(root, gear.ankleR, 'calf_r', new THREE.Vector3(-0.002, -0.155, 0));
  attachAtRest(root, gear.spool, 'lowerarm_r', new THREE.Vector3(-0.09, 0, 0));
  gear.ankleL.visible = gear.ankleR.visible = state.rings;
  gear.spool.visible = state.spool;
  gear.pack.visible = state.glider && !state.canopy;
  if (back) {
    if (gear.pack.parent !== back) back.add(gear.pack);
    // The frame roll is tied below the cradle: even a full stack leaves it visible and off the body.
    gear.pack.position.set(0, state.frame ? 0.045 : 0.57, state.frame ? 0.49 : 0.3);
  }
}
