// The canyon kit's records (content/prefabs/terrain.ts): one instance batch per piece of assets/built/terrain-kit.glb,
// all in one rock material. The view that places them (src/entities/terrain-kit/view.ts) loads the file and hands its
// pieces here with `setTerrainKit` before it creates a batch; this module never fetches, so Node's record checks can
// import it. Local and cosmetic.
import * as THREE from 'three/webgpu';
import { max, mix, normalWorldGeometry, positionWorld, vec3, vertexColor } from 'three/tsl';
import { registerBuilder } from '../builders.ts';
import { rockLayers } from '../../place/ground-material.ts';
import { ORIGIN } from '../../place/layout.ts';

declare module '../names.ts' {
  interface BuilderNames {
    'terrain.kit': true;
  }
}

let pieces: ReadonlyMap<string, THREE.BufferGeometry> = new Map();
/** The kit's pieces by node name, in metres with their node transforms baked in. */
export function setTerrainKit(geometries: ReadonlyMap<string, THREE.BufferGeometry>) {
  pieces = geometries;
}

let shared: THREE.MeshStandardNodeMaterial | undefined;
/** The ground's own cliff rock (ground-material.ts rockLayers: the same beds, pigments and tile at the same height), so
 * piece and cliff are one rock; each block's COLOR_0 grey shades it, and faces turned to the sky are sun-bleached, the
 * chunky Sunshine read of a lit top. */
function kitMaterial() {
  if (shared) return shared;
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.92, metalness: 0 });
  const { layered, paint } = rockLayers(positionWorld.sub(vec3(ORIGIN.x, 0, ORIGIN.z)));
  const sky = max(normalWorldGeometry.normalize().y, 0);
  m.colorNode = layered
    .mul(mix(vec3(1), paint, 0.45))
    .mul(vertexColor().r)
    .mul(sky.mul(0.18).add(1));
  return (shared = m);
}

registerBuilder('terrain.kit', (params) => {
  const geometry = pieces.get(String(params.piece));
  if (!geometry) throw new Error(`terrain kit: ${String(params.piece)} not loaded`);
  const mesh = new THREE.InstancedMesh(geometry, kitMaterial(), Number(params.count ?? 1));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
});
