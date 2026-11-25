import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { registerAsset } from '../../render/asset-manifest.ts';
import url from './kit-url.ts';

registerAsset({ id: 'terrain-kit', url, kind: 'model', priority: 'soon' });

/** A piece's geometry in metres, as floats: meshopt quantizes positions and puts the scale on the node. COLOR_0's red
 * is the block's shade. */
function bake(mesh: THREE.Mesh) {
  const src = mesh.geometry;
  const g = new THREE.BufferGeometry();
  const floats = (name: string) => {
    const a = src.getAttribute(name);
    const f = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) {
      f[i * 3] = a.getX(i);
      f[i * 3 + 1] = a.getY(i);
      f[i * 3 + 2] = a.getZ(i);
    }
    return new THREE.BufferAttribute(f, 3);
  };
  g.setAttribute('position', floats('position'));
  g.setAttribute('normal', floats('normal'));
  g.setAttribute('color', floats('color'));
  g.setIndex(src.index);
  g.applyMatrix4(mesh.matrixWorld);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

async function load() {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
  gltf.scene.updateMatrixWorld(true);
  const pieces = new Map<string, THREE.BufferGeometry>();
  const meshes: THREE.Mesh[] = [];
  gltf.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) meshes.push(o);
  });
  try {
    for (const o of meshes) pieces.set(o.name || o.parent!.name, bake(o));
  } finally {
    for (const o of meshes) o.geometry.dispose(); // the file's quantized copies, baked or not: only baked ones are drawn
  }
  return pieces;
}

let loading: ReturnType<typeof load> | undefined;
export const terrainKitGeometry = () => (loading ??= load());
