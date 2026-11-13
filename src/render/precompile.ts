// Shader and pipeline compiles, moved from the first frame an object is seen to a moment nobody is playing (the lobby,
// or a lazy part's load). WebGPU builds a pipeline the first time a material is drawn, and a frame that does it
// stalls for tens of ms (a device's cold Safari: 84 ms a pipeline, 889 ms once on Far Head). compileAsync builds them
// ahead, but only for what the renderer would draw: it skips hidden objects and anything outside the camera's frustum,
// so those are switched on for the length of the call.
//
// Lobby first (docs/research/cold-start.md, 5b; owner, 10 November 2026: "Yes, build it"). The loading screen waits
// only for what the lobby view draws (pass 1); the rest builds after it lifts (pass 2), nearest the camera first, while
// the player is in the lobby and arriving. Nothing draws with a shader or pipeline still building: from the end of pass
// 1, what an object in the scene first needs in a frame is built off that frame and the object waits for it, so it
// appears a moment late instead of stalling the frame (details below, "Never a first-use stall").
//
//   precompile(null, fn)  main.ts, behind the loading screen: pass 1 (the preparations, the lobby's real frame with
//                         `{ frame: true }` warm-ups in it, then the warm-ups); fn(0..1) as each part finishes. Pass 2
//                         starts once the game is interactive and ends with the boot mark `shaders-all`
//   precompile(object)    a lazy part, as it is built: that object (in the scene already or not)
//   warmUp(make)          for things that only appear once someone plays (a new player's avatar, a held item): make()
//                         returns a throwaway Object3D with the same materials; it is compiled, never shown. Work that
//                         draws off-screen itself (the item icons) does it in make() and returns a promise of anything
//                         else; it is awaited in turn. `{ frame: true }`: the object is in the lobby's warm-up frame,
//                         so its shadow pipelines build too (Buddy). `{ defer: 'near' }`: built in pass 2, after the
//                         camera's surroundings
import * as THREE from 'three/webgpu';
import { renderer, scene, camera, rendererReady, renderFrame } from './scene.ts';
import { bootInteractive, bootMark, bootSpan, bootSpanMs } from '../boot/timeline.ts';
import { startupWork } from '../boot/startup-frames.ts';
import { defineKind, despawn, spawn } from '../entity/entity.ts';
import { background } from '../async.ts';

type Warmup = () => THREE.Object3D | Promise<unknown> | unknown;
const warmups: Warmup[] = [];
const preparations: Warmup[] = [];
const framed: (() => THREE.Object3D)[] = [];
const deferred: Warmup[] = [];
const draws: (() => void | (() => void))[] = [];
/** First-use passes on their real targets. Optional cleanup runs immediately after submission, before any await. */
export const warmDraw = (draw: () => void | (() => void)) => draws.push(draw);
/** beforeScene prepares resources the scene's shaders read, within the same boot escape deadline. frame puts the
 * object in the lobby's warm-up frame (its shadow pipelines too); defer builds it after the loading screen. */
export function warmUp(make: Warmup, opts: { beforeScene?: boolean; frame?: boolean; defer?: 'near' } = {}) {
  if (opts.frame) framed.push(make as () => THREE.Object3D);
  else if (opts.defer) deferred.push(make);
  else (opts.beforeScene ? preparations : warmups).push(make);
}

