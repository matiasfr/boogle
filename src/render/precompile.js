// Shader and pipeline compiles, moved from the first frame an object is seen to a moment nobody is playing (the lobby,
// or a lazy part's load). WebGPU builds a pipeline the first time a material is drawn, and a frame that does it
// stalls for tens of ms. compileAsync builds them ahead, but only for what the renderer would draw: it skips hidden
// objects and anything outside the camera's frustum, so those are switched on for the length of the call.
//
//   precompile(null, fn)  main.js, behind the loading screen: the whole scene, then every warm-up object; fn(0..1) as
//                         each part finishes
//   precompile(object)    a lazy part, as it is built: that object (in the scene already or not)
//   warmUp(make)          for things that only appear once someone plays (a new player's avatar, a held item): make()
//                         returns a throwaway Object3D with the same materials; it is compiled at start, never drawn.
//                         Work that draws off-screen itself (the hotbar's item icons) does it in make() and returns a
//                         promise of anything else; it is awaited in turn
import { renderer, scene, camera, rendererReady } from './scene.js';

const warmups = [];
export const warmUp = (make) => warmups.push(make);

// three keeps one precompilation state per renderer, so two compileAsync calls must never overlap: one at a time.
let queue = Promise.resolve();
const compile = (root) => (queue = queue.then(() => compileNow(root)));

async function compileNow(root) {
  // compileAsync would await init itself, but the flags below must be undone without a gap
  if (
    !(await rendererReady.then(
      () => true,
      () => false,
    ))
  )
    return;
  const undo = [];
  const open = (o) => {
    if (!o.visible) {
      o.visible = true;
      undo.push(() => (o.visible = false));
    }
  };
  for (let p = root.parent; p; p = p.parent) open(p);
  root.traverse((o) => {
    open(o);
    if (o.frustumCulled) {
      o.frustumCulled = false;
      undo.push(() => (o.frustumCulled = true));
    }
  });
  const restore = () => undo.splice(0).forEach((f) => f());
  try {
    // The render list (what gets compiled) is built before compileAsync first yields, so the flags can go back at
    // once: nothing hidden is drawn while the pipelines build in the background.
    const done = root === scene ? renderer.compileAsync(scene, camera) : renderer.compileAsync(root, camera, scene);
    restore();
    await done;
  } catch (e) {
    console.warn('[precompile]', e);
  } finally {
    restore();
  }
}

// Resolves when the pipelines are built; never rejects (a failed compile is only a hitch later).
export async function precompile(root = null, onProgress = () => {}) {
  if (root) return compile(root);
  const parts = warmups.length + 2; // the scene counts as two: it is most of the work
  await compile(scene);
  onProgress(2 / parts);
  for (let i = 0; i < warmups.length; i++) {
    const made = await warmups[i]();
    if (made?.isObject3D) await compile(made);
    onProgress((i + 3) / parts);
  }
}
