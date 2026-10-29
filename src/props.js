import * as THREE from 'three';
import { SPAWN, COURT, CELL, HALF } from './constants.js';
import { PATCH } from './sim/mushrooms.js';
import { mulberry32 } from './math.js';
import { groundHeight } from './terrain.js';
import { scene } from './scene.js';
import { addStaticSpheres } from './physics.js';

// Concatenate many small vertex-colored geometries into one draw call.
function addPart(parts, geo, matrix, color) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(matrix);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    col[k * 3] = c.r;
    col[k * 3 + 1] = c.g;
    col[k * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  parts.push(g);
}
function mergeParts(parts) {
  let total = 0;
  for (const g of parts) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3),
    nrm = new Float32Array(total * 3),
    col = new Float32Array(total * 3);
  let off = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, off * 3);
    nrm.set(g.attributes.normal.array, off * 3);
    col.set(g.attributes.color.array, off * 3);
    off += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

// Footprints of trees and rocks ({ x, z, r } on the ground plane), for things that walk around them.
export const obstacles = [];

export function createProps() {
  const rng = mulberry32(20261028);
  const parts = [];
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0),
    s = new THREE.Vector3(1, 1, 1);
  const trees = [];
  const gx0 = PATCH.i0 * CELL - HALF - 6,
    gx1 = (PATCH.i0 + PATCH.w) * CELL - HALF + 3,
    gz0 = HALF - (PATCH.j0 + PATCH.h) * CELL - 3,
    gz1 = HALF - PATCH.j0 * CELL + 4;
  const clear = (x, z, r) =>
    Math.hypot(x - SPAWN.x, z - SPAWN.z) > r &&
    Math.hypot(x - COURT.x, z - COURT.z) > COURT.r + 3 &&
    !(x > gx0 && x < gx1 && z > gz0 && z < gz1);
  for (let tries = 0; tries < 900 && trees.length < 36; tries++) {
    const x = (rng() * 2 - 1) * 62,
      z = (rng() * 2 - 1) * 58;
    const h = groundHeight(x, z);
    if (h < 0.9 || h > 6.5 || !clear(x, z, 9)) continue;
    if (Math.abs(groundHeight(x + 1, z) - h) > 0.7 || Math.abs(groundHeight(x, z + 1) - h) > 0.7) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 4.5)) continue;
    trees.push({ x, z, h });
    obstacles.push({ x, z, r: 0.5 });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.8, 1, 1, 7);
  const frondGeo = new THREE.ConeGeometry(0.55, 3.3, 4, 1).translate(0, 1.65, 0);
  const nutGeo = new THREE.IcosahedronGeometry(0.2, 0);
  for (const t of trees) {
    const lean = rng() * Math.PI * 2,
      leanAmt = 0.18 + rng() * 0.3,
      height = 4.4 + rng() * 2.2;
    const colliders = [];
    let prev = new THREE.Vector3(t.x, t.h - 0.3, t.z);
    const segs = 7;
    for (let k = 0; k < segs; k++) {
      const f = (k + 1) / segs;
      const off = leanAmt * f * f * height;
      const next = new THREE.Vector3(t.x + Math.cos(lean) * off, t.h + f * height, t.z + Math.sin(lean) * off);
      const dir = next.clone().sub(prev);
      const len = dir.length();
      const r = 0.27 - 0.1 * (k / segs);
      q.setFromUnitVectors(up, dir.normalize());
      m.compose(prev.clone().lerp(next, 0.5), q, s.set(r, len * 1.05, r));
      addPart(parts, trunkGeo, m, k % 2 ? '#9a6a3e' : '#80552d');
      colliders.push({ x: prev.x, y: prev.y + 0.25, z: prev.z, r: 0.32 });
      prev = next;
    }
    const top = prev;
    const fronds = 7 + Math.floor(rng() * 2);
    for (let k = 0; k < fronds; k++) {
      const ang = (k / fronds) * Math.PI * 2 + rng() * 0.4;
      const droop = 0.25 + rng() * 0.45;
      const mm = new THREE.Matrix4()
        .makeTranslation(top.x, top.y, top.z)
        .multiply(new THREE.Matrix4().makeRotationY(ang))
        .multiply(new THREE.Matrix4().makeRotationZ(-(Math.PI / 2 + droop)))
        .multiply(new THREE.Matrix4().makeScale(0.16, 1, 1));
      addPart(parts, frondGeo, mm, k % 2 ? '#3f9b3a' : '#57b845');
    }
    for (let k = 0; k < 3; k++) {
      const a = rng() * Math.PI * 2;
      addPart(
        parts,
        nutGeo,
        m.makeTranslation(top.x + Math.cos(a) * 0.25, top.y - 0.25, top.z + Math.sin(a) * 0.25),
        '#6b4423',
      );
    }
    addStaticSpheres(colliders);
  }

  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  let rocks = 0;
  for (let tries = 0; tries < 600 && rocks < 22; tries++) {
    const x = (rng() * 2 - 1) * 60,
      z = (rng() * 2 - 1) * 56;
    const h = groundHeight(x, z);
    if (h < -1.2 || h > 8 || !clear(x, z, 8)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 3)) continue;
    const r = 0.6 + rng() * 1.3;
    q.setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3));
    m.compose(new THREE.Vector3(x, h + r * 0.15, z), q, s.set(r * 1.1, r * 0.75, r));
    addPart(parts, rockGeo, m, rng() < 0.5 ? '#a19b90' : '#8a857c');
    addStaticSpheres([{ x, y: h + r * 0.1, z, r: r * 0.82 }]);
    obstacles.push({ x, z, r: r * 0.95 });
    rocks++;
  }

  const props = new THREE.Mesh(
    mergeParts(parts),
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }),
  );
  props.castShadow = true;
  props.receiveShadow = true;
  scene.add(props);
}

export const clouds = [];
export function createClouds() {
  const rng = mulberry32(77);
  const puff = new THREE.IcosahedronGeometry(1, 1);
  const mat = new THREE.MeshLambertMaterial({
    color: '#ffffff',
    emissive: '#d8ecff',
    emissiveIntensity: 0.45,
    flatShading: true,
  });
  for (let c = 0; c < 9; c++) {
    const parts = [];
    const m = new THREE.Matrix4();
    for (let k = 0; k < 5; k++) {
      const r = 5 + rng() * 6;
      m.compose(
        new THREE.Vector3((k - 2) * 6 + rng() * 3, rng() * 3, rng() * 6 - 3),
        new THREE.Quaternion(),
        new THREE.Vector3(r, r * 0.6, r),
      );
      addPart(parts, puff, m, '#ffffff');
    }
    const mesh = new THREE.Mesh(mergeParts(parts), mat);
    const a = rng() * Math.PI * 2,
      d = 140 + rng() * 180;
    mesh.position.set(Math.cos(a) * d, 55 + rng() * 35, Math.sin(a) * d);
    scene.add(mesh);
    clouds.push(mesh);
  }
}

export function updateClouds(dt) {
  for (const c of clouds) {
    c.position.x += dt * 1.2;
    if (c.position.x > 340) c.position.x = -340;
  }
}
