// Debug handle for scripts that drive the built game (the nightly smoke test, dev/scenarios/smoke.ts). The deployed
// site has no /src/ modules to import, so the shared world is reached through `window.boogle.sync`:
//   world, worldStatus(), stateHashes(), submitEdit(e)   straight from src/world/sync.ts
//   markHashes(tick), hashesAt(tick)   per-state hashes at `tick` (current tick captured immediately; past misses stay null)
//   captureHashes(on), hashTicks()   bounded, temporary history for slow two-tab checks; off during normal play
//   gfx                                'webgpu' once the renderer is up (null while starting)
//   tossBall(charge)                   grab the ball wherever it is and throw it (the real grab and throw, no walk)
// Read-only for the sim: the tick hook only hashes. Serves "Determinism from day one" (a live desync gets caught).
import { onStart } from '../loop.ts';
import { world, worldStatus, stateHashes, submitEdit, onAfterTick } from '../world/sync.ts';
import { gfx } from '../render/scene.ts';
import { grabBall, throwBall } from '../entities/ball/state.ts';
import { launch } from '../player/throw.ts';

const marks = new Map<number, ReturnType<typeof stateHashes> | null>();
let capturing = false;
function record(tick: number) {
  marks.set(tick, stateHashes());
  if (marks.size > 256) marks.delete(marks.keys().next().value!);
}

const sync = {
  world,
  worldStatus,
  stateHashes,
  submitEdit,
  markHashes(tick: number) {
    // A page evaluation runs between complete ticks. Never relabel today's state as a missed earlier tick.
    if (tick === world.tick) record(tick);
    else if (!marks.has(tick)) marks.set(tick, null);
  },
  hashesAt: (tick: number) => marks.get(tick) ?? null,
  captureHashes(on: boolean) {
    marks.clear();
    capturing = on;
    if (on) record(world.tick);
  },
  hashTicks: () => [...marks].filter(([, hashes]) => hashes !== null).map(([tick]) => tick),
  tossBall(charge = 0.5) {
    grabBall();
    const { p, v } = launch('ball', charge);
    throwBall(p, v);
  },
};
export type SyncHandle = typeof sync;

onStart(() => {
  // After every onTick handler and before the host hashes, so a mark sees the tick's final state (what sync hashes).
  onAfterTick((t) => {
    // One sample per simulation second, on the SAME tick grid in both tabs. The history survives slow browser
    // evaluations and snapshot jumps; 256 samples exceed the scenario's three-minute observation window.
    if (marks.has(t) || (capturing && t % 10 === 0)) record(t);
  });
  if (!window.boogle) return;
  // A getter: onStart can run before the renderer's init() resolves.
  Object.defineProperty(window.boogle, 'gfx', { get: gfx, enumerable: true });
  window.boogle.sync = sync;
});
