// Frame-loop hooks, so features plug in without editing main.ts.
//
//   onFrame(fn, { phase, order })   fn({ now, dt, elapsed }) every frame; lower order runs first, ties run in
//                                   registration (import) order
//     phase 'prePhysics' once a frame, before the physics step (intent, remote poses); core only so far
//     phase 'world'  right after the physics step (gameplay reacting to physics)
//     phase 'update' visual sync and camera (core, below -100), then the features
//     phase 'late'   just before render (HUD, previews, uniforms; presence send and render come last)
//   onStart(fn)                     once, after input/lobby/network start (right away if that already happened)
//
// main.ts runs prePhysics, the physics step, then world, update and late, then renders. Entities (src/entity/entity.ts) run
// on these same lists: each kind registers one hook per phase it declares, at the order in its defineKind. Their phases map
// postPhysics to world, update to update, lateUpdate to late, and fixedPre and fixedPost to onPreStep and onPostStep below.
// Core orders, which features leave alone (pick an order between these, never equal to one; `npm run registry -- --json`
// lists the features' too). Bare names are kinds, and files are services on a plain hook:
//   prePhysics  -100 remote-player: remote poses   -80 player-intent: intent (reads what is in your hand, writes me.yaw)
//   world   -290 player: fall respawn
//   update  -290 player-view: own avatar         -280 remote-player: remote avatars
//           -200 camera                          -190 cloud                       -150 assets.ts: glTF clips
//           -60 conversation                     -10 world.ts: room clock         -5 sky, guest
//           (features: -10 and up; the beach ball, a toy, runs there: src/entities/ball/headless.ts)
//   late    -200 throw-preview                   -190 hud                         -20 particles.ts: particles
//           (features: -10 to 2000)
//           2500 adaptive-res.ts   3000 net.ts: presence send   3010 sea: its uTime   (then main.ts renders)
// After every other hook in a frame phase, entity teardown runs (the end of that phase).
//
// The fixed step (src/physics/engine.ts) has its own lists, walked 0 to 4 times a frame around each physics step: lower
// order first, ties in registration order. The orders below are pinned; moving one is a change of behaviour and gets
// its own commit. No order means 1000: prototypes and anything unnumbered run after all of these.
//   onPreStep   10 platforms.ts: decks move    20 free   30 player-jump: jump shape, snap
//               39 remote-player: body targets  40 player: its controller   45 ball: friction and surf
//               50 boogler: his body follows him   60 boogler-ride: carry the rider, launches
//               70 windmills: sails spin       80 caves: the safety net   90 guest: the guest's body (lazy)
//   onPostStep  10 mushroom-bounce   15 ball: fall-through net
//               20 player: its fall-through net, ground contact (coyote)
//               30 boogler-ride: standing on him
//
// New features: add a file in src/features/ that imports what it needs (including its own CSS) and spawns entities
// (src/entity/entity.ts) or, for a service other things call, uses onFrame/onStart. main.ts loads every file in
// src/features/ automatically.
//
// Lazy parts (faster first load): a feature stays a small eager file and loads its heavy or rarely used part with a
// dynamic import(), e.g. `onStart(() => import('../pois/caves/index.ts'))` (src/features/pois.ts) or
// `if (flag) import('../debug/netdebug.ts')` (src/features/syncsafety.ts). The lazy module registers its own hooks when
// it arrives: onStart then runs at once, and onFrame hooks slot in by order (ties: after the eager ones). Never lazy:
// anything the server mirrors need at boot (src/world/game-world.ts), or anything a
// player sees in the first seconds near spawn. Shared state must not depend on load timing.

import { beginStartupFrame, recordStartupFrame } from './boot/startup-frames.ts';

export type FrameCtx = { now: number; dt: number; elapsed: number };
/** The one object every hook of every frame gets (no per-frame garbage); main.ts fills it before prePhysics. */
export const frameCtx: FrameCtx = { now: 0, dt: 0, elapsed: 0 };
export type Phase = 'prePhysics' | 'world' | 'update' | 'late';
type Hook = { fn: (ctx: FrameCtx) => void; order: number; name: string };
type Section = { name: string; ring: Float32Array; last: number };
export type FrameOpts = { phase?: Phase; order?: number; name?: string };

const hooks: Record<Phase, Hook[]> = { prePhysics: [], world: [], update: [], late: [] };
const starts: (() => void)[] = [];
let started = false;

