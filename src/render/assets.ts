// Game-owned cache and mixer updates; the explicit loader is also used by the isolated asset stage.
import * as THREE from 'three/webgpu';
import { renderer, rendererReady } from './scene.ts';
import { onFrame } from '../loop.ts';
import { assetUrl } from './asset-manifest.ts';
import { bootSpan } from '../boot/timeline.ts';
import { createAssetLoader } from './asset-loader.ts';
export type { Asset } from './asset-loader.ts';
const assets = createAssetLoader(renderer, { ready: rendererReady, onParse: (ms) => bootSpan('gltfParse', ms) });
export const loadAsset = assets.load;
export const loadAssetById = (id: string) => loadAsset(assetUrl(id));
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
