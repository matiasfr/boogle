// The first 24 pieces stay loose. Every eight after that make one strapped package, with the remainder on top.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { OwnedView } from '../../render/owned-view.ts';
import { flat } from '../../render/flat.ts';
import { LOOK, paint, STEEL } from '../../place/look.ts';
import { kitLogs, kitBatch } from '../../place/look-kit.ts';
import { loadAsset } from '../../render/assets.ts';
import kitUrl from '../../../assets/built/place-kit.glb?url';

/** The depot's own prepared geometry, including the log's painted ends. Both batches borrow the loaded kit. */
export async function stockKit(owner: OwnedView) {
  if (!LOOK.kit) return null;
  await loadAsset(kitUrl);
  const logs = kitLogs(1, owner),
    rails = kitBatch('rail', STEEL, 1, owner);
  const shapes = { log: logs.geometry, rail: rails.geometry };
  logs.dispose();
  rails.dispose();
  return shapes;
}

export type YardKind = 0 | 1 | 2;
const colors = ['#986139', '#aaa698', '#576474'] as const;
const height = [0.2, 0.25, 0.12] as const;

export function yardStock(
  owner: OwnedView,
  base: THREE.Vector3,
  yaw: number,
  kind: YardKind,
  kit: Awaited<ReturnType<typeof stockKit>>,
) {
  const group = new THREE.Group();
  group.position.copy(base);
  group.rotation.y = yaw;
  owner.add(group);
  const h = height[kind];
  const source = kit && (kind === 0 ? kit.log : kind === 2 ? kit.rail : null);
  const piece = source
    ? source.clone()
    : kind === 0
      ? new THREE.CylinderGeometry(0.098, 0.098, 1.06, 8).rotateX(Math.PI / 2)
      : kind === 1
        ? new THREE.DodecahedronGeometry(0.145)
        : new THREE.BoxGeometry(0.17, h, 1.25);
  if (source) {
    if (kind === 0) piece.rotateY(Math.PI / 2);
    piece.center();
    piece.computeBoundingBox();
    const size = piece.boundingBox!.getSize(new THREE.Vector3());
    piece.scale((kind === 0 ? 0.196 : 0.17) / size.x, h / size.y, (kind === 0 ? 1.06 : 1.25) / size.z);
  }
  const material = source
    ? kind === 0
      ? paint({ color: '#ffffff', own: true, rough: 0.9 })
      : paint(STEEL)
    : flat(colors[kind]);
  const stone = kind === 1;
  const width = stone ? 0.3 : 0.23;
  // A lifted bundle has four pieces across, two deep for stone or two courses for timber and rails.
  const bit = (i: number, out: THREE.Vector3) =>
    out.set(
      ((i % 4) - 1.5) * width,
      h * (0.5 + (stone ? 0 : Math.floor(i / 4))),
      stone ? (Math.floor(i / 4) - 0.5) * width : 0,
    );
  const v = new THREE.Vector3();
  const parts = Array.from({ length: 8 }, (_, i) => {
    bit(i, v);
    return piece.clone().translate(v.x, v.y, v.z);
  });
  const packageGeo = mergeGeometries(parts)!;
  for (const part of parts) part.dispose();
  const bh = stone ? h : 2 * h;
  const straps = [-1, 1].map((side) =>
    new THREE.BoxGeometry(4 * width, bh + 0.018, 0.048).translate(0, bh / 2, side * (stone ? 0.15 : 0.32)),
  );
  const strapGeo = mergeGeometries(straps)!;
  for (const strap of straps) strap.dispose();
  const batch = (geometry: THREE.BufferGeometry, mat: THREE.Material) => {
    let mesh: THREE.InstancedMesh | undefined;
    owner.cleanup(() => {
      mesh?.dispose();
      geometry.dispose();
    });
    return (count: number, slot: (i: number) => THREE.Vector3) => {
      if (!mesh && !count) return;
      if (!mesh || mesh.instanceMatrix.count < count) {
        mesh?.removeFromParent();
        mesh?.dispose();
        mesh = new THREE.InstancedMesh(geometry, mat, 2 ** Math.ceil(Math.log2(Math.max(1, count))));
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
      }
      mesh.count = count;
      mesh.visible = count > 0;
      for (let i = 0; i < count; i++) mesh.setMatrixAt(i, matrix.makeTranslation(slot(i)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
  };
  const matrix = new THREE.Matrix4();
  const loose = batch(piece, material),
    bundles = batch(packageGeo, material),
    bands = batch(strapGeo, flat('#49382b'));
  const course = stone ? 8 : 4;
  const looseAt = (i: number, packs: number) => {
    bit(i % course, v);
    v.y += Math.floor(i / course) * h + (i >= 24 ? packs * bh : 0);
    return v;
  };
  let drawn = -1;
  function draw(n: number) {
    if (n === drawn) return;
    drawn = n;
    const packs = Math.floor(Math.max(0, n - 24) / 8);
    const packAt = (i: number) => v.set(0, (24 / course) * h + i * bh, 0);
    bundles(packs, packAt);
    // Alternate the binding positions so two adjacent courses still read as two packages.
    bands(packs, (i) => {
      const at = packAt(i);
      at.z = (i % 2 ? 1 : -1) * (stone ? 0.035 : 0.095);
      return at;
    });
    loose(n - 8 * packs, (i) => looseAt(i, packs));
  }
  function point(n: number) {
    const i = Math.max(0, n - 1);
    const packs = Math.floor(Math.max(0, i - 24) / 8);
    return group.localToWorld(looseAt(i - 8 * packs, packs).clone());
  }
  return { draw, point };
}
