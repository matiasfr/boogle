// The game's world: the island's land and the lockstep rules installed on the real sync, and the railway's mirror. The only non-test caller of
// installRules. Every adapter that reads rules state imports this first, so the rules register before anything else.
import { GRID_RES } from './grid.ts';
import { world, registerOp, registerState, onTick, onApplied, onSnapshot } from './sync.ts';
import { installRules } from './rules/index.ts';
import type { Land } from './rules/types.ts';
import { productionRailway } from '../proto/flags.ts';
import { createRailwayMirror } from './railway-replicate.ts';

// Static and the same on every peer. layout is filled by reference before tick 1 (rules must not read it at install).
/** @type {import('./rules/types.ts').Land} */
export const land: Land = { n: GRID_RES, layout: { trees: [], perches: [] } };
export const rules = installRules({ world, registerOp, registerState, onTick, onApplied, onSnapshot }, land);
// The railway is Server-kind state (docs/plans/replication.md, R1a): no rules here, only the mirror the server fills.
export const railwayMirror = productionRailway ? createRailwayMirror() : null;

export const railTune = railwayMirror?.tune ?? null;
