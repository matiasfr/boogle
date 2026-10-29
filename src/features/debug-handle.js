// Debug handle for scripts that drive the built game (the nightly smoke test, dev/scenarios/smoke.mjs). The deployed
// site has no /src/ modules to import, so the shared world is reached through `window.boogle.sync`:
//   world, worldStatus(), stateHashes(), submitEdit(e), terrain   straight from src/world/sync.js and terrain-edits.js
//   markHashes(tick), hashesAt(tick)   per-state hashes as this tab ends `tick` (null until it has run here)
//   tossBall(charge)                   grab the ball wherever it is and throw it (the real grab and throw, no walk)
// Read-only for the sim: the tick hook only hashes. Serves "Determinism from day one" (a live desync gets caught).
import { onStart } from '../loop.js';
import { world, worldStatus, stateHashes, submitEdit, onTick } from '../world/sync.js';
import { terrain } from '../world/terrain-edits.js';
import { grabBall, throwBall } from '../ball.js';

const marks = new Map(); // tick -> per-state hashes, null while waiting

onStart(() => {
  // Registered at start, after every module's own onTick, so a mark sees the tick's final state (what sync hashes).
  onTick((t) => {
    if (marks.has(t)) marks.set(t, stateHashes());
  });
  if (!window.boogle) return;
  window.boogle.sync = {
    world,
    worldStatus,
    stateHashes,
    submitEdit,
    terrain,
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