// Profiling, always on (two performance.now() calls per hook, a few µs a frame). Every hook and main.ts's own
// sections (physics, render) keep their last WINDOW frames of CPU time. A hook's name is its module path
// (vite.config.ts passes it in through onFrame.in), or `name` in its options, else its phase and order.
//   prof.table(n)   the n most expensive sections: { name, avg, p95, max } in ms over the window, plus 'frame' (total)
//   prof.last       { frames } completed, plus { ms, top, topMs } for the last frame (its slowest section)
// main.ts marks its sections: beginFrame(), mark(name) after each, endFrame(name) after render.
const WINDOW = 240;
const sections = new Map<string, Section>(); // name -> { name, ring: Float32Array(WINDOW), last: ms this frame }
const list: Section[] = []; // the same sections, for allocation-free loops
let slot = 0;
let cursor = 0;
let frameStart = 0;
let frames = 0;
let frameId = 0; // frames counted from 1 while one runs, 0 between frames (input events, timers)
/** The frame running now (1, 2, ...), or 0 outside one: a key for caches that hold for one frame's hooks. */
export const currentFrame = () => frameId;
const last = { frames: 0, ms: 0, top: '', topMs: 0 };
function record(name: string, ms: number) {
  let s = sections.get(name);
  if (!s) {
    sections.set(name, (s = { name, ring: new Float32Array(WINDOW), last: 0 }));
    list.push(s);
  }
  s.ring[slot]! += ms;
  s.last += ms;
}
export function beginFrame() {
  slot = (slot + 1) % WINDOW;
  for (let k = 0; k < list.length; k++) {
    list[k]!.ring[slot] = 0;
    list[k]!.last = 0;
  }
  cursor = frameStart = performance.now();
  beginStartupFrame(frameStart);
  frameId = ++frames;
}
export function mark(name: string) {
  const t = performance.now();
  record(name, t - cursor);
  cursor = t;
}
export function endFrame(name: string, rendered = true) {
  mark(name);
  frameId = 0;
  if (!rendered) {
    record('frame', cursor - frameStart);
    recordStartupFrame(frameStart, null);
    return;
  }
  last.frames++; // completed renders, not callbacks skipped by the Local output cap
  last.ms = cursor - frameStart;
  record('frame', last.ms);
  last.topMs = 0;
  for (let k = 0; k < list.length; k++) {
    const s = list[k]!;
    if (s.name !== 'frame' && s.last > last.topMs) {
      last.topMs = s.last;
      last.top = s.name;
    }
  }
  recordStartupFrame(frameStart, last);
}
export const prof = {
  last,
  table(n = 12) {
    const rows: { name: string; avg: number; p95: number; max: number }[] = [];
    for (const { name, ring } of list) {
      const sorted = Float32Array.from(ring).sort();
      const avg = sorted.reduce((a, b) => a + b, 0) / WINDOW;
      const r = (x: number) => Math.round(x * 1000) / 1000;
      rows.push({ name, avg: r(avg), p95: r(sorted[Math.floor(WINDOW * 0.95)]!), max: r(sorted[WINDOW - 1]!) });
    }
    return rows.sort((a, b) => b.avg - a.avg).slice(0, n + 1);
  },
};

// Vite's flag; this file also loads in Node (unit tests), where import.meta.env doesn't exist.
const DEV = !!(import.meta as { env?: { DEV?: boolean } }).env?.DEV;

export function onFrame(fn: (ctx: FrameCtx) => void, { phase = 'update', order = 0, name }: FrameOpts = {}) {
  const list = hooks[phase];
  if (!list) throw new Error(`onFrame: unknown phase ${phase}`);
  // The sort below would reorder the list runFrame is walking, repeating or skipping a hook. Register at module top
  // level or from onStart; a lazy module's top level runs between frames.
  if (DEV && frameId !== 0) throw new Error(`onFrame called during a frame (${name ?? `${phase} ${order}`})`);
  list.push({ fn, order, name: name ?? `${phase} ${order}` });
  list.sort((a, b) => a.order - b.order);
}
// vite.config.ts rewrites `onFrame(` in each module under src/ to `onFrame.in('<path>')(`, so hooks carry their file.
onFrame.in = (file: string) => (fn: (ctx: FrameCtx) => void, opts?: FrameOpts) => onFrame(fn, { name: file, ...opts });
export function onStart(fn: () => void) {
  if (started) fn();
  else starts.push(fn);
}
export function runFrame(phase: Phase, ctx: FrameCtx) {
  const list = hooks[phase];
  for (let k = 0; k < list.length; k++) {
    list[k]!.fn(ctx);
    mark(list[k]!.name);
  }
}
export function runStart() {
  started = true;
  for (const fn of starts) fn();
}
