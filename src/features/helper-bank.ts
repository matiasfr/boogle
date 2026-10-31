// The offline helper bank (src/world/rules/bank.ts): when this tab starts hosting a saved world, it measures how long
// nobody hosted and submits that gap as the host's own bank.wake; the helper huts' freight for it (capped at one
// section) lands in the open Track ring, and the machine waits for a player to start it. Serves DESIGN.md 9 (leave
// something for the next visitor: the island did some work while you were away). Lockstep, from a host measurement.
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import { world, onSnapshot, submitEdit, worldStatus } from '../world/sync.ts';
import { offlineGap, MIN_GAP_MS } from '../sim/bank.ts';

// A host's onSnapshot fires once it holds the world (a save, or fresh with epochMs = now: no gap); a live migration
// keeps its state and fires nothing, so a hand-over never banks.
onSnapshot(() => {
  // A state that failed to load started fresh: its bank would count time already banked, so skip this wake.
  if (worldStatus().mode !== 'host' || worldStatus().loadErrors) return;
  const ms = offlineGap(Date.now(), world.epochMs, world.tick, rules.bank.ms());
  if (ms >= MIN_GAP_MS) submitEdit({ op: 'bank.wake', i: 0, j: 0, ms });
});
