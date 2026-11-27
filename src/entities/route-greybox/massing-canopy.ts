// Canopy's static massing and extras are compiled level placements (src/content/levels/leg3.ts): the isle's beach and
// the bay row's bank, Canopy Town's platforms and deck, the Notch board, and the isle's, islets' and trunks' colliders
// (the horizon draws them). This view reads no progress.
import level from '../../../content/built/levels/canopy.json' with { type: 'json' };
import cleft from '../../../content/built/levels/canopy-cleft.json' with { type: 'json' };
import * as THREE from 'three/webgpu';
import { terrainKitGeometry } from '../terrain-kit/geometry.ts';
import { kitMaterial } from '../../prefab/builders/terrain-kit.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { compiled as records } from '../../prefab/catalogue.ts';
import { leg2Massing, leg2Extras, leg2Placements } from './leg2-draw.ts';
import { AREA_CENTRES, coverNear } from './leg2-layout.ts';
const placements = leg2Massing(level);
export const canopyMassing = () => placements;
export function canopyExtras(owner: OwnedView) {
  void terrainKitGeometry()
    .then((pieces) => {
      if (!owner.alive) return;
      const mesh = new THREE.InstancedMesh(pieces.get('sea_face_10')!, kitMaterial(), cleft.placements.length);
      mesh.name = 'Canopy cleft ledges';
      cleft.placements.forEach((p, i) => {
        const matrix = new THREE.Matrix4().makeRotationY(p.rot[0]!);
        matrix.scale(new THREE.Vector3().fromArray(p.scale)).setPosition(new THREE.Vector3().fromArray(p.pos));
        mesh.setMatrixAt(i, matrix);
      });
      owner.add(mesh);
    })
    .catch((error: unknown) => console.warn('[canopy] cliff kit load failed', error));
  return leg2Extras(owner, level);
}
/** Canopy mounts far enough out to cover every solid of it, the isle, its beach and both chalk islets to their far
 * tips, not the usual 400 m, so a swimmer meets no solid before it exists (dev/level/route-leg3.ts checks it). */
export const canopyNear = coverNear(leg2Placements(level), records.prefabs, AREA_CENTRES.canopy);
/** Canopy isle's ground height at (x, z), or null off it: the leg view's bents and head 2's steps stand on it. */
export { isleGround as canopyGround } from '../../content/levels/leg3.ts';
