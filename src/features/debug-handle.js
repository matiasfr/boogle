// Debug handle for scripts that drive the built game (the nightly smoke test, dev/scenarios/smoke.mjs). The deployed
// site has no /src/ modules to import, so the shared world is reached through `window.boogle.sync`:
//   world, worldStatus(), stateHashes(), submitEdit(e)   straight from src/world/sync.js
//   markHashes(tick), hashesAt(tick)   per-state hashes as this tab ends `tick` (null until it has run here)
//   gfx                                'webgpu' or 'webgl2': the backend three is drawing with
//   tossBall(charge)                   grab the ball wherever it is and throw it (the real grab and throw, no walk)
// Read-only for the sim: the tick hook only hashes. Serves "Determinism from day one" (a live desync gets caught).
import { onStart } from '../loop.js';
import { world, worldStatus, stateHashes, submitEdit, onAfterTick } from '../world/sync.js';
import { renderer } from '../render/scene.js';
import { grabBall, throwBall } from '../physics/ball.js';

const marks = new Map(); // tick -> per-state hashes, null while waiting

onStart(() => {
  // After every onTick handler and before the host hashes, so a mark sees the tick's final state (what sync hashes).
  onAfterTick((t) => {
    if (marks.has(t)) marks.set(t, stateHashes());
  });
  if (!window.boogle) return;
  window.boogle.gfx = renderer.backend?.isWebGPUBackend ? 'webgpu' : 'webgl2';
  window.boogle.sync = {
    world,
    worldStatus,
    stateHashes,
    submitEdit,
    markHashes(tick) {
      marks.set(tick, null);
    },
    hashesAt: (tick) => marks.get(tick) ?? null,
    tossBall(charge = 0.5) {
      grabBall();
      throwBall(charge);
    },
  };
});
