import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { gorgeSurfaces } from './gorge-surfaces.ts';
// Static massing uses compiled placements. GreyBox/span remain only for the dynamic leg's descriptor API.
import type { OwnedView } from '../../render/owned-view.ts';
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import type { Placement } from '../../prefab/types.ts';
import { compiled } from '../../prefab/catalogue.ts';

export type GreyBox = {
  x: number;
  y: number;
  z: number;
  /** Across, up and along (its local x, y, z), metres. */
  w: number;
  h: number;
  d: number;
  yaw: number;
  /** Radians about its local x: positive lifts its +z end. */
  pitch?: number;
  colour?: string;
  solid?: boolean;
  hidden?: boolean;
};

/** A box between two points (the middle of its top face runs from `a` to `b`), `w` wide and `h` thick. */
export function span(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  w: number,
  h: number,
  colour: string,
  solid = true,
): GreyBox {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    dy = b.y - a.y,
    run = Math.hypot(dx, dz),
    pitch = Math.atan2(dy, run);
  return {
    x: (a.x + b.x) / 2,
    // The top face passes through a and b: the centre is half a thickness down its own normal.
    y: (a.y + b.y) / 2 - (h / 2) * Math.cos(pitch),
    z: (a.z + b.z) / 2,
    w,
    h,
    d: Math.hypot(run, dy),
    yaw: Math.atan2(dx, dz),
    pitch,
    colour,
    solid,
  };
}

/** Draw all visible records in one shared batch, preserving body and instance insertion order. */
export async function drawGreyBoxes(owner: OwnedView, placements: readonly Placement[]) {
  const slots = (p: Placement) => {
    const visual = compiled.prefabs[p.prefab]!.visual;
    return 'builder' in visual ? (visual.instances?.length ?? 1) : 0;
  };
  const count = placements.reduce((n, p) => n + slots(p), 0);
  const batch = createPrefabBatch('greybox.box', Math.max(1, count), owner);
  batch.mesh.count = count;
  let solids = 0,
    index = 0;
  for (const p of placements) {
    const instance = instantiate(p.prefab, p, {
      owner,
      ...(slots(p) ? { batch: { target: batch, index } } : {}),
    });
    index += slots(p);
    instance.setEnabled(true);
    solids += instance.bodies.length;
  }
  const trimmed = gorgeSurfaces(placements);
  if (trimmed.size) {
    // Preserve the instance records and physics exactly; render their clipped exterior
    // as one vertex-coloured draw under the same owner instead of duplicate faces.
    const pieces: THREE.BufferGeometry[] = [];
    let slot = 0;
    for (const p of placements) {
      for (let part = 0; part < slots(p); part++) {
        const source = trimmed.get(p.id) ?? new THREE.BoxGeometry(1, 1, 1);
        const geometry = source.index ? source.toNonIndexed() : source.clone();
        const matrix = new THREE.Matrix4();
        batch.mesh.getMatrixAt(slot, matrix);
        geometry.applyMatrix4(matrix);
        const colour = new THREE.Color();
        batch.mesh.getColorAt(slot++, colour);
        const colours = new Float32Array(geometry.getAttribute('position').count * 3);
        for (let i = 0; i < colours.length; i += 3) colours.set(colour.toArray(), i);
        geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
        geometry.deleteAttribute('uv');
        pieces.push(geometry);
        if (!trimmed.has(p.id)) source.dispose();
      }
    }
    const geometry = mergeGeometries(pieces);
    if (!geometry) throw new Error('Gorge clipped surfaces have incompatible attributes');
    const mat = (batch.mesh.material as THREE.MeshStandardNodeMaterial).clone();
    mat.vertexColors = true;
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = 'gorge:trimmed-surfaces';
    mesh.receiveShadow = batch.mesh.receiveShadow;
    mesh.castShadow = batch.mesh.castShadow;
    owner.add(mesh);
    owner.cleanup(() => mat.dispose());
    batch.mesh.visible = false;
    geometry.dispose();
    for (const piece of pieces) piece.dispose();
    for (const source of trimmed.values()) source.dispose();
  }
  batch.mesh.computeBoundingBox();
  batch.mesh.computeBoundingSphere();
  return { mesh: batch.mesh, solids };
}
