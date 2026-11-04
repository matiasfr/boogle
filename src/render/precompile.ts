// Shader and pipeline compiles, moved from the first frame an object is seen to a moment nobody is playing (the lobby,
// or a lazy part's load). WebGPU builds a pipeline the first time a material is drawn, and a frame that does it
// stalls for tens of ms. compileAsync builds them ahead, but only for what the renderer would draw: it skips hidden
// objects and anything outside the camera's frustum, so those are switched on for the length of the call.
//
//   precompile(null, fn)  main.ts, behind the loading screen: the whole scene, then every warm-up object; fn(0..1) as
//                         each part finishes
//   precompile(object)    a lazy part, as it is built: that object (in the scene already or not)
//   warmUp(make)          for things that only appear once someone plays (a new player's avatar, a held item): make()
//                         returns a throwaway Object3D with the same materials; it is compiled at start, never drawn.
//                         Work that draws off-screen itself (the item icons) does it in make() and returns a
//                         promise of anything else; it is awaited in turn
import { renderer, scene, camera, rendererReady, renderFrame } from './scene.ts';
import { bootMark, bootSpan, bootSpanMs } from '../boot/timeline.ts';

import type * as THREE from 'three/webgpu';

type Warmup = () => THREE.Object3D | Promise<unknown> | unknown;
const warmups: Warmup[] = [];
const preparations: Warmup[] = [];
const draws: (() => void | (() => void))[] = [];
/** First-use passes on their real targets. Optional cleanup runs immediately after submission, before any await. */
export const warmDraw = (draw: () => void | (() => void)) => draws.push(draw);
/** beforeScene prepares resources the scene's shaders read, within the same boot escape deadline. */
export const warmUp = (make: Warmup, { beforeScene = false } = {}) => (beforeScene ? preparations : warmups).push(make);

// three keeps one precompilation state per renderer, so two compileAsync calls must never overlap: one at a time.
let queue: Promise<unknown> = Promise.resolve();
const compile = (root: THREE.Object3D) => (queue = queue.then(() => compileNow(root)));

