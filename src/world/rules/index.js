// The lockstep rules, one module per system (see ./README.md). RULES is the canonical order: states snapshot, load and
// hash in it, and ops, ticks and sim listeners register in it. APPEND ONLY: reordering it desyncs mixed-build rooms.
import * as terrain from './terrain.js';

export const RULES = [terrain];

// Installs every rules module on a sync (the real one in game-world.js, fresh ones in tests). Each gets a view of the
// sync without submitEdit (rules react to edits, they never make them), the land, and the APIs of the modules before it.
export function installRules(sync, land, opts = {}) {
  const view = {
    world: sync.world,
    registerOp: sync.registerOp,
    registerState: sync.registerState,
    onTick: sync.onTick,
    onApplied: sync.onApplied,
    onSnapshot: sync.onSnapshot,
  };
  const o = { clock: () => 0, ...opts };
  const rules = {};
  for (const m of RULES) rules[m.name] = m.install(view, land, rules, o);
  return rules;
}
