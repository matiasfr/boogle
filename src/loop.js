// Frame-loop hooks, so features plug in without editing main.js.
//
//   onFrame(fn, { phase, order })   fn({ now, dt, elapsed }) every frame; lower order runs first, ties run in
//                                   registration (import) order
//     phase 'world'  right after the physics step (gameplay reacting to physics)
//     phase 'update' visual sync and camera (core, below -100), then the features (default: most features)
//     phase 'late'   just before render (HUD, previews, uniforms; presence send and render come last)
//   onStart(fn)                     once, after input/lobby/network start (right away if that already happened)
//
// main.js runs, before the step: updateRemotes, resolveBallOwner, updateIntent, prepareBall, world.step. The core
// modules then hook in at orders features leave alone (pick an order between these, never equal to one):
//   world   -300 ball.js: an owned ball off the island respawns; ball.disp follows the body
//           -290 player.js: fall respawn         -280 ball.js: walking into a slow ball claims it
//   update  -300 ball.js: ball mesh              -290 player.js: own avatar       -280 net.js: remote avatars
//           -200 player.js: camera               -190 props.js: clouds            (features: -10 and up)
//   late    -200 player.js: throw preview        -190 hud.js: HUD                 -20 particles.js: particles
//           (features: -10 to 2000)
//           3000 net.js: presence send           3010 water-render.js: sea uTime  (then main.js renders)
//
// New features: add a file in src/features/ that imports what it needs (including its own CSS) and calls
// onFrame/onStart. main.js loads every file in src/features/ automatically.
//
// Lazy parts (faster first load): a feature stays a small eager file and loads its heavy or rarely used part with a
// dynamic import(), e.g. `onStart(() => import('../pois/caves/index.js'))` (src/features/pois.js) or
// `if (flag) import('../debug/netdebug.js')` (src/features/syncsafety.js). The lazy module registers its own hooks when
// it arrives: onStart then runs at once, and onFrame hooks slot in by order (ties: after the eager ones). Never lazy:
// anything that registers sync ops or state (src/world/sync.js), the rules modules (src/world/rules/), or anything a
// player sees in the first seconds near spawn. Lockstep must not depend on load timing.

const hooks = { world: [], update: [], late: [] };
const starts = [];
let started = false;

// Profiling, always on (two performance.now() calls per hook, a few µs a frame). Every hook and main.js's own
// sections (pre-step, physics, render) keep their last WINDOW frames of CPU time. A hook's name is its module path
// (vite.config.js passes it in through onFrame.in), or `name` in its options, else its phase and order.
//   prof.table(n)   the n most expensive sections: { name, avg, p95, max } in ms over the window, plus 'frame' (total)
//   prof.last       the frame just finished: { ms, top, topMs } (its slowest section), for the hitch log
// main.js marks its sections: beginFrame(), mark(name) after each, endFrame(name) after render.
const WINDOW = 240;
const sections = new Map(); // name -> Float32Array(WINDOW)
let slot = 0;
let cursor = 0;
let frameStart = 0;
const last = { ms: 0, top: '', topMs: 0 };
const lastTimes = new Map(); // name -> ms this frame
function record(name, ms) {
  let ring = sections.get(name);
  if (!ring) sections.set(name, (ring = new Float32Array(WINDOW)));
  ring[slot] += ms;
  lastTimes.set(name, (lastTimes.get(name) ?? 0) + ms);
}
export function beginFrame() {
  slot = (slot + 1) % WINDOW;
  for (const ring of sections.values()) ring[slot] = 0;
  for (const n of lastTimes.keys()) lastTimes.set(n, 0);
  cursor = frameStart = performance.now();
}
export function mark(name) {
  const t = performance.now();
  record(name, t - cursor);
  cursor = t;
}
export function endFrame(name) {
  mark(name);
  record('frame', cursor - frameStart);
  last.ms = cursor - frameStart;
  last.topMs = 0;
  for (const [n, ms] of lastTimes)
    if (n !== 'frame' && ms > last.topMs) {
      last.topMs = ms;
      last.top = n;
    }
}
export const prof = {
  last,
  table(n = 12) {
    const rows = [];
    for (const [name, ring] of sections) {
      const sorted = Float32Array.from(ring).sort();
      const avg = sorted.reduce((a, b) => a + b, 0) / WINDOW;
      const r = (x) => Math.round(x * 1000) / 1000;
      rows.push({ name, avg: r(avg), p95: r(sorted[Math.floor(WINDOW * 0.95)]), max: r(sorted[WINDOW - 1]) });
    }
    return rows.sort((a, b) => b.avg - a.avg).slice(0, n + 1);
  },
};

export function onFrame(fn, { phase = 'update', order = 0, name } = {}) {
  const list = hooks[phase];
  if (!list) throw new Error(`onFrame: unknown phase ${phase}`);
  list.push({ fn, order, name: name ?? `${phase} ${order}` });
  list.sort((a, b) => a.order - b.order);
}
// vite.config.js rewrites `onFrame(` in each module under src/ to `onFrame.in('<path>')(`, so hooks carry their file.
onFrame.in = (file) => (fn, opts) => onFrame(fn, { name: file, ...opts });
export function onStart(fn) {
  if (started) fn();
  else starts.push(fn);
}
export function runFrame(phase, ctx) {
  for (const h of hooks[phase]) {
    h.fn(ctx);
    mark(h.name);
  }
}
export function runStart() {
  started = true;
  for (const fn of starts) fn();
}
