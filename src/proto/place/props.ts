// The small things in ?proto=place: gold finds along the way, a few places to stop at (protect the moment of discovery: nothing
// here is marked), the boiler by the forge, the telescope on the ridge that points across the sea, and the line of buoys that
// leads out from Far Head to the next island. Local.
import * as THREE from 'three/webgpu';
import { me } from '../../player/player.ts';
import { emit } from '../../render/particles.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { scene } from '../../render/scene.ts';
import { protoCount } from '../count.ts';
import { flat } from '../flat.ts';
import { clank } from '../../render/machine-sfx.ts';
import { draw } from '../net/boxes.ts';
import { H, PATH_SAMPLES, addStatic } from './land.ts';
import { boilerShape } from './chop.ts';
import { pullOut } from './celebrate.ts';
import { job, personalSlice, save } from './job.ts';
import { BUOYS, FAR, FORGE, ORIGIN, SCOPE, lineAt, toWorld, LINES, type LinePoint } from './layout.ts';
import { addFoot } from './sites.ts';
import { staticPart } from './town.ts';
import { bigCargo } from './big-cargo.ts';
import { shelfGroup } from './gifts.ts';

// ---------------------------------------------------------------- small finds on the way
const FIND_SPOTS = [
  ...PATH_SAMPLES.flatMap((path, n) =>
    [0.2, 0.47, 0.82].map((f, k) => {
      const q = path[Math.floor(path.length * f)]!,
        side = k % 2 ? 4.5 : -4.5;
      const x = toWorld(q[0] + side),
        z = q[1] + (k % 2 ? 1 : -1);
      return { id: n * 10 + k, x, z, y: H(x, z) + 1 };
    }),
  ),
  // On Far Head: something for the long way out.
  ...[
    [350, -150],
    [420, -160],
    [392, -226],
  ].map(([x, z], k) => ({ id: 50 + k, x: toWorld(x!), z: z!, y: H(toWorld(x!), z!) + 1 })),
];
const found: number[] = [];
const findGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 8).rotateX(Math.PI / 2);
const findMat = new THREE.MeshStandardNodeMaterial({
  color: '#ffcf33',
  roughness: 0.35,
  metalness: 0.4,
  emissive: '#7a5a08',
});
function trinket() {
  const m = new THREE.Mesh(findGeo, findMat);
  // A raised crossed stamp reads as worked brass, rather than another crystal.
  for (const angle of [-0.6, 0.6]) {
    const stamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.025), flat('#79501e'));
    stamp.position.z = 0.055;
    stamp.rotation.z = angle;
    m.add(stamp);
  }
  return m;
}
const findMeshes = FIND_SPOTS.map((f) => {
  const m = trinket();
  m.position.set(f.x, f.y, f.z);
  m.castShadow = true;
  scene.add(m);
  return m;
});
// A small pinned board beside the specimens; existing personal find IDs fill it.
const findBoard = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 0.12), flat('#493b2c'));
findBoard.position.set(3.6, 1.55, -0.2);
shelfGroup.add(findBoard);
const displayedFinds = FIND_SPOTS.map((f, k) => {
  const m = trinket();
  m.scale.setScalar(0.42);
  m.position.set(((k % 3) - 1) * 0.44, 0.8 - Math.floor(k / 3) * 0.43, 0.1);
  m.visible = false;
  findBoard.add(m);
  return { id: f.id, m };
});
const drawFinds = () => displayedFinds.forEach(({ id, m }) => (m.visible = found.includes(id)));
const sparkle = new THREE.Color('#ffe08a');
export function updateFinds(dt: number) {
  const b = me.body;
  FIND_SPOTS.forEach((f, k) => {
    const m = findMeshes[k]!;
    if (found.includes(f.id)) return void (m.visible = false);
    m.visible = true;
    m.rotation.y += dt * 2;
    if (!b || Math.hypot(b.position.x - f.x, b.position.z - f.z) > 2.2) return;
    if (Math.abs(b.position.y - f.y) > 3) return;
    found.push(f.id);
    clank(f.x, f.z);
    drawFinds();
    protoCount('finds');
    for (let n = 0; n < 14; n++) {
      const a = (n / 14) * Math.PI * 2;
      emit({
        x: f.x,
        y: f.y,
        z: f.z,
        vx: Math.cos(a) * 3.2,
        vy: 3 + (n % 3),
        vz: Math.sin(a) * 3.2,
        life: 0.8,
        size: 0.3,
        color: sparkle,
        intensity: readableIntensity(),
        gravity: 7,
        shrink: 0.4,
      });
    }
    save();
  });
}
export const clearFinds = () => {
  found.length = 0;
  drawFinds();
};
personalSlice('goldFinds', {
  get: () => found.slice(),
  set: (v) => {
    found.length = 0;
    if (Array.isArray(v)) for (const f of FIND_SPOTS) if (v.includes(f.id)) found.push(f.id);
    drawFinds();
  },
});

