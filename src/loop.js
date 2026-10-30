// Frame-loop hooks, so features plug in without editing main.js.
//
//   onFrame(fn, { phase, order })   fn({ now, dt, elapsed }) every frame; lower order runs first, ties run in
//                                   registration (import) order
//     phase 'world'  right after the physics step (gameplay reacting to physics)
//     phase 'update' visual sync and camera (core, below -100), then the features (default: most features)
//     phase 'late'   just before render (HUD, previews, uniforms; presence send and render come last)
//   onStart(fn)                     once, after input/lobby/network start
//
// main.js runs, before the step: updateRemotes, resolveBallOwner, updateIntent, prepareBall, world.step. The core
// modules then hook in at orders features leave alone (pick an order between these, never equal to one):
//   world   -300 ball.js: an owned ball off the island respawns; ball.disp follows the body
//           -290 player.js: fall respawn         -280 ball.js: walking into a slow ball claims it
//   update  -300 ball.js: ball mesh              -290 player.js: own avatar       -280 net.js: remote avatars
//           -200 player.js: camera               -190 props.js: clouds            (features: -10 and up)
//   late    -200 player.js: throw preview        -190 hud.js: HUD                 (features: -10 to 2000)
//           3000 net.js: presence send           3010 water-render.js: sea uTime  (then main.js renders)
//
// New features: add a file in src/features/ that imports what it needs (including its own CSS) and calls
// onFrame/onStart. main.js loads every file in src/features/ automatically.

const hooks = { world: [], update: [], late: [] };
const starts = [];

export function onFrame(fn, { phase = 'update', order = 0 } = {}) {
  const list = hooks[phase];
  if (!list) throw new Error(`onFrame: unknown phase ${phase}`);
  list.push({ fn, order });
  list.sort((a, b) => a.order - b.order);
}
export function onStart(fn) {
  starts.push(fn);
}
export function runFrame(phase, ctx) {
  for (const h of hooks[phase]) h.fn(ctx);
}
export function runStart() {
  for (const fn of starts) fn();
}
