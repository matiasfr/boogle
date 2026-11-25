import * as THREE from 'three';
import { ROOM_GROUP } from '../../constants.ts';
import { getMask } from '../../physics/engine.ts';
import { makeCameraArm } from '../../player/camera-arm.ts';
import { camConstraints, me } from '../../player/player.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { addPart, mergeParts } from '../../render/geometry-parts.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import level from '../../../content/built/levels/boogler-hut.json' with { type: 'json' };

// Keep each face together so the near wall and hat roof cut away indoors, as at the forge.
export function standHut(owner: OwnedView, material: THREE.Material, x: number, floor: number, z: number) {
  const faces = new Map<string, THREE.BufferGeometry[]>();
  for (const p of loadLevelArtifact(level, definitions).placements) {
    const at = { ...p, pos: [x + p.pos[0], floor + p.pos[1], z + p.pos[2]] as const };
    const record = instantiate(p.prefab, at, { owner, still: true });
    record.setEnabled(true);
    const face = p.id.startsWith('hat') ? 'roof' : p.pos[2] >= 2 ? 'front' : p.id;
    const parts = faces.get(face) ?? [];
    for (const piece of record.pieces) addPart(parts, piece.geometry, piece.matrix, piece.color);
    faces.set(face, parts);
  }
  const meshes = Array.from(faces, ([face, parts]) => {
    const mesh = new THREE.Mesh(mergeParts(parts), material);
    mesh.castShadow = mesh.receiveShadow = true;
    owner.add(mesh);
    return { face, mesh };
  });
  const arm = makeCameraArm();
  const head = new THREE.Vector3();
  let cut = false;
  const constraint = (_look: THREE.Vector3, pos: THREE.Vector3) => {
    const body = me.body;
    const p = body?.interpolatedPosition;
    const inside = !!p && Math.abs(p.x - x) < 2.5 && Math.abs(p.z - z) < 2.1 && p.y < floor + 3.2;
    if (!inside && !cut) return false;
    cut = inside;
    if (inside && body && p) {
      pos.y = Math.max(pos.y, floor + 0.5);
      arm.solve(head.set(p.x, p.y + 1.35, p.z), pos, getMask(body) & ~ROOM_GROUP);
    } else arm.reset();
    for (const { face, mesh } of meshes) {
      mesh.visible =
        !inside ||
        !(
          face === 'roof' ||
          (face === 'back' && pos.z < z - 1.2) ||
          (face === 'front' && pos.z > z + 1.2) ||
          (face === 'side-1' && pos.x < x - 1.7) ||
          (face === 'side1' && pos.x > x + 1.7)
        );
    }
    return inside;
  };
  camConstraints.push(constraint);
  owner.cleanup(() => camConstraints.splice(camConstraints.indexOf(constraint), 1));
}