// ---------------------------------------------------------------- a few places to stop at
// Greybox: a lookout over the gorge, an old cart, a rock arch the path goes through. Solid, all of it.
function buildStops() {
  const rock = '#9a9184',
    wood = '#7f5630';
  const row = (x: number, z: number, w: number, h: number, d: number, color: string, y = 0, yaw = 0) => ({
    kind: 'stop',
    x: toWorld(x),
    z,
    y,
    w,
    h,
    d,
    yaw,
    color,
  });
  const rows = [
    // an arch on the commons, north path
    row(-146.5, -70, 3, 6.5, 3.4, rock),
    row(-137.5, -70, 3, 7.2, 3.4, rock),
    row(-142, -70, 13, 2.2, 4, rock, 6.5, 0.05),
    // a lookout on the rim
    row(-104, -122, 5, 0.3, 2.2, wood, 0.6),
    row(-106, -122, 0.3, 0.6, 2, wood),
    row(-102, -122, 0.3, 0.6, 2, wood),
    row(-110, -128, 0.25, 6, 0.25, wood),
    row(-109.1, -128, 1.6, 0.9, 0.08, '#f0752c', 5),
    // an old cart at the bank, south path
    row(-68, 150, 2.4, 1, 4, wood, 0.5, 0.5),
    row(-69.5, 148, 0.3, 1.2, 1.2, '#3a302c'),
    row(-66.5, 152, 0.3, 1.2, 1.2, '#3a302c'),
    // an arch at the far shoulder, east path
    row(16, 156, 3, 6, 3.2, rock),
    row(25, 164, 3, 7, 3.2, rock),
    row(20.5, 160, 13.5, 2.2, 3.8, rock, 6.2, -0.72),
  ];
  const part = staticPart(rows);
  draw(part, () => 1);
  for (const r of rows) {
    const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r.yaw);
    addStatic(
      { kind: 'box', hx: r.w / 2, hy: r.h / 2, hz: r.d / 2 },
      { x: r.x, y: H(r.x, r.z) + r.y + r.h / 2, z: r.z },
      q,
    );
    addFoot(r.x, r.z, r.yaw, r.w / 2 + 0.2, r.d / 2 + 0.2);
  }
}
buildStops();

// ---------------------------------------------------------------- the boiler by the forge
// On the open apron beside the rail rack, visible from the return track rather than behind the forge.
const BX = toWorld(FORGE.x + 6),
  BZ = FORGE.z + 8.4;
const BY = H(BX, BZ);
const boiler = boilerShape();
boiler.position.set(BX, BY + 0.55, BZ);
boiler.visible = false;
scene.add(boiler);
export const boilerAt = () => {
  const p = bigCargo.boiler.ground;
  return p ? { x: p.x, y: p.y + 1.4, z: p.z } : { x: BX, y: BY + 1.4, z: BZ };
};
/** Each frame: it stands there while it's waiting. */
export const updateBoiler = () => {
  boiler.visible = job.boiler === 1;
  const p = boilerAt();
  boiler.position.set(p.x, p.y - 0.85, p.z);
  boiler.rotation.y = bigCargo.boiler.ground?.yaw ?? 0;
};

// ---------------------------------------------------------------- what points at the next island
// A big brass telescope on the ridge's top, aimed at the shard. Look through it and you see where this is all going.
const SX = toWorld(SCOPE.x),
  SZ = SCOPE.z,
  SY = H(SX, SZ);
