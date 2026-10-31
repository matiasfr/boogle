// The offline helper bank (src/world/rules/bank.js): when this tab starts hosting a saved world, it measures how long
// nobody hosted and submits that gap once, as the host; the helper huts' freight for it (capped at one section) lands
// in the open Track ring, and the machine waits for a player to start it. Serves DESIGN.md 9 (leave something for the
// next visitor: the island did some work while you were away). Lockstep, from a host-only measurement.
import { rules } from '../world/game-world.js'; // first: the lockstep rules register before anything else
import { world, onHostStart, setEnv, submitEdit } from '../world/sync.js';
import { net } from '../netplay/net.js';
import { offlineGap, MIN_GAP_MS } from '../sim/bank.js';

onHostStart(({ loaded }) => {
  if (!loaded || !net.room) return;
  const gapMs = offlineGap(Date.now(), world.epochMs, world.tick, rules.bank.ms());
  if (gapMs < MIN_GAP_MS) return;
  setEnv({ gapMs, hostSelf: net.room.selfId }); // only this submit, from this tab, with this number, passes validate
  submitEdit({ op: 'bank.wake', i: 0, j: 0, ms: gapMs });
  setEnv({ gapMs: null, hostSelf: null });
});
