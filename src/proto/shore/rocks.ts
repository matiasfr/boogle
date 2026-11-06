// Reuse the demo's actual deformed geometry and baked cavities, with home's stone colours.
import * as THREE from 'three/webgpu';
import type { PropPlacement } from '../../blueprints/props.ts';
import { freezeStatic } from '../../render/instances.ts';
import { rockGeometry } from './ground.ts';
import { fbm } from './noise.ts';
import { registerWaterReceiver } from '../../render/water/receivers.ts';
import { registerWaterContact, type WaterContact } from '../../render/water/contacts.ts';

type Cut = { geometry: THREE.BufferGeometry; cut: THREE.BufferAttribute };
let pair: { cuts: Cut[]; high: THREE.InstancedMesh; original: WaterContact[]; shaped: WaterContact[] } | undefined;
let removeContacts: (() => void)[] = [];
function clearContacts() {
  for (const remove of removeContacts) remove();
  removeContacts = [];
}
function setShoreRocks(enabled: boolean) {
  if (!pair) return;
  for (const { geometry, cut } of pair.cuts) geometry.setIndex(enabled ? cut : null);
  pair.high.visible = enabled;
  clearContacts();
  removeContacts = (enabled ? pair.shaped : pair.original).map(registerWaterContact);
}
export function buildShoreRocks(group: THREE.Group, cuts: Cut[], spots: PropPlacement[]) {
  const geometry = rockGeometry(fbm);
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.9 });
  registerWaterReceiver(material);
  const high = new THREE.InstancedMesh(geometry, material, spots.length);
  high.name = 'shore-rocks';
  const matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion();
  const original: WaterContact[] = [],
    shaped: WaterContact[] = [];
  const point = new THREE.Vector3(),
    vertices = geometry.getAttribute('position');
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
    let radius = 0,
      top = -Infinity,
      bottom = Infinity;
    for (let k = 0; k < vertices.count; k++) {
      point.fromBufferAttribute(vertices, k).applyMatrix4(matrix);
      radius = Math.max(radius, Math.hypot(point.x - p.x, point.z - p.z));
      top = Math.max(top, point.y);
      bottom = Math.min(bottom, point.y);
    }
    if (bottom < 0.5 && top > 0) shaped.push({ x: p.x, z: p.z, radius, top });
    if (p.h < 0.5 && p.h + p.size * 1.25 > 0)
      original.push({ x: p.x, z: p.z, radius: p.size * 1.1, top: p.h + p.size * 1.25 });
  });
  high.castShadow = high.receiveShadow = true;
  high.computeBoundingSphere();
  group.add(high);
  freezeStatic(high);
  pair = { cuts, high, original, shaped };
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
  return clearContacts;
}
