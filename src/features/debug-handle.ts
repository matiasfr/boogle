// Debug handle for scripts that drive the built game (the nightly smoke test, dev/scenarios/smoke.ts). The deployed
// site has no /src/ modules to import, so the shared world is reached through `window.boogle.sync`:
//   world, worldStatus(), stateHashes(), submitEdit(e)   straight from src/world/sync.ts
//   markHashes(tick), hashesAt(tick)   per-state hashes as this tab ends `tick` (null until it has run here)
//   gfx                                'webgpu' once the renderer is up (null while starting)
//   tossBall(charge)                   grab the ball wherever it is and throw it (the real grab and throw, no walk)
// Read-only for the sim: the tick hook only hashes. Serves "Determinism from day one" (a live desync gets caught).
import { onStart } from '../loop.ts';
import { world, worldStatus, stateHashes, submitEdit, onAfterTick } from '../world/sync.ts';
import { gfx } from '../render/scene.ts';
import { grabBall, throwBall } from '../physics/ball.ts';
import { launch } from '../player/throw.ts';

const marks = new Map(); // tick -> per-state hashes, null while waiting

onStart(() => {
  // After every onTick handler and before the host hashes, so a mark sees the tick's final state (what sync hashes).
  onAfterTick((t) => {
    if (marks.has(t)) marks.set(t, stateHashes());
  });
  if (!window.boogle) return;
  // A getter: onStart can run before the renderer's init() resolves.
  Object.defineProperty(window.boogle, 'gfx', { get: gfx, enumerable: true });
  window.boogle.sync = {
    world,
    worldStatus,
    stateHashes,
    submitEdit,
    markHashes(tick: number) {
      marks.set(tick, null);
    },
    hashesAt: (tick: number) => marks.get(tick) ?? null,
    tossBall(charge = 0.5) {
      grabBall();
      const { p, v } = launch('ball', charge);
      throwBall(p, v);
    },
  };
});
