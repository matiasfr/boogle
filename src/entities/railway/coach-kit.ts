// Candidate A's built shell and hinge-local steps. Shared decoded geometry and kit paint live for the session.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import url from '../../../assets/built/rider-coach.glb?url';
import { registerAsset } from '../../render/asset-manifest.ts';
import { paint } from '../../place/look.ts';

registerAsset({ id: 'rider-coach', url, kind: 'model', priority: 'first' });
const kit = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
kit.scene.updateMatrixWorld(true);
export type CoachSeat = { name: string; position: [number, number, number]; yaw: number };
export const COACH_SEATS = kit.scene.getObjectByName('coach_shell')!.userData.coachSeats as readonly CoachSeat[];
if (COACH_SEATS.length !== 8) throw new Error('Coach requires eight exported seat landmarks');
const geometries = new Map<string, THREE.BufferGeometry>();
const hinges = new Map<string, { position: THREE.Vector3; side: number }>();
kit.scene.traverse((node) => {
  if (!(node instanceof THREE.Mesh)) return;
  const geometry = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const a = node.geometry.getAttribute(name);
    const data = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) data.set([a.getX(i), a.getY(i), a.getZ(i)], i * 3);
    geometry.setAttribute(name, new THREE.BufferAttribute(data, 3));
  }
  geometry.setIndex(node.geometry.index);
  geometry.applyMatrix4(node.matrixWorld);
  if (node.name.startsWith('coach_step_')) {
    const position = new THREE.Vector3().fromArray(node.userData.hinge as number[]);
    geometry.translate(-position.x, -position.y, -position.z);
    hinges.set(node.name, { position, side: node.userData.side as number });
  }
  geometries.set(node.name, geometry);
});
export function coachParts(kind: 'body' | 'underframe') {
  const root = new THREE.Group();
  root.name = `rider-coach-${kind}`;
  for (const [name, geometry] of geometries) {
    if ((name === 'coach_underframe') !== (kind === 'underframe')) continue;
    const mesh = new THREE.Mesh(geometry, paint({ color: '#ffffff', own: true, rough: 0.85 }));
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    const hinge = hinges.get(name);
    if (hinge) {
      mesh.position.copy(hinge.position);
      mesh.userData.side = hinge.side;
    }
    root.add(mesh);
  }
  return root;
}
