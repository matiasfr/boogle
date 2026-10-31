// The game's world: the island's land and the lockstep rules installed on the real sync. The only non-test caller of
// installRules. Every adapter that reads rules state imports this first, so the rules register before anything else.
import { GRID_RES } from './grid.js';
import { world, registerOp, registerState, onTick, onApplied, onSnapshot } from './sync.js';
import { installRules } from './rules/index.js';

// Static and the same on every peer. layout is filled by reference before tick 1 (rules must not read it at install).
/** @type {import('./rules/types.ts').Land} */
export const land = { n: GRID_RES, layout: { trees: [], perches: [] } };
export const rules = installRules({ world, registerOp, registerState, onTick, onApplied, onSnapshot }, land);
