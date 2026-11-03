// Reuse the demo's actual deformed geometry and baked cavities, with home's stone colours.
import * as THREE from 'three/webgpu';
import type { PropPlacement } from '../../blueprints/props.ts';
import { freezeStatic } from '../../render/instances.ts';
import { rockGeometry } from '../water/ground.ts';
import { fbm } from '../water/height.ts';

type Cut = { geometry: THREE.BufferGeometry; cut: THREE.BufferAttribute };
let pair: { cuts: Cut[]; high: THREE.InstancedMesh } | undefined;
export function setShoreRocks(enabled: boolean) {
  if (!pair) return;
  for (const { geometry, cut } of pair.cuts) geometry.setIndex(enabled ? cut : null);
  pair.high.visible = enabled;
}
export function buildShoreRocks(group: THREE.Group, cuts: Cut[], spots: PropPlacement[]) {
  const geometry = rockGeometry(fbm);
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.9 });
  const high = new THREE.InstancedMesh(geometry, material, spots.length);
  high.name = 'shore-rocks';
  const matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion();
  spots.forEach((p, i) => {
    if (p.blueprint !== 'rock') return;
    rotation.setFromEuler(new THREE.Euler(...p.look.spin));
    matrix.compose(
      new THREE.Vector3(p.x, p.h + p.size * 0.15, p.z),
      rotation,
      new THREE.Vector3(p.size * 1.1, p.size * 0.75, p.size),
    );
    high.setMatrixAt(i, matrix);
    high.setColorAt(i, new THREE.Color(p.look.dark ? '#8a857c' : '#a19b90'));
  });
  high.castShadow = high.receiveShadow = true;
  high.computeBoundingSphere();
  group.add(high);
  freezeStatic(high);
  pair = { cuts, high };
  setShoreRocks(true);
  console.info(
    'SHORE ROCKS ' +
      JSON.stringify({
        count: spots.length,
        triangles: (geometry.index!.count / 3) * spots.length,
        replacedTriangles: 20 * spots.length,
        meshBytes:
          Object.values(geometry.attributes).reduce(
            (s, a) => s + a.array.byteLength,
            geometry.index!.array.byteLength,
          ) +
          spots.length * (16 + 3) * 4,
        draws: 1,
      }),
  );
}