// three keeps one precompilation state per renderer, so two compileAsync calls must never overlap: one at a time.
// An object held out of a frame (below) goes to the front: it waits for the compile running now, not for the others.
const tasks: { run: () => Promise<unknown>; done: () => void }[] = [];
let running = false;
function inTurn(run: () => Promise<unknown>, { first = false } = {}) {
  return new Promise<void>((done) => {
    if (first) tasks.unshift({ run, done });
    else tasks.push({ run, done });
    queueMicrotask(() => void pump()); // never inside the caller: a hold is found mid-render
  });
}
async function pump() {
  if (running) return;
  running = true;
  for (let t = tasks.shift(); t; t = tasks.shift()) {
    await t.run().catch((e: unknown) => console.error('[precompile]', e));
    t.done();
  }
  running = false;
}
const compile = (root: THREE.Object3D) => inTurn(() => compileNow(root));

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
    console.error('[precompile]', e);
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
    {
      const detailed = new URLSearchParams(location.search).get('startup') === '1';
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
        if (detailed)
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
        const t = performance.now();
        try {
          create(o, promises);
        } finally {
          startupWork(
            `pipeline ${o.material.name || o.material.type}_${o.material.id}: ${parents.slice(0, 3).join(' / ')}`,
            performance.now() - t,
          );
        }
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

// Never a first-use stall in play. From the end of pass 1, in the game's scene (its camera and shadow passes):
// - an object drawn for the first time whose shader (WGSL) is not generated yet is skipped in that frame and compiled
//   with compileAsync, which yields to the frames; it is drawn once that is done. Shadow-pass shaders cannot be built
//   outside a frame (three applies the caster's nodes to the shadow material only while drawing it), so a frame
//   generates them up to a budget and the casters past it cast their shadow a frame or more later.
//   An object drawn before keeps three's behaviour when its material changes (it would blink otherwise).
// - a pipeline three would build synchronously is built with createRenderPipelineAsync instead: r187's draw path skips
//   an object whose pipeline is not ready (Pipelines.isReady), so that object (or its shadow) is drawn a few frames
//   late.
// Other scenes keep three's synchronous build, since their one-off renders need the result at once: PMREM, the item
// icons, the output pass (a skipped output quad would be a black frame). Mipmap pipelines are three's internal ones.
let deferring = false;
const heldMarks = typeof location !== 'undefined' && new URLSearchParams(location.search).get('startup') === '1';
const HELD_STEP = 8; // held objects a compileAsync: the nearest show first
const SHADOW_WGSL_MS = 8; // shadow-shader generation a frame may spend before more casters wait for the next
const building = new Set<Promise<unknown>>();
const track = (p: Promise<unknown>) => {
  building.add(p);
  void p.finally(() => building.delete(p));
};
/** Built late this way, each a miss of the warm-up: pipelines and held objects, in all and after pass 2 finished. */
const late = { pipelines: 0, held: 0, afterAll: 0 };
let allDone = false;
rendererReady.then(
  () => {
    type RenderObject = { scene: THREE.Object3D };
    const backend = renderer.backend as unknown as {
      createRenderPipeline(o: RenderObject, promises: Promise<unknown>[] | null): void;
    };
    const create = backend.createRenderPipeline.bind(backend);
    backend.createRenderPipeline = (o, promises) => {
      if (promises !== null || !deferring || o.scene !== scene) return create(o, promises);
      const pending: Promise<unknown>[] = [];
      create(o, pending);
      late.pipelines++;
      if (allDone) late.afterAll++;
      pending.forEach(track);
    };

    // r187 private API: Renderer._renderObjectDirect (the per-object draw, looked up at every render() call),
    // _objects.get, _nodes.get / nodeBuilderCache / getForRenderCacheKey. If they move, this stops holding and three
    // generates the shader in the frame as before.
    type Ro = object;
    type Draw = (
      this: R,
      object: THREE.Object3D,
      material: THREE.Material,
      s: THREE.Object3D,
      ...rest: unknown[]
    ) => void;
    type R = {
      _renderObjectDirect: Draw;
      _currentRenderContext: unknown;
      _objects: { get(...a: unknown[]): Ro };
      _nodes: {
        get(o: Ro): { nodeBuilderState?: unknown };
        nodeBuilderCache: Map<unknown, unknown>;
        getForRenderCacheKey(o: Ro): unknown;
      };
    };
    const r = renderer as unknown as R;
    const direct = r._renderObjectDirect;
    if (typeof direct !== 'function' || !r._nodes?.nodeBuilderCache) return;
    const drawn = new WeakSet<THREE.Object3D>();
    const holding = new WeakSet<THREE.Object3D>();
    const held: THREE.Object3D[] = [];
    const shadowDrawn = new WeakSet<THREE.Object3D>();
    let budgetFrame = -1,
      wgslAtFrame = 0;
    r._renderObjectDirect = function (object, material, s, camera_, lightsNode, group, clippingContext, passId) {
      const shadow = (material as { isShadowPassMaterial?: boolean }).isShadowPassMaterial === true;
      if (deferring && s === scene && !(shadow ? shadowDrawn : drawn).has(object)) {
        if (holding.has(object)) return;
        const o = this._objects.get(
          object,
          material,
          s,
          camera_,
          lightsNode,
          this._currentRenderContext,
          clippingContext,
          passId,
        );
        const missing =
          this._nodes.get(o).nodeBuilderState === undefined &&
          !this._nodes.nodeBuilderCache.has(this._nodes.getForRenderCacheKey(o));
        if (missing && shadow) {
          // A caster's shadow shader: generated here, at most SHADOW_WGSL_MS of them a frame; the rest wait a frame.
          const frame = renderer.info.frame;
          if (frame !== budgetFrame) {
            budgetFrame = frame;
            wgslAtFrame = bootSpanMs('wgsl');
          }
          if (bootSpanMs('wgsl') - wgslAtFrame >= SHADOW_WGSL_MS) return;
        } else if (missing) {
          holding.add(object);
          late.held++;
          if (heldMarks)
            performance.mark(
              'startup:held:' +
                JSON.stringify({
                  object: `${object.name || object.type}#${object.id}`,
                  material: material.name || material.type,
                }),
            );
          if (allDone) late.afterAll++;
          // The frame's held objects compile together, next in the queue (one compileAsync keeps 16 pipelines in
          // flight; one each would wait for the GPU in turn). Done: drawn from the next frame (an object-specific
          // shader, which three never caches, generates then).
          held.push(object);
          if (held.length === 1)
            track(
              inTurn(
                async () => {
                  // Nearest first, a few at a time, each few shown as soon as they are built.
                  const at = camera.getWorldPosition(new THREE.Vector3());
                  const batch = held.splice(0).sort((a, b) => reach(a, at) - reach(b, at));
                  for (let k = 0; k < batch.length; k += HELD_STEP) {
                    const step = batch.slice(k, k + HELD_STEP);
                    try {
                      await compileSome(step, [...batch.slice(k + HELD_STEP), ...held]);
                    } finally {
                      if (heldMarks) performance.mark('startup:held:' + JSON.stringify({ done: step.length }));
                      for (const o of step) {
                        holding.delete(o);
                        drawn.add(o);
                      }
                    }
                  }
                },
                { first: true },
              ),
            );
          return;
        }
        (shadow ? shadowDrawn : drawn).add(object);
      }
      direct.call(this, object, material, s, camera_, lightsNode, group, clippingContext, passId);
    };
  },
  () => {},
);
/** Resolves when everything started late so far is built (main.ts: before the loading screen lifts). */
export const lateBuilt = () => Promise.all([...building]).then(() => {});

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
            const ms = performance.now() - t;
            bootSpan('wgsl', ms);
            startupWork('WGSL generation', ms);
            // A shader generated inside a frame after the warm-up: which object (cold-launch reads these).
            if (deferring && ms > 20) {
              const { object, material } = b as unknown as { object?: THREE.Object3D; material?: THREE.Material };
              const path: string[] = [];
              for (let p = object ?? null; p && path.length < 4; p = p.parent) path.push(p.name || `${p.type}#${p.id}`);
              performance.mark(
                'startup:frame-wgsl:' +
                  JSON.stringify({
                    ms: Math.round(ms),
                    material: material?.name || material?.type,
                    object: path.join(' / '),
                  }),
              );
            }
          }
        };
        b.buildAsync = async (y) => {
          let t = performance.now();
          const paused = async () => {
            const ms = performance.now() - t;
            bootSpan('wgsl', ms);
            startupWork('WGSL generation', ms);
            await y();
            t = performance.now();
          };
          try {
            return await buildAsync(paused);
          } finally {
            const ms = performance.now() - t;
            bootSpan('wgsl', ms);
            startupWork('WGSL generation', ms);
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
        const ms = performance.now() - t;
        bootSpan('shaderModule', ms);
        startupWork('shader module', ms);
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
// The frame is the lobby's own view: what its camera and its shadow camera see, the warmDraw looks, and the
// `{ frame: true }` warm-ups, drawn wherever they are (unculled) so their shadow pipelines build as well.
async function compileFrame(extra: THREE.Object3D[]) {
  type RenderObject = { pipeline: object };
  const backend = renderer.backend as unknown as {
    createRenderPipeline(o: RenderObject, promises: Promise<unknown>[] | null): void;
  };
  const create = backend.createRenderPipeline;
  const promises: Promise<unknown>[] = [];
  const cleanups: (() => void)[] = [];
  // In the scene for this one frame only: hidden right after it is submitted, gone at the first frame's teardown.
  const held = extra.map((mesh) => spawn({ kind: 'warm-frame', mesh }));
  for (const o of extra) o.traverse((c) => (c.frustumCulled = false));
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
    for (const o of extra) o.visible = false;
    held.forEach(despawn);
  }
  // Unlike compute(), r187's render path checks _pipelines.isReady before drawing. Escape remains safe.
  await Promise.all(promises);
  await gpuDone();
  bootMark('frame-pipelines');
}
defineKind('warm-frame', {});

// Compile exceptions are reported as errors so the look harness cannot accept an incomplete scene.
export async function precompile(root: THREE.Object3D | null = null, onProgress: (f: number) => void = () => {}) {
  if (root) return compile(root);
  warmStart = performance.now();
  const parts = preparations.length + warmups.length + 1;
  for (let i = 0; i < preparations.length; i++) {
    await preparations[i]!();
    onProgress((i + 1) / parts);
  }
  // Pass 1: the lobby's frame (the camera entity puts the camera in its lobby pose for it). What its first frames show
  // that this frame did not draw (hidden until then: the haul pieces, the panel mechanism, a few labels; 15 objects on
  // 10 November) is held in those frames and built before the loading screen lifts (main.ts awaits lateBuilt).
  // Compiling everything hidden in the view here instead built 28 more pipelines. Everything else is pass 2's.
  const extra = framed.map((make) => make());
  await inTurn(() => compileFrame(extra).catch((e) => console.error('[precompile frame]', e)));
  onProgress((preparations.length + 1) / parts);
  for (let i = 0; i < warmups.length; i++) {
    const made = await warmups[i]!();
    if ((made as THREE.Object3D | null)?.isObject3D) await compile(made as THREE.Object3D);
    onProgress((preparations.length + i + 2) / parts);
  }
  deferring = true; // from the first real frame on, nothing in the scene builds a pipeline synchronously
  bootMark('warmup-complete'); // unlike boot:shaders, never means the escape deadline won
  background(
    bootInteractive.then(() => compileRest()),
    'background shaders',
  );
}

// ---- pass 2: the rest of the scene, nearest the camera first ------------------------------------------------------
// Nearest the camera first, in rings (the lobby's view, then wherever the player has got to: the spawn's surroundings
// and the arrival, the town, the railway, then far places): the camera pass a chunk per compileAsync (three yields every
// 8 ms and keeps 16 pipelines in flight), then the ring's shadow casters over a few frames.
const RINGS = [60, 150, 300, 600, Infinity]; // m
const CHUNK = 12; // objects a compileAsync: an object held in a frame waits for one of these (~0.7 s at 4x CPU)
const drawable = (o: THREE.Object3D) =>
  (o as THREE.Mesh).isMesh || (o as THREE.Sprite).isSprite || (o as THREE.Line).isLine || (o as THREE.Points).isPoints;
const sphere = new THREE.Sphere();
/** The object's bounds in world space (into the shared `sphere`). */
function bounds(o: THREE.Object3D) {
  const im = o as THREE.InstancedMesh;
  const geometry = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
  if (im.isInstancedMesh) {
    if (!im.boundingSphere) im.computeBoundingSphere();
    sphere.copy(im.boundingSphere!);
  } else if (geometry) {
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    sphere.copy(geometry.boundingSphere!);
  } else sphere.set(sphere.center.set(0, 0, 0), 0);
  return sphere.applyMatrix4(o.matrixWorld);
}
/** m from p to the nearest point of the object's bounds (0 inside them). */
function reach(o: THREE.Object3D, p: THREE.Vector3) {
  const s = bounds(o);
  const d = Math.max(0, s.center.distanceTo(p) - s.radius);
  return Number.isFinite(d) ? d : 0; // unbounded or broken bounds: treat as here
}

// The camera pass of these objects: each (and its parents) shown and unculled only while compileAsync takes its list.
// later: objects to leave out this time (the other held objects, which are in view and would all build in one call).
async function compileSome(list: THREE.Object3D[], later: THREE.Object3D[] = []) {
  if (!list.length) return;
  const undo: (() => void)[] = [];
  const wanted = new Set<THREE.Object3D>();
  for (const o of list) for (let p: THREE.Object3D | null = o; p; p = p.parent) wanted.add(p);
  for (const o of later)
    if (o.visible && !wanted.has(o)) {
      o.visible = false;
      undo.push(() => (o.visible = true));
    }
  const open = (o: THREE.Object3D) => {
    if (!o.visible) {
      o.visible = true;
      undo.push(() => (o.visible = false));
    }
  };
  for (const o of list) {
    for (let p: THREE.Object3D | null = o; p; p = p.parent) open(p);
    if (o.frustumCulled) {
      o.frustumCulled = false;
      undo.push(() => (o.frustumCulled = true));
    }
  }
  const restore = () => undo.splice(0).forEach((f) => f());
  try {
    const done = renderer.compileAsync(scene, camera);
    restore();
    await done;
  } catch (e) {
    console.error('[precompile]', e);
  } finally {
    restore();
  }
}

// The shadow pass has no compileAsync (three builds a caster's shadow pipeline the first frame the sun's camera draws
// it), so casters are unculled in real frames, a batch a frame: off the shadow map's and the screen's edges the GPU
// clips them, so nothing changes on screen, and their pipelines build asynchronously (the deferring path above). The
// batch grows while a frame's WGSL generation stays small and halves when it does not.
defineKind('shader-warm', { lateUpdate: 2400 });
function castShadows(casters: THREE.Object3D[]) {
  return new Promise<void>((resolve) => {
    let next = 0,
      size = 4,
      wgsl = bootSpanMs('wgsl');
    const unculled: THREE.Object3D[] = [];
    const warm = spawn({
      kind: 'shader-warm',
      lateUpdate() {
        for (const o of unculled) o.frustumCulled = true;
        unculled.length = 0;
        const spent = bootSpanMs('wgsl') - wgsl;
        size = spent > 6 ? Math.max(1, size >> 1) : spent < 2 ? Math.min(256, size * 2) : size;
        if (next >= casters.length) {
          despawn(warm);
          return resolve();
        }
        for (const end = Math.min(casters.length, next + size); next < end; next++) {
          const o = casters[next]!;
          if (o.parent && o.frustumCulled) {
            o.frustumCulled = false;
            unculled.push(o);
          }
        }
        wgsl = bootSpanMs('wgsl');
      },
    });
  });
}

async function compileRest() {
  const start = performance.now();
  const wgsl0 = bootSpanMs('wgsl');
  const left = new Set<THREE.Object3D>();
  scene.traverse((o) => void (drawable(o) && left.add(o)));
  // Each chunk is the nearest of what is left to the camera as it is then, so once the player jumps in, the arrival's
  // surroundings come next wherever the lobby looked. A ring ends when the nearest left is past it: then its casters.
  let ring = 0;
  let inRing: THREE.Object3D[] = [];
  const endRing = async () => {
    if (ring === 0) await builtLater(deferred); // what the player soon holds, wears or flops with
    const at = camera.getWorldPosition(new THREE.Vector3());
    const mine = new Set(inRing);
    const casters: THREE.Object3D[] = [];
    scene.traverseVisible((o) => void (o.castShadow && mine.has(o) && casters.push(o)));
    casters.sort((a, b) => reach(a, at) - reach(b, at));
    await castShadows(casters);
    bootMark(`shaders-ring-${ring}`, { objects: inRing.length, casters: casters.length });
    inRing = [];
    ring++;
  };
  while (left.size) {
    scene.updateMatrixWorld();
    const at = camera.getWorldPosition(new THREE.Vector3());
    const near = [...left].map((o) => [reach(o, at), o] as const).sort((a, b) => a[0] - b[0]);
    while (near[0]![0] > RINGS[ring]!) await endRing();
    const chunk = near
      .slice(0, CHUNK)
      .filter(([d]) => d <= RINGS[ring]!)
      .map(([, o]) => o);
    for (const o of chunk) left.delete(o);
    inRing.push(...chunk);
    await inTurn(() => compileSome(chunk));
  }
  while (ring < RINGS.length) await endRing();
  await lateBuilt();
  await gpuDone();
  allDone = true;
  const p = (renderer as unknown as { _pipelines?: { caches: Map<unknown, unknown> } })._pipelines;
  bootMark('shaders-all', {
    ms: Math.round(performance.now() - start),
    pipelines: p ? p.caches.size : -1,
    programs: renderer.info.memory.programs ?? -1,
    wgsl: bootSpanMs('wgsl') - wgsl0,
    late: late.pipelines,
    held: late.held,
  });
}

async function builtLater(list: Warmup[]) {
  for (const make of list) {
    const made = await make();
    if ((made as THREE.Object3D | null)?.isObject3D) await compile(made as THREE.Object3D);
  }
}

/** For the device report: pipelines still building, and those built late (in all, and after pass 2 finished). */
export const shaderStats = () => ({ building: building.size, ...late, allDone });
