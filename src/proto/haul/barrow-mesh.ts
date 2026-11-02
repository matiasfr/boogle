// The wheelbarrow's look (greybox: boxes and a wheel), kept to one module so an art pass swaps it without touching the
// mechanic (docs/plans/find-the-fun.md, "Greybox first, with a seam for depth"). Local space: -z forward, the wheel in
// front, the handles behind; the origin is on the ground under the tray's middle.
import * as THREE from 'three/webgpu';
import { groundHeight } from '../../island/terrain.ts';

const wood = new THREE.MeshStandardNodeMaterial({ color: '#b98a55', roughness: 0.85, flatShading: true });
const metal = new THREE.MeshStandardNodeMaterial({ color: '#d4573b', roughness: 0.6, metalness: 0.1 });
const tyre = new THREE.MeshStandardNodeMaterial({ color: '#2b2b2e', roughness: 0.9 });

const AXLE = { y: 0.22, z: -0.62 };
export type BarrowPose = {
  x: number;
  y: number;
  z: number;
  heading: number;
  wobble: number; // 0..1: rocking side to side before it goes
  t: number; // seconds, for the rocking
  tip: number; // -1..1: fallen onto its left or right side
  pour: number; // 0..1: tipped forward over the wheel
};
export type BarrowMesh = {
  root: THREE.Group;
  inner: THREE.Group; // the tray's frame: the load is drawn in it
  pose: (p: BarrowPose) => void;
  lipWorld: (out: THREE.Vector3) => THREE.Vector3; // the front lip of the tray, where a pour leaves
};

function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, rx = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rx;
  mesh.castShadow = true;
  return mesh;
}

export function makeBarrow(): BarrowMesh {
  const root = new THREE.Group();
  const pivot = new THREE.Group(); // at the axle: a pour pitches the whole thing over the wheel
  pivot.position.set(0, AXLE.y, AXLE.z);
  const inner = new THREE.Group();
  inner.position.set(0, -AXLE.y, -AXLE.z);
  root.add(pivot);
  pivot.add(inner);
  // tray: a floor, two sides, a sloped front and a back
  inner.add(box(0.7, 0.05, 0.8, metal, 0, 0.43, -0.05));
  for (const s of [-1, 1]) inner.add(box(0.05, 0.3, 0.8, metal, s * 0.36, 0.6, -0.05));
  inner.add(box(0.72, 0.34, 0.05, metal, 0, 0.6, -0.5, 0.35));
  inner.add(box(0.72, 0.26, 0.05, metal, 0, 0.56, 0.36));
  // handles, legs and the wheel's forks
  for (const s of [-1, 1]) {
    inner.add(box(0.06, 0.06, 1.55, wood, s * 0.3, 0.42, 0.1, -0.12));
    inner.add(box(0.05, 0.36, 0.05, wood, s * 0.27, 0.2, 0.3));
    inner.add(box(0.04, 0.3, 0.04, wood, s * 0.1, 0.32, -0.55, 0.5));
  }
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16).rotateZ(Math.PI / 2), tyre);
  wheel.position.set(0, AXLE.y, AXLE.z);
  wheel.castShadow = true;
  inner.add(wheel);

  let lastX = 0,
    lastZ = 0;
  const pose = (p: BarrowPose) => {
    const fx = -Math.sin(p.heading),
      fz = -Math.cos(p.heading),
      rx = Math.cos(p.heading),
      rz = -Math.sin(p.heading);
    // sit on the ground: pitch from the wheel to the legs, roll from side to side
    const hf = groundHeight(p.x + fx * 0.6, p.z + fz * 0.6),
      hb = groundHeight(p.x - fx * 0.4, p.z - fz * 0.4);
    const hr = groundHeight(p.x + rx * 0.35, p.z + rz * 0.35),
      hl = groundHeight(p.x - rx * 0.35, p.z - rz * 0.35);
    const fall = Math.abs(p.tip);
    const ease = fall < 1 ? 1 - (1 - fall) ** 3 : 1; // fast, then lands
    const rock = Math.sin(p.t * 15) * Math.min(1, p.wobble) * 0.22;
    const roll = Math.atan2(hr - hl, 0.7) + rock + Math.sign(p.tip) * ease * 1.75;
    root.position.set(p.x, Math.max(p.y, (hf + hb) / 2) + Math.sin(ease * Math.PI * 0.5) * 0.28, p.z);
    root.rotation.set(Math.atan2(hf - hb, 1), p.heading, roll, 'YXZ');
    pivot.rotation.x = -p.pour * 0.95; // handles up, over the wheel
    // the wheel turns with the distance travelled
    const d = Math.hypot(p.x - lastX, p.z - lastZ);
    lastX = p.x;
    lastZ = p.z;
    if (d < 1) wheel.rotation.x -= d / 0.22;
  };
  const lipWorld = (out: THREE.Vector3) => {
    root.updateMatrixWorld();
    return inner.localToWorld(out.set(0, 0.62, -0.62));
  };
  return { root, inner, pose, lipWorld };
}
