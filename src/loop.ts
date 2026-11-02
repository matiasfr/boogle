// Frame-loop hooks, so features plug in without editing main.ts.
//
//   onFrame(fn, { phase, order })   fn({ now, dt, elapsed }) every frame; lower order runs first, ties run in
//                                   registration (import) order
//     phase 'world'  right after the physics step (gameplay reacting to physics)
//     phase 'update' visual sync and camera (core, below -100), then the features (default: most features)
//     phase 'late'   just before render (HUD, previews, uniforms; presence send and render come last)
//   onStart(fn)                     once, after input/lobby/network start (right away if that already happened)
//
// main.ts runs, before the step: updateRemotes, resolveBallOwner, updateIntent, prepareBall, world.step. The core
// modules then hook in at orders features leave alone (pick an order between these, never equal to one):
//   world   -300 ball.ts: an owned ball off the island respawns; ball.disp follows the body
//           -290 player.ts: fall respawn         -280 ball.ts: walking into a slow ball claims it
//   update  -300 ball.ts: ball mesh              -290 player.ts: own avatar       -280 net.ts: remote avatars
//           -200 player.ts: camera               -190 props.ts: clouds            -150 assets.ts: glTF clips
//           (features: -10 and up)
//   late    -200 throw.ts: throw preview        -190 hud.ts: HUD                 -20 particles.ts: particles
//           (features: -10 to 2000)
//           3000 net.ts: presence send           3010 water-render.ts: sea uTime  (then main.ts renders)
//
// New features: add a file in src/features/ that imports what it needs (including its own CSS) and calls
// onFrame/onStart. main.ts loads every file in src/features/ automatically.
//
// Lazy parts (faster first load): a feature stays a small eager file and loads its heavy or rarely used part with a
// dynamic import(), e.g. `onStart(() => import('../pois/caves/index.ts'))` (src/features/pois.ts) or
// `if (flag) import('../debug/netdebug.ts')` (src/features/syncsafety.ts). The lazy module registers its own hooks when
// it arrives: onStart then runs at once, and onFrame hooks slot in by order (ties: after the eager ones). Never lazy:
// anything that registers sync ops or state (src/world/sync.ts), the rules modules (src/world/rules/), or anything a
// player sees in the first seconds near spawn. Lockstep must not depend on load timing.

export type FrameCtx = { now: number; dt: number; elapsed: number };
export type Phase = 'world' | 'update' | 'late';
type Hook = { fn: (ctx: FrameCtx) => void; order: number; name: string };
type Section = { name: string; ring: Float32Array; last: number };
export type FrameOpts = { phase?: Phase; order?: number; name?: string };

const hooks: Record<Phase, Hook[]> = { world: [], update: [], late: [] };
const starts: (() => void)[] = [];
let started = false;

// Profiling, always on (two performance.now() calls per hook, a few µs a frame). Every hook and main.ts's own
// sections (pre-step, physics, render) keep their last WINDOW frames of CPU time. A hook's name is its module path
// (vite.config.js passes it in through onFrame.in), or `name` in its options, else its phase and order.
//   prof.table(n)   the n most expensive sections: { name, avg, p95, max } in ms over the window, plus 'frame' (total)
//   prof.last       the frame just finished: { ms, top, topMs } (its slowest section), for the hitch log
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
const last = { ms: 0, top: '', topMs: 0 };
function record(name: string, ms: number) {
  let s = sections.get(name);
  if (!s) {
    sections.set(name, (s = { name, ring: new Float32Array(WINDOW), last: 0 }));
    list.push(s);
  }
  s.ring[slot] += ms;
  s.last += ms;
}
export function beginFrame() {
  slot = (slot + 1) % WINDOW;
  for (let k = 0; k < list.length; k++) {
    list[k].ring[slot] = 0;
    list[k].last = 0;
  }
  cursor = frameStart = performance.now();
  frameId = ++frames;
}
export function mark(name: string) {
  const t = performance.now();
  record(name, t - cursor);
  cursor = t;
}
export function endFrame(name: string) {
  mark(name);
  frameId = 0;
  last.ms = cursor - frameStart;
  record('frame', last.ms);
  last.topMs = 0;
  for (let k = 0; k < list.length; k++) {
    const s = list[k];
    if (s.name !== 'frame' && s.last > last.topMs) {
      last.topMs = s.last;
      last.top = s.name;
    }
  }
}
export const prof = {
  last,
  table(n = 12) {
    const rows: { name: string; avg: number; p95: number; max: number }[] = [];
    for (const { name, ring } of list) {
      const sorted = Float32Array.from(ring).sort();
      const avg = sorted.reduce((a, b) => a + b, 0) / WINDOW;
      const r = (x: number) => Math.round(x * 1000) / 1000;
      rows.push({ name, avg: r(avg), p95: r(sorted[Math.floor(WINDOW * 0.95)]), max: r(sorted[WINDOW - 1]) });
    }
    return rows.sort((a, b) => b.avg - a.avg).slice(0, n + 1);
  },
};

export function onFrame(fn: (ctx: FrameCtx) => void, { phase = 'update', order = 0, name }: FrameOpts = {}) {
  const list = hooks[phase];
  if (!list) throw new Error(`onFrame: unknown phase ${phase}`);
  list.push({ fn, order, name: name ?? `${phase} ${order}` });
  list.sort((a, b) => a.order - b.order);
}
// vite.config.js rewrites `onFrame(` in each module under src/ to `onFrame.in('<path>')(`, so hooks carry their file.
onFrame.in = (file: string) => (fn: (ctx: FrameCtx) => void, opts?: FrameOpts) => onFrame(fn, { name: file, ...opts });
export function onStart(fn: () => void) {
  if (started) fn();
  else starts.push(fn);
}
export function runFrame(phase: Phase, ctx: FrameCtx) {
  const list = hooks[phase];
  for (let k = 0; k < list.length; k++) {
    list[k].fn(ctx);
    mark(list[k].name);
  }
}
export function runStart() {
  started = true;
  for (const fn of starts) fn();
}
