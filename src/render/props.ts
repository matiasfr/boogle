import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { bool, dot, fract, positionView, screenCoordinate, uniform, vec2 } from 'three/tsl';
import { trunkPoints, type Placement } from '../blueprints/blueprint.ts';
import { isHomePalm, TRUNK_SEGMENTS, type BroadleafLook, type PalmLook, type RockLook } from '../blueprints/props.ts';
import { placements, tileKey } from '../entities/props/state.ts';
import { clearedAt } from '../island/layout.ts';
import { mulberry32 } from '../math.ts';
import { defineKind, spawn } from '../entity/entity.ts';
import { freezeStatic } from './instances.ts';

// Concatenate many small vertex-colored geometries into one draw call (POIs use these too).
export function addPart(
  parts: THREE.BufferGeometry[],
  geo: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  color: THREE.ColorRepresentation,
) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(matrix);
  const c = new THREE.Color(color);
  const n = g.attributes.position!.count;
  const col = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    col[k * 3] = c.r;
    col[k * 3 + 1] = c.g;
    col[k * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  parts.push(g);
}
export function mergeParts(parts: THREE.BufferGeometry[]) {
  let total = 0;
  for (const g of parts) total += g.attributes.position!.count;
  const pos = new Float32Array(total * 3),
    nrm = new Float32Array(total * 3),
    col = new Float32Array(total * 3);
  let off = 0;
  for (const g of parts) {
    pos.set(g.attributes.position!.array, off * 3);
    nrm.set(g.attributes.normal!.array, off * 3);
    col.set(g.attributes.color!.array, off * 3);
    off += g.attributes.position!.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

const propsMat = new MeshStandardNodeMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
// Metres from the lens inside which props dither away, so a chase camera can pass a crown or a rock without a screenful
// of leaves (the soapbox sets it while seated). 0 keeps every fragment.
export const propsNearFade = uniform(0);
// The fade costs a discard on every prop fragment (and so early depth rejection), so props have no mask until a
// prototype that uses it asks for one. Shadows are never touched.
export function enablePropsNearFade() {
  // interleaved gradient noise: stable per pixel, so the fade doesn't sparkle
  const noise = fract(fract(dot(screenCoordinate.xy, vec2(0.06711056, 0.00583715))).mul(52.9829189));
  propsMat.maskNode = positionView.length().greaterThan(noise.add(0.3).mul(propsNearFade));
  propsMat.maskShadowNode = bool(true);
  propsMat.needsUpdate = true;
}
// Non-indexed already, so addPart only clones them.
const trunkGeo = new THREE.CylinderGeometry(0.8, 1, 1, 7).toNonIndexed();
const frondGeo = new THREE.ConeGeometry(0.55, 3.3, 4, 1).translate(0, 1.65, 0).toNonIndexed();
const blobGeo = new THREE.IcosahedronGeometry(1, 0); // rocks and leafy crowns
const m = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  up = new THREE.Vector3(0, 1, 0),
  sc = new THREE.Vector3(1, 1, 1);

// A leaning palm: trunk segments, fronds.
function addPalm(parts: THREE.BufferGeometry[], p: Placement<PalmLook>) {
  const segments = TRUNK_SEGMENTS;
  const joints = trunkPoints(p.x, p.h, p.z, p.lean!, segments).map((j) => new THREE.Vector3(j.x, j.y, j.z));
  for (let k = 0; k < segments; k++) {
    const prev = joints[k]!,
      next = joints[k + 1]!;
    const dir = next.clone().sub(prev);
    const len = dir.length();
    const r = 0.27 - 0.1 * (k / segments);
    q.setFromUnitVectors(up, dir.normalize());
    m.compose(prev.clone().lerp(next, 0.5), q, sc.set(r, len * 1.05, r));
    addPart(parts, trunkGeo, m, k % 2 ? '#9a6a3e' : '#80552d');
  }
  const top = joints[segments]!;
  p.look!.fronds.forEach(({ angle, droop }, k) => {
    const mm = new THREE.Matrix4()
      .makeTranslation(top.x, top.y, top.z)
      .multiply(new THREE.Matrix4().makeRotationY(angle))
      .multiply(new THREE.Matrix4().makeRotationZ(-(Math.PI / 2 + droop)))
      .multiply(new THREE.Matrix4().makeScale(0.16, 1, 1));
    addPart(parts, frondGeo, mm, k % 2 ? '#3f9b3a' : '#57b845');
  });
}

// A round-crowned meadow tree: short trunk, a few leafy blobs.
function addBroadleaf(parts: THREE.BufferGeometry[], { x, h, z, look }: Placement<BroadleafLook>) {
  const { height, crown, blobs } = look!;
  m.compose(new THREE.Vector3(x, h + height / 2 - 0.2, z), q.identity(), sc.set(0.22, height + 0.4, 0.22));
  addPart(parts, trunkGeo, m, '#7a5232');
  const greens = ['#4f9a3a', '#5fae43', '#468a35'];
  blobs.forEach(({ angle, spin }, k) => {
    const d = k === 0 ? 0 : crown * 0.55;
    const r = crown * (k === 0 ? 1 : 0.72);
    q.setFromEuler(new THREE.Euler(spin[0], spin[1], spin[2]));
    m.compose(
      new THREE.Vector3(x + Math.cos(angle) * d, h + height + crown * 0.5 + (k ? -0.2 : 0.3), z + Math.sin(angle) * d),
      q,
      sc.set(r, r * 0.85, r),
    );
    addPart(parts, blobGeo, m, greens[k]!);
  });
}

function addRock(parts: THREE.BufferGeometry[], { x, h, z, size, look }: Placement<RockLook>) {
  const r = size!;
  q.setFromEuler(new THREE.Euler(look!.spin[0], look!.spin[1], look!.spin[2]));
  m.compose(new THREE.Vector3(x, h + r * 0.15, z), q, sc.set(r * 1.1, r * 0.75, r));
  addPart(parts, blobGeo, m, look!.dark ? '#8a857c' : '#a19b90');
}

// Scenery that never moves, as one entity with no methods. Its colliders are the `props` entity (src/entities/props/).
defineKind('props-view', {});
export function createProps() {
  const tiles = new Map<number, THREE.BufferGeometry[]>();
  for (const p of placements) {
    if (clearedAt(p.x, p.z) && !isHomePalm(p)) continue;
    const k = tileKey(p.x, p.z);
    if (!tiles.has(k)) tiles.set(k, []);
    const parts = tiles.get(k)!;
    if (p.blueprint === 'palm') addPalm(parts, p);
    else if (p.blueprint === 'broadleaf') addBroadleaf(parts, p);
    else addRock(parts, p);
  }
  const group = new THREE.Group();
  for (const parts of tiles.values()) {
    const mesh = new THREE.Mesh(mergeParts(parts), propsMat);
    mesh.geometry.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  spawn({ kind: 'props-view', mesh: group });
  freezeStatic(group); // never moves: no per-frame matrix work
}

// update -190, after the camera (player.ts, -200), before the feature update hooks (src/loop.ts lists the orders).
defineKind('cloud', { update: -190 });
export const clouds: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>[] = [];
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
    const parts: THREE.BufferGeometry[] = [];
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
    spawn({
      kind: 'cloud',
      mesh,
      update({ dt }) {
        mesh.position.x += dt * 1.2;
        if (mesh.position.x > 340) mesh.position.x = -340;
      },
    });
    clouds.push(mesh);
  }
}
