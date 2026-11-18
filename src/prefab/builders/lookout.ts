// The lookout's records (src/entities/lookout/): the brass telescope on the ridge, and the buoys and their white tops,
// two instanced draws the lookout bobs every frame.
import * as THREE from 'three/webgpu';
import { registerBuilder } from '../builders.ts';
import { flat } from '../../render/flat.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'lookout.telescope': true;
    'lookout.buoy': true;
    'lookout.buoy-top': true;
  }
}
const finite = (value: unknown, name: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`prefabs: expected finite ${name}`);
  return value;
};

// Three splayed legs and the tube on top. The barrel points where the view looks (`aim`, a yaw the lookout works out
// from the eyepiece to its target), so what you see is what it's aimed at; the legs never turn.
registerBuilder('lookout.telescope', (params) => {
  const g = new THREE.Group();
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
  tube.rotation.y = finite(params.aim, 'telescope aim');
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.8, 12).rotateX(Math.PI / 2), brass);
  barrel.rotation.x = -0.12;
  barrel.position.z = 0.5;
  barrel.castShadow = true;
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 10).rotateX(Math.PI / 2), flat('#3a3d44'));
  eye.position.set(0, 0.12, -1);
  tube.add(barrel, eye);
  g.add(tube);
  return g;
});

/** One instanced draw for every buoy of its kind: `count` slots, filled by the placements. */
function buoyBatch(
  params: Parameters<Parameters<typeof registerBuilder>[1]>[0],
  geometry: () => THREE.BufferGeometry,
  color: string,
) {
  const count = params.count;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1)
    throw new Error('prefabs: expected buoy batch capacity');
  const mesh = new THREE.InstancedMesh(geometry(), flat(color, 0.5), count);
  mesh.frustumCulled = false;
  return mesh;
}
registerBuilder('lookout.buoy', (params, batch) => {
  if (batch) return batch.mesh;
  const mesh = buoyBatch(params, () => new THREE.ConeGeometry(0.9, 2.4, 7), '#ff7a1a');
  mesh.castShadow = true;
  return mesh;
});
registerBuilder('lookout.buoy-top', (params, batch) =>
  batch ? batch.mesh : buoyBatch(params, () => new THREE.SphereGeometry(0.34, 8, 6), '#fff0c9'),
);
