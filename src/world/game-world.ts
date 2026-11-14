// The game's static land and read-only server mirrors. Clients register no simulated or persisted world state.
import { GRID_RES } from './grid.ts';
import type { Land } from './rules/types.ts';
import { productionRailway } from '../proto/flags.ts';
import { createRailwayMirror } from './railway-replicate.ts';

// Static and the same on every peer. layout is filled by reference before tick 1 (rules must not read it at install).
export const land: Land = { n: GRID_RES, layout: { trees: [], perches: [] } };
// The railway is Server-kind state (docs/plans/replication.md, R1a): no rules here, only the mirror the server fills.
const mirror = createRailwayMirror();
// Explicit prototypes keep LOCAL, unarbitrated seats and a per-tab Boogler. A generic room connection does not
// opt them into server gameplay: seat.ts and boogler.ts use their local paths when this mirror is absent.
export const railwayMirror = productionRailway ? mirror : null;
// Non-production previews have an empty read-only roster; a client never allocates a player ordinal.
export const rules = { roster: mirror.roster };

export const railTune = railwayMirror?.tune ?? null;
