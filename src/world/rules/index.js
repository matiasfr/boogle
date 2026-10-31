// The lockstep rules, one module per system (see ./README.md). RULES is the canonical order: states snapshot, load and
// hash in it, and ops, ticks and sim listeners register in it. APPEND ONLY: reordering it desyncs mixed-build rooms.
// The list restarted with the 0.1 namespace (../namespace.ts): terrain, proto and water were retired then.
import * as mushrooms from './mushrooms.js';
import * as gifts from './gifts.js';
import * as roster from './roster.ts';
import * as stacks from './stacks.ts';
import * as piles from './piles.ts';
import * as sites from './sites.ts';
import * as sources from './sources.ts';
import * as bank from './bank.ts';

export const RULES = [mushrooms, gifts, roster, stacks, piles, sites, sources, bank];

// Installs every rules module on a sync (the real one in game-world.js, fresh ones in tests). Each gets a view of the
// sync without submitEdit (rules react to edits, they never make them), the land, and the APIs of the modules before it.
/** @returns {import('./types.ts').Rules} */
export function installRules(sync, land) {
  const view = {
    world: sync.world,
    registerOp: sync.registerOp,
    registerState: sync.registerState,
    onTick: sync.onTick,
    onApplied: sync.onApplied,
    onSnapshot: sync.onSnapshot,
  };
  const rules = {};
  for (const m of RULES) rules[m.name] = m.install(view, land, rules);
  return rules;
}
