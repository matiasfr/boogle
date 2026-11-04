// Pure scenery geometry, shared by the world and isolated asset previews.
import * as THREE from 'three';
import { trunkPoints } from '../blueprints/blueprint.ts';
import { TRUNK_SEGMENTS, type PropPlacement } from '../blueprints/props.ts';
import { addPart } from './geometry-parts.ts';

// Non-indexed already, so addPart only clones them.
const trunkGeo = new THREE.CylinderGeometry(0.8, 1, 1, 7).toNonIndexed();
const frondGeo = new THREE.ConeGeometry(0.55, 3.3, 4, 1).translate(0, 1.65, 0).toNonIndexed();
const blobGeo = new THREE.IcosahedronGeometry(1, 0); // rocks and leafy crowns
const m = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  up = new THREE.Vector3(0, 1, 0),
  sc = new THREE.Vector3(1, 1, 1);

type Palm = PropPlacement & { blueprint: 'palm' };
type Broadleaf = PropPlacement & { blueprint: 'broadleaf' };
type Rock = PropPlacement & { blueprint: 'rock' };

// A leaning palm: trunk segments, fronds.
export function addPalm(parts: THREE.BufferGeometry[], p: Palm) {
  const segments = TRUNK_SEGMENTS;
  const joints = trunkPoints(p.x, p.h, p.z, p.lean, segments).map((j) => new THREE.Vector3(j.x, j.y, j.z));
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
  p.look.fronds.forEach(({ angle, droop }, k) => {
    const mm = new THREE.Matrix4()
      .makeTranslation(top.x, top.y, top.z)
      .multiply(new THREE.Matrix4().makeRotationY(angle))
      .multiply(new THREE.Matrix4().makeRotationZ(-(Math.PI / 2 + droop)))
      .multiply(new THREE.Matrix4().makeScale(0.16, 1, 1));
    addPart(parts, frondGeo, mm, k % 2 ? '#3f9b3a' : '#57b845');
  });
}

// A round-crowned meadow tree: short trunk, a few leafy blobs.
export function addBroadleaf(parts: THREE.BufferGeometry[], { x, h, z, look }: Broadleaf) {
  const { height, crown, blobs } = look;
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

export function addRock(parts: THREE.BufferGeometry[], { x, h, z, size: r, look }: Rock) {
  q.setFromEuler(new THREE.Euler(look.spin[0], look.spin[1], look.spin[2]));
  m.compose(new THREE.Vector3(x, h + r * 0.15, z), q, sc.set(r * 1.1, r * 0.75, r));
  addPart(parts, blobGeo, m, look.dark ? '#8a857c' : '#a19b90');
}

export const propModels = { palm: addPalm, broadleaf: addBroadleaf, rock: addRock };
