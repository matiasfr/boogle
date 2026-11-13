// The lockstep rules, one module per system (see ./README.md). RULES is the canonical order: states snapshot, load and
// hash in it, and ops, ticks and sim listeners register in it. APPEND ONLY: reordering it desyncs mixed-build rooms.
// The list restarted with the 0.1 namespace (../namespace.ts): terrain, proto and water were retired then, mushrooms at v05, ball at v11.
import * as roster from './roster.ts';
import * as tune from './tune.ts';

import type { SyncView, Land, Rules } from './types.ts';

export const RULES = [roster, tune];

// Installs every rules module on a sync (the real one in game-world.ts, fresh ones in tests). Each gets a view of the
// sync without submitEdit (rules react to edits, they never make them), the land, and the APIs of the modules before it.
export function installRules(sync: SyncView, land: Land, rosterOwner?: () => roster.RosterApi): Rules {
  const view = {
    world: sync.world,
    registerOp: sync.registerOp,
    registerState: sync.registerState,
    onTick: sync.onTick,
    onApplied: sync.onApplied,
    onSnapshot: sync.onSnapshot,
  };
  const rules: Record<string, unknown> = {};
  // Each module's install takes the APIs of the modules before it; RULES' order guarantees they exist.
  for (const m of RULES)
    rules[m.name] =
      m.name === 'roster' && rosterOwner
        ? rosterOwner()
        : (m.install as (s: SyncView, l: Land, r: unknown) => unknown)(view, land, rules);
  return rules as Rules;
}
