// Game entities: one shape and lifecycle for a thing in the world or on screen with its own lifetime. A service other
// things call stays a plain onFrame hook (docs/plans/entity-architecture.md, "Entity or system").
//
//   defineKind('ball', { postPhysics: -300, update: -300 });   once per kind, at module top level: an order per phase
//   const ball = spawn({ id: 'ball', kind: 'ball', alive: true, mesh, bodies: [body], update(ctx) {...} });
//   despawn(ball);
//
// Lifecycle contract:
// - spawn(e) takes a finished entity and adds its mesh (unless already parented) and bodies now, so the factory sets the
//   pose first. It throws if the kind is undefined, or if e has a method its kind declares no order for (it would never
//   run).
// - A new entity's first call is the next walk of that phase to start after the spawn, this frame or next. Walkers cache
//   the length first, so spawning during a walk is safe.
// - despawn(e) is idempotent and sets alive = false at once; walkers skip dead entities, so methods needn't check.
//   Teardown runs at the end of the phase: mesh and bodies go, then dispose(). A despawn between frames or in a fixed-step
//   method waits for the next flush, at the end of the next frame phase. An entity spawns once: a new one is a new object.
// - defineKind runs once per kind, at module top level; defining a kind twice throws. onPreStep, addPresenceField and
//   onRemotePresence have no unregister, so they too are registered per kind, never per instance.
// - No start and no enable: the module graph and onStart do that job.
// - A method that throws is caught and reported (reportError, so scenarios fail on it), and that kind's phase turns off for
//   good: a missing kind beats a frozen game.
// - No per-frame allocation: one closure per kind and phase, made in defineKind, and teardown removes from lists in place.
//
// One kind has one slot per phase. An object that needs two slots in a phase is two kinds (`ball` and `ball-carry`), as a
// Unity object has several components. Orders are literals, so `npm run registry` can read them.
//
// Phases, and the hook each one runs on (src/loop.ts has both order tables):
//   fixedPre     onPreStep    each physics step, 0 to 4 times a frame; ctx.dt is FIXED, now and elapsed are the frame's
//   fixedPost    onPostStep   the same, after the step
//   prePhysics   prePhysics   once a frame, before the step
//   postPhysics  world        once a frame, after it
//   update       update       visual sync
//   lateUpdate   late         just before render
// Each kind and phase gets its own row in the profiler, named `<kind> <phase>`.
import type { Object3D } from 'three/webgpu';
import { FIXED } from '../constants.ts';
import { currentFrame, frameCtx, mark, onFrame, type FrameCtx, type Phase } from '../loop.ts';
import { addBody, onPostStep, onPreStep, removeBody, type Body } from '../physics/engine.ts';
import { scene } from '../render/scene.ts';
import { createWalkers, type EntityPhase, type KindOrders } from './walker.ts';

export type { EntityPhase };
export interface GameEntity {
  readonly id: string; // local only, never a network id
  readonly kind: string;
  alive: boolean;
  mesh?: Object3D;
  bodies?: readonly Body[]; // from engine.ts, never RAPIER.RigidBody
  fixedPre?(ctx: FrameCtx): void; // each physics step, 0 to 4 times a frame; ctx.dt is FIXED
  fixedPost?(ctx: FrameCtx): void;
  prePhysics?(ctx: FrameCtx): void; // once a frame, before the step
  postPhysics?(ctx: FrameCtx): void; // once a frame, after it
  update?(ctx: FrameCtx): void; // visual sync
  lateUpdate?(ctx: FrameCtx): void; // just before render
  dispose?(): void;
}

const FRAME_PHASE = { prePhysics: 'prePhysics', postPhysics: 'world', update: 'update', lateUpdate: 'late' } as const;
const fixedCtx: FrameCtx = { now: 0, dt: FIXED, elapsed: 0 };

// A fixed-step walk gets its own profiler row out of 'main: physics', which it runs inside.
function fixedHook(name: string, walk: (ctx: FrameCtx) => void) {
  return () => {
    fixedCtx.now = frameCtx.now;
    fixedCtx.elapsed = frameCtx.elapsed;
    const timed = currentFrame() !== 0; // not stepFixed() from a scenario, between frames
    if (timed) mark('main: physics');
    walk(fixedCtx);
    if (timed) mark(name);
  };
}

const walkers = createWalkers<GameEntity>({
  addHook(phase: EntityPhase, order, name, walk) {
    if (phase === 'fixedPre') onPreStep(fixedHook(name, walk), { order });
    else if (phase === 'fixedPost') onPostStep(fixedHook(name, walk), { order });
    else onFrame(walk, { phase: FRAME_PHASE[phase], order, name });
  },
  attach(e) {
    if (e.mesh && !e.mesh.parent) scene.add(e.mesh);
    if (e.bodies) for (const b of e.bodies) addBody(b);
  },
  detach(e) {
    e.mesh?.removeFromParent();
    if (e.bodies) for (const b of e.bodies) removeBody(b);
  },
  reportError(err, where) {
    console.error(`[entity] ${where} threw; it stays off until the page reloads`);
    reportError(err);
  },
});

// The end of each frame phase: after every other hook in it.
const FLUSH_ORDER = Number.MAX_SAFE_INTEGER;
for (const phase of ['prePhysics', 'world', 'update', 'late'] as Phase[])
  onFrame(walkers.flush, { phase, order: FLUSH_ORDER, name: 'entity teardown' });

/** For `npm run hitches`, to name each kind's allocation row. */
export const entityMethods: () => Record<string, (ctx: FrameCtx) => void> = walkers.methods;
export const defineKind: (kind: string, orders: KindOrders) => void = walkers.defineKind;
export const spawn: <T extends GameEntity>(entity: T) => T = walkers.spawn;
export const despawn: (entity: GameEntity) => void = walkers.despawn;

let lastId = 0;
/** An id for one of many short-lived entities: `ping-12`. Local, never a network id. */
export const nextId = (kind: string) => `${kind}-${++lastId}`;
