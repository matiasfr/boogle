// Explicit asset-loader lifetime shared by the game and the isolated asset stage. No scene, loop or feature imports.
import * as THREE from 'three/webgpu';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
export type Asset = {
  url: string;
  gltf: GLTF;
  instance(node?: string): THREE.Group;
  clip(name: string, node?: string): THREE.AnimationClip;
};
export function createAssetLoader(
  renderer: THREE.WebGPURenderer,
  options: { ready?: Promise<unknown>; onParse?: (ms: number) => void } = {},
) {
  const cache = new Map<string, Promise<Asset>>();
  const owned = new Set<Asset>();
  const toNode = new Map<THREE.Material, THREE.Material>();
  let disposed = false;
  let ktx2: KTX2Loader | undefined;
  let loader: Promise<GLTFLoader> | undefined;
  const getLoader = () =>
    (loader ??= (async () => {
      await options.ready;
      await MeshoptDecoder.ready;
      ktx2 = new KTX2Loader().detectSupport(renderer);
      const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx2);
      const parse = gltf.parse.bind(gltf);
      gltf.parse = (data, path, onLoad, onError) => {
        const start = performance.now();
        parse(
          data,
          path,
          (result) => {
            options.onParse?.(performance.now() - start);
            onLoad(result);
          },
          onError,
        );
      };
      return gltf;
    })());
  const nodeMaterial = (m: THREE.Material) => {
    let n = toNode.get(m);
    if (!n) toNode.set(m, (n = renderer.library.fromMaterial(m) ?? m));
    return n;
  };
  async function load(url: string): Promise<Asset> {
    const gltf = await (await getLoader()).loadAsync(url);
    let skinned = false;
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(nodeMaterial) : nodeMaterial(mesh.material);
      mesh.castShadow = mesh.receiveShadow = true;
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = true;
    });
    const clips = new Map<string, THREE.AnimationClip>();
    const asset: Asset = {
      url,
      gltf,
      instance(node) {
        const src = node ? gltf.scene.getObjectByName(node) : gltf.scene;
        if (!src) throw new Error(`assets: ${url} has no node named ${node}`);
        const copy = skinned ? cloneSkinned(src) : src.clone();
        copy.position.set(0, 0, 0);
        const holder = new THREE.Group();
        holder.add(copy);
        return holder;
      },
      clip(name, node) {
        const key = name + '\n' + (node ?? '');
        let c = clips.get(key);
        if (c) return c;
        const all = gltf.animations.find((a) => a.name === name);
        if (!all) throw new Error(`assets: ${url} has no clip named ${name}`);
        c = node
          ? new THREE.AnimationClip(
              name,
              all.duration,
              all.tracks.filter((t) => t.name.startsWith(node + '.')),
            )
          : all;
        clips.set(key, c);
        return c;
      },
    };
    owned.add(asset);
    if (disposed) {
      dispose();
      throw new Error('Asset loader disposed during load');
    }
    return asset;
  }
  function dispose() {
    disposed = true;
    const geometries = new Set<THREE.BufferGeometry>(),
      textures = new Set<THREE.Texture>();
    for (const asset of owned)
      asset.gltf.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) geometries.add((o as THREE.Mesh).geometry);
      });
    for (const material of new Set([...toNode.keys(), ...toNode.values()])) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    }
    for (const geometry of geometries) geometry.dispose();
    for (const texture of textures) texture.dispose();
    owned.clear();
    toNode.clear();
    cache.clear();
    ktx2?.dispose();
  }
  return {
    load(url: string) {
      if (disposed) return Promise.reject(new Error('Asset loader is disposed'));
      let p = cache.get(url);
      if (!p) {
        p = load(url).catch((error: unknown) => {
          cache.delete(url);
          throw error;
        });
        cache.set(url, p);
      }
      return p;
    },
    dispose,
  };
}