async function compileNow(root: THREE.Object3D) {
  // compileAsync would await init itself, but the flags below must be undone without a gap
  if (
    !(await rendererReady.then(
      () => true,
      () => false,
    ))
  )
    return;
  const undo: (() => void)[] = [];
  const open = (o: THREE.Object3D) => {
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

// three.js #35069 (iOS 27 Safari, not macOS): in about half of page loads a compileAsync after the first frames throws
// "Texture already initialized" for the shadow map's depth texture, which is this module's pattern (lazy parts compile
// after play starts, and the sun casts shadows). Closed upstream as a WebKit bug. three only throws there when it is
// asked to create a texture it already holds, so skipping the second create is the reporter's workaround and changes
// nothing on a browser without the bug; it warns once so Web Inspector on the iPad shows whether it happens
// (docs/research/webgpu-on-ipad.md, recommendation 8). Remove once WebKit fixes it.
rendererReady.then(
  () => {
    // Opt-in startup evidence: native pipeline labels contain material IDs, not their scene owners.
    // Keep the actual cache key and object alongside the GPUDevice timings recorded by startup-record.ts.
    if (new URLSearchParams(location.search).get('startup') === '1') {
      type RenderObject = {
        object: THREE.Object3D & { geometry?: THREE.BufferGeometry };
        material: THREE.Material;
        pipeline: { cacheKey: string };
        context: { textures: THREE.Texture[] | null; sampleCount: number };
      };
      const backend = renderer.backend as unknown as {
        createRenderPipeline(o: RenderObject, promises: unknown[] | null): void;
        getRenderCacheKey(o: RenderObject): string;
      };
      const create = backend.createRenderPipeline.bind(backend);
      backend.createRenderPipeline = (o, promises) => {
        const parents: string[] = [];
        for (let p: THREE.Object3D | null = o.object; p; p = p.parent) parents.push(p.name || `${p.type}#${p.id}`);
        // PerformanceEntry.toJSON omits mark.detail in the benchmark browser.
        performance.mark(
          'startup:render-pipeline:' +
            JSON.stringify({
              material: `${o.material.name || o.material.type}_${o.material.id}`,
              object: parents.join(' / '),
              position: o.object.position.toArray(),
              geometry: o.object.geometry?.type,
              async: promises !== null,
              key: o.pipeline.cacheKey,
              state: backend.getRenderCacheKey(o),
              targets: o.context.textures?.map((t) => ({ name: t.name, type: t.type, colorSpace: t.colorSpace })),
              samples: o.context.sampleCount,
            }),
        );
        create(o, promises);
      };
    }
    type Backend = {
      get(o: object): { initialized?: boolean; externalTexture?: boolean };
      createTexture(t: THREE.Texture, o?: object): void;
    };
    const backend = renderer.backend as unknown as Backend;
    const create = backend.createTexture.bind(backend);
    let warned = false;
    backend.createTexture = (t, o) => {
      const data = backend.get(t);
      if (data.initialized && !data.externalTexture) {
        if (!warned) console.warn(`[precompile] three.js #35069: skipped re-creating texture "${t.name}"`);
        warned = true;
        return;
      }
      create(t, o);
    };
  },
  () => {},
);

// For the boot timeline (src/boot/timeline.ts): how long three spends generating WGSL from node materials (JS on the
// main thread; a build that yields is timed only while it runs) and creating shader modules, against the warm-up's wall
// time, most of which is the GPU compiling pipelines (createRenderPipelineAsync, off the main thread). Private three.js
// r187 API (NodeManager._createNodeBuilder, backend.createProgram): if it moves, the split reads 0 and nothing breaks.
type Builder = { build(): unknown; buildAsync(y: () => Promise<void>): Promise<unknown> };
rendererReady.then(
  () => {
    const nodes = (renderer as unknown as { _nodes: { _createNodeBuilder?: (...a: unknown[]) => Builder } })._nodes;
    const make = nodes?._createNodeBuilder?.bind(nodes);
    if (make)
      nodes._createNodeBuilder = (...a) => {
        const b = make(...a);
        const build = b.build.bind(b),
          buildAsync = b.buildAsync.bind(b);
        b.build = () => {
          const t = performance.now();
          try {
            return build();
          } finally {
            bootSpan('wgsl', performance.now() - t);
          }
        };
        b.buildAsync = async (y) => {
          let t = performance.now();
          const paused = async () => {
            bootSpan('wgsl', performance.now() - t);
            await y();
            t = performance.now();
          };
          try {
            return await buildAsync(paused);
          } finally {
            bootSpan('wgsl', performance.now() - t);
          }
        };
        return b;
      };
    const backend = renderer.backend as unknown as { createProgram?: (p: unknown) => void };
    const createProgram = backend.createProgram?.bind(backend);
    if (createProgram)
      backend.createProgram = (p) => {
        const t = performance.now();
        createProgram(p);
        bootSpan('shaderModule', performance.now() - t);
      };
  },
  () => {},
);
let warmStart = 0;
/** main.ts, when the warm-up wait ends (completion or deadline): programs and pipelines built so far. */
export function shadersMark() {
  const p = (
    renderer as unknown as {
      _pipelines?: {
        caches: Map<unknown, unknown>;
        programs: Record<'vertex' | 'fragment' | 'compute', Map<unknown, unknown>>;
      };
    }
  )._pipelines;
  bootMark('shaders', {
    ms: Math.round(performance.now() - warmStart),
    programs: p ? p.programs.vertex.size + p.programs.fragment.size + p.programs.compute.size : -1,
    pipelines: p ? p.caches.size : -1,
    wgsl: bootSpanMs('wgsl'),
    shaderModule: bootSpanMs('shaderModule'),
  });
}

/** Resolves when the GPU has finished what was submitted so far, compiles a frame needed included. */
export function gpuDone(): Promise<void> {
  const { device } = renderer.backend as unknown as { device: { queue: { onSubmittedWorkDone(): Promise<void> } } };
  return device.queue.onSubmittedWorkDone();
}

// r187 has no RenderPipeline.compileAsync. Visit its REAL draw path (QuadMesh installs its vertex node
// temporarily; RTT/shadow/fullscreen passes choose their own target and MSAA), but compile asynchronously.
// Never hold renderer target/material overrides across an await. This also retains #35069's guard.
async function compileFrame() {
  type RenderObject = { pipeline: object };
  const backend = renderer.backend as unknown as {
    createRenderPipeline(o: RenderObject, promises: Promise<unknown>[] | null): void;
  };
  const create = backend.createRenderPipeline;
  const promises: Promise<unknown>[] = [];
  const cleanups: (() => void)[] = [];
  try {
    backend.createRenderPipeline = (o, pending) => create.call(backend, o, pending ?? promises);
    for (const prepare of draws) {
      const cleanup = prepare();
      if (cleanup) cleanups.push(cleanup);
    }
    renderFrame();
  } finally {
    backend.createRenderPipeline = create;
    for (const cleanup of cleanups.reverse()) cleanup();
  }
  // Unlike compute(), r187's render path checks _pipelines.isReady before drawing. Escape remains safe.
  await Promise.all(promises);
  await gpuDone();
  bootMark('frame-pipelines');
}

// Resolves when the pipelines are built; never rejects (a failed compile is only a hitch later).
export async function precompile(root: THREE.Object3D | null = null, onProgress: (f: number) => void = () => {}) {
  if (root) return compile(root);
  warmStart = performance.now();
  const parts = preparations.length + warmups.length + 1;
  for (let i = 0; i < preparations.length; i++) {
    await preparations[i]!();
    onProgress((i + 1) / parts);
  }
  // Submit the real passes first, then build the whole scene while those native pipelines compile.
  // compileFrame restores renderer state before its first await; only compileNow uses three's mutable
  // compileAsync state. Await BOTH: scene compilation can reuse still-pending wrappers from the frame.
  await (queue = queue.then(() =>
    Promise.all([compileFrame().catch((e) => console.warn('[precompile frame]', e)), compileNow(scene)]),
  ));
  onProgress((preparations.length + 1) / parts);
  for (let i = 0; i < warmups.length; i++) {
    const made = await warmups[i]!();
    if ((made as THREE.Object3D | null)?.isObject3D) await compile(made as THREE.Object3D);
    onProgress((preparations.length + i + 2) / parts);
  }
  bootMark('warmup-complete'); // unlike boot:shaders, never means the escape deadline won
}
