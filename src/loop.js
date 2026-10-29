// Frame-loop hooks, so features plug in without editing main.js.
//
//   onFrame(fn, { phase, order })   fn({ now, dt, elapsed }) every frame
//     phase 'world'  right after the physics step (gameplay reacting to physics)
//     phase 'update' after camera/visual sync (default: most features)
//     phase 'late'   just before render (HUD, previews, uniforms)
//   onStart(fn)                     once, after input/lobby/network start
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
