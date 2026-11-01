// The lockstep rules, one module per system (see ./README.md). RULES is the canonical order: states snapshot, load and
// hash in it, and ops, ticks and sim listeners register in it. APPEND ONLY: reordering it desyncs mixed-build rooms.
// The list restarted with the 0.1 namespace (../namespace.ts): terrain, proto and water were retired then.
import * as mushrooms from './mushrooms.ts';
import * as gifts from './gifts.ts';
import * as roster from './roster.ts';
import * as stacks from './stacks.ts';
import * as piles from './piles.ts';
import * as sites from './sites.ts';
import * as sources from './sources.ts';
import * as bank from './bank.ts';
import * as ball from './ball.ts';
import * as tune from './tune.ts';
import * as opening from './opening.ts';

import type { SyncView, Land, Rules } from './types.ts';

export const RULES = [mushrooms, gifts, roster, stacks, piles, sites, sources, bank, ball, tune, opening];

// Installs every rules module on a sync (the real one in game-world.js, fresh ones in tests). Each gets a view of the
// sync without submitEdit (rules react to edits, they never make them), the land, and the APIs of the modules before it.
export function installRules(sync: SyncView, land: Land): Rules {
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
    rules[m.name] = (m.install as (s: SyncView, l: Land, r: unknown) => unknown)(view, land, rules);
  return rules as Rules;
}