const toFarX = FAR.x + ORIGIN.x - SX,
  toFarZ = FAR.z + ORIGIN.z - SZ,
  toFarYaw = Math.atan2(toFarX, toFarZ);
{
  const g = new THREE.Group();
  g.position.set(SX, SY, SZ);
  const brass = flat('#d9a23a', 0.3);
  const leg = flat('#7f5630');
  for (const a of [0, 2.1, 4.2]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), leg);
    l.position.set(Math.sin(a) * 0.55, 1.15, Math.cos(a) * 0.55);
    l.rotation.set(Math.cos(a) * -0.42, 0, Math.sin(a) * 0.42);
    l.castShadow = true;
    g.add(l);
  }
  const tube = new THREE.Group();
  tube.position.y = 2.45;
  tube.rotation.y = toFarYaw;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.8, 12).rotateX(Math.PI / 2), brass);
  barrel.rotation.x = -0.12;
  barrel.position.z = 0.5;
  barrel.castShadow = true;
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 10).rotateX(Math.PI / 2), flat('#3a3d44'));
  eye.position.set(0, 0.12, -1);
  tube.add(barrel, eye);
  g.add(tube);
  scene.add(g);
  addStatic({ kind: 'cylinder', rTop: 0.6, rBottom: 0.6, h: 2.6, segments: 6 }, { x: SX, y: SY + 1.3, z: SZ });
  addFoot(SX, SZ, 0, 0.8, 0.8);
}
export const SCOPE_AT = new THREE.Vector3(SX, SY + 2.4, SZ);
const v1 = new THREE.Vector3(),
  v2 = new THREE.Vector3(),
  v3 = new THREE.Vector3();
/** A look through it: the view flies out along the barrel to the shard, and any input brings you back. */
export function lookThrough() {
  const d = Math.hypot(toFarX, toFarZ);
  v1.set(SX + (toFarX / d) * 40, SY + 28, SZ + (toFarZ / d) * 40);
  v2.set(SX + (toFarX / d) * 400, 90, SZ + (toFarZ / d) * 400);
  v3.set(FAR.x + ORIGIN.x + 10, 130, FAR.z + ORIGIN.z);
  pullOut(v1, v2, v3, 5);
  protoCount('looks');
}

// A line of orange buoys out from Far Head's north shore, bobbing, straight at the shard. Plain as a pointing finger.
const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
const buoyGeo = new THREE.ConeGeometry(0.9, 2.4, 7);
const buoys = new THREE.InstancedMesh(buoyGeo, flat('#ff7a1a', 0.5), BUOYS.n);
const buoyTops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 8, 6), flat('#fff0c9', 0.5), BUOYS.n);
buoys.castShadow = true;
buoys.frustumCulled = buoyTops.frustumCulled = false;
scene.add(buoys, buoyTops);
const buoyAt: { x: number; z: number }[] = [];
{
  lineAt(LINES.east, LINES.east.len, P);
  const x0 = P.x + ORIGIN.x,
    z0 = P.z + ORIGIN.z,
    dx = FAR.x + ORIGIN.x - x0,
    dz = FAR.z + ORIGIN.z - z0,
    d = Math.hypot(dx, dz);
  for (let k = 0; k < BUOYS.n; k++) {
    const u = (k + 0.6) * BUOYS.gap;
    buoyAt.push({ x: x0 + (dx / d) * u, z: z0 + (dz / d) * u });
  }
}
const bo = new THREE.Object3D();
export function updateBuoys(now: number) {
  buoyAt.forEach((q, k) => {
    const up = Math.sin(now * 0.0012 + k * 1.3) * 0.25;
    bo.position.set(q.x, 0.7 + up, q.z);
    bo.rotation.set(Math.sin(now * 0.0009 + k) * 0.08, 0, Math.cos(now * 0.0011 + k) * 0.08);
    bo.updateMatrix();
    buoys.setMatrixAt(k, bo.matrix);
    bo.position.y += 1.45;
    bo.updateMatrix();
    buoyTops.setMatrixAt(k, bo.matrix);
  });
  buoys.instanceMatrix.needsUpdate = buoyTops.instanceMatrix.needsUpdate = true;
}
