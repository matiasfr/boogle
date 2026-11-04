// A handful of rare crystals in ?proto=place, tucked along the routes and at spots worth stopping at, the same blue as the
// shard on the far island (owner: the beacon read as a floating crystal, "a fantasy element in the future, which is cool";
// boogle-2.md, 2 November). You walk through one and it comes to you with a satisfying magnet and a chime, and it takes its
// place in a glowing row on the curio shelf. They do nothing yet. Local.
import * as THREE from 'three/webgpu';
import { emit } from '../../render/particles.ts';
import { scene } from '../../render/scene.ts';
import { me } from '../../player/player.ts';
import { pop } from '../minis/common.ts';
import { H } from './land.ts';
import { toWorld } from './layout.ts';
import { crystalPeg, shelfGroup } from './gifts.ts';

/** On a lookout, through an arch, on a river bank, at the top of the ridge, behind the old kiln, by the old cart, on the far table. */
const SPOTS: [x: number, z: number][] = [
  [-111, -126],
  [-142, -66],
  [-62, -68],
  [-24, -186],
  [-3, -166],
  [-66, 155],
  [122, 88],
];
export const CRYSTALS = SPOTS.length;
const BLUE = '#7fd0ff',
  GLOW = '#58c8ff';
const shape = () => new THREE.OctahedronGeometry(1, 0).scale(0.28, 0.62, 0.28);
const worldMat = new THREE.MeshStandardNodeMaterial({
  color: BLUE,
  emissive: GLOW,
  emissiveIntensity: 1.5,
  roughness: 0.25,
  flatShading: true,
});
const dull = new THREE.MeshStandardNodeMaterial({ color: '#2d3a48', roughness: 0.5, flatShading: true });
const world = new THREE.InstancedMesh(shape(), worldMat, CRYSTALS);
world.frustumCulled = false;
world.castShadow = true;
scene.add(world);
// The shelf's row: dull stubs on their pegs from the start, lit once found.
const row = new THREE.InstancedMesh(shape().scale(0.8, 0.55, 0.8), dull, CRYSTALS);
const lit = new THREE.InstancedMesh(shape().scale(0.8, 0.55, 0.8), worldMat, CRYSTALS);
const pm = new THREE.Matrix4(),
  pv = new THREE.Vector3(),
  pq = new THREE.Quaternion(),
  ps = new THREE.Vector3(),
  sparkle = new THREE.Color('#bfe9ff');
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
for (let k = 0; k < CRYSTALS; k++) row.setMatrixAt(k, pm.makeTranslation(crystalPeg(k, CRYSTALS, pv)));
row.frustumCulled = lit.frustumCulled = false;
lit.count = 0;
shelfGroup.add(row, lit);

const items = SPOTS.map(([x, z]) => {
  const wx = toWorld(x);
  return { x: wx, z, y: H(wx, z) + 1.05, state: 0 as 0 | 1 | 2, t: 0, fx: 0, fy: 0, fz: 0 };
});
/** Found so far, by index, in the order found. */
export const crystals = { found: [] as number[] };
const hudNote: { fn: (n: number) => void } = { fn: () => {} };
export const onCrystal = (fn: (n: number) => void) => void (hudNote.fn = fn);

function drawLit() {
  lit.count = Math.min(lit.instanceMatrix.count, crystals.found.length);
  for (let k = 0; k < lit.count; k++) lit.setMatrixAt(k, pm.makeTranslation(crystalPeg(k, CRYSTALS, pv)));
  lit.instanceMatrix.needsUpdate = true;
  for (let k = 0; k < CRYSTALS; k++)
    row.setMatrixAt(k, k < lit.count ? ZERO : pm.makeTranslation(crystalPeg(k, CRYSTALS, pv)));
  row.instanceMatrix.needsUpdate = true;
}
export function snapCrystals(list: number[]) {
  crystals.found = list.filter((k) => items[k]);
  items.forEach((c, k) => (c.state = crystals.found.includes(k) ? 2 : 0));
  drawLit();
}
function chime(n: number) {
  pop(2 + n, 0.75);
  setTimeout(() => pop(4 + n, 0.7), 70);
  setTimeout(() => pop(7, 0.8), 150);
}
function sparkleAt(x: number, y: number, z: number, n: number, sp: number) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2;
    emit({
      x,
      y,
      z,
      vx: Math.cos(a) * sp,
      vy: (Math.random() - 0.2) * sp * 1.4,
      vz: Math.sin(a) * sp,
      life: 0.7 + Math.random() * 0.5,
      size: 0.15,
      color: sparkle,
      drag: 1,
      gravity: 2,
      shrink: 0.5,
    });
  }
}
const MAGNET = 4.2, // m at which it starts to come to you
  FLY = 0.34;
export function updateCrystals(dt: number, now: number) {
  const b = me.body;
  items.forEach((c, k) => {
    if (c.state === 2) return world.setMatrixAt(k, ZERO);
    let x = c.x,
      y = c.y + Math.sin(now * 0.002 + k) * 0.12,
      z = c.z,
      scale = 1;
    if (c.state === 0 && b) {
      const d = Math.hypot(b.position.x - c.x, b.position.z - c.z);
      if (d < 40 && Math.random() < dt * 1.5) sparkleAt(c.x, c.y, c.z, 1, 0.7);
      if (d < MAGNET && Math.abs(b.position.y - c.y) < 4) {
        c.state = 1;
        c.t = 0;
        c.fx = c.x;
        c.fy = c.y;
        c.fz = c.z;
        pop(1, 0.5);
      }
    } else if (c.state === 1 && b) {
      // Slowly, then all at once.
      c.t += dt / FLY;
      const u = Math.min(1, c.t),
        e = u * u * u;
      const p = b.interpolatedPosition;
      x = c.fx + (p.x - c.fx) * e;
      y = c.fy + (p.y + 0.5 - c.fy) * e + Math.sin(u * Math.PI) * 0.9;
      z = c.fz + (p.z - c.fz) * e;
      scale = 1 - e * 0.5;
      if (Math.random() < 0.6) sparkleAt(x, y, z, 1, 0.5);
      if (u >= 1) {
        c.state = 2;
        crystals.found.push(k);
        drawLit();
        chime(crystals.found.length);
        sparkleAt(p.x, p.y + 0.6, p.z, 26, 3.6);
        hudNote.fn(crystals.found.length);
      }
    }
    pq.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, now * 0.0011 + k + (c.state === 1 ? c.t * 9 : 0));
    world.setMatrixAt(k, pm.compose(pv.set(x, y, z), pq, ps.setScalar(scale)));
  });
  world.instanceMatrix.needsUpdate = true;
}
/** For the panel and the evals: the k-th crystal's spot. */
export const crystalAt = (k: number) => items[k]!;
