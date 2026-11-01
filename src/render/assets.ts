// Authored models at runtime (docs/plans/asset-pipeline.md). Load an optimized .glb from assets/built/ (built by
// `npm run assets`), clone pieces of it, and play its glTF animation clips.
//
//   import url from '../../assets/built/scaffold-kit.glb?url';   // Vite hashes the file name on build
//   const kit = await loadAsset(url);                             // cached per url; decoders set up once
//   const plank = kit.instance('plank');                          // a Group at the origin holding a clone of node 'plank'
//   scene.add(plank); play(plank, kit.clip('drop', 'plank'));     // the clip's tracks for that node only
//
// Meshes come with three's decoders: meshopt (EXT_meshopt_compression, KHR_mesh_quantization) and KTX2 (Basis
// Universal, transcoded to ASTC on iPad and Apple GPUs, BC on desktops); the transcoder ships beside the bundle through
// KTX2Loader's own `new URL(..., import.meta.url)`, which Vite emits as a hashed asset. Draco is not set up: meshopt
// decodes faster, also covers animation and morph data, and our models are small (the doc, "Best practices").
// Materials become node materials (the same conversion the renderer would do), so patchNode() and TSL slots work on
// them; colours stay linear (glTF base colours are linear, colour textures sRGB), per src/render/README.md.
// Lazy: import this module with import() from the feature that needs it, so the loaders stay out of the first load.
// Files are registered by id in the content manifest (./asset-manifest.ts, eager and small: priorities, prefetch after
// the first frame); loadAssetById(id) loads a registered model.
import * as THREE from 'three/webgpu';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { renderer, rendererReady } from './scene.ts';
import { onFrame } from '../loop.ts';
import { assetUrl } from './asset-manifest.ts';

export type Asset = {
  url: string;
  gltf: GLTF;
  /** A new Group at the origin holding a clone of the named node (or the whole scene); geometry and materials shared. */
  instance(node?: string): THREE.Group;
  /** A clip by name; with `node`, only the tracks that animate that node (a kit's shared clip, per piece). */
  clip(name: string, node?: string): THREE.AnimationClip;
};

let loader: GLTFLoader | null = null;
async function gltfLoader() {
  if (loader) return loader;
  await rendererReady; // KTX2Loader reads the device's compressed formats from the renderer
  await MeshoptDecoder.ready;
  const ktx2 = new KTX2Loader().detectSupport(renderer);
  loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx2);
  return loader;
}

const toNode = new Map<THREE.Material, THREE.Material>();
function nodeMaterial(m: THREE.Material) {
  let n = toNode.get(m);
  if (!n) toNode.set(m, (n = renderer.library.fromMaterial(m) ?? m));
  return n;
}

const cache = new Map<string, Promise<Asset>>();
export function loadAsset(url: string): Promise<Asset> {
  let p = cache.get(url);
  if (!p) cache.set(url, (p = load(url)));
  return p;
}

/** A model registered in the content manifest (registerAsset), by id. */
export const loadAssetById = (id: string) => loadAsset(assetUrl(id));

async function load(url: string): Promise<Asset> {
  const gltf = await (await gltfLoader()).loadAsync(url);
  let skinned = false;
  gltf.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(nodeMaterial) : nodeMaterial(mesh.material);
    mesh.castShadow = mesh.receiveShadow = true;
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = true;
  });
  const clips = new Map<string, THREE.AnimationClip>();
  return {
    url,
    gltf,
    instance(node) {
      const src = node ? gltf.scene.getObjectByName(node) : gltf.scene;
      if (!src) throw new Error(`assets: ${url} has no node named ${node}`);
      const copy = skinned ? cloneSkinned(src) : src.clone();
      copy.position.set(0, 0, 0); // the holder places it; the copy keeps its rotation, scale and its clips' keys
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
      // Track names are `<node>.<property>`; a node's own tracks bind to the instance's root by name.
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
}

// ---------------------------------------------------------------- clips
// Mixers with something playing, and what: a mixer drops out of the frame hook once all its actions have ended.
const playing = new Map<THREE.AnimationMixer, Set<THREE.AnimationAction>>();
export type PlayOpts = { loop?: boolean; speed?: number; done?: () => void };

/**
 * Play a clip on an instance from `Asset.instance()`. Without `loop` it plays once, holds its last pose and calls
 * `done`. Returns the action (stop it, fade it, scrub `time`). Code owns the timing: when to start, how fast, what
 * comes next.
 */
export function play(
  holder: THREE.Object3D,
  clip: THREE.AnimationClip,
  { loop = false, speed = 1, done }: PlayOpts = {},
) {
  const root = holder.children[0] ?? holder;
  const mixer = ((root.userData.mixer as THREE.AnimationMixer | undefined) ??= new THREE.AnimationMixer(root));
  const action = mixer.clipAction(clip).reset();
  action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  action.clampWhenFinished = !loop;
  action.timeScale = speed;
  action.play();
  mixer.update(0); // the first pose now, not a frame late
  let set = playing.get(mixer);
  if (!set) playing.set(mixer, (set = new Set()));
  set.add(action);
  if (done) {
    const finished = (e: { action: THREE.AnimationAction }) => {
      if (e.action !== action) return;
      mixer.removeEventListener('finished', finished);
      done();
    };
    mixer.addEventListener('finished', finished);
  }
  return action;
}

onFrame(
  ({ dt }) => {
    for (const [mixer, actions] of playing) {
      mixer.update(dt);
      for (const a of actions) if (!a.isRunning()) actions.delete(a);
      if (!actions.size) playing.delete(mixer);
    }
  },
  { phase: 'update', order: -150 },
);
