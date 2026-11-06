// Explicit installation for the isolated T1 namespace. Never changes classic RULES or the default game.
import * as roster from './roster.ts';
import * as railway from './railway.ts';
import type { SyncView, Land } from './types.ts';
import { installRules } from './index.ts';

export const RAILWAY_RULES = [roster, railway] as const;
export type RailwayRules = ReturnType<typeof installRailwayRules>;
export function installRailwayRules(sync: SyncView, land: Land) {
  const people = roster.install(sync);
  return { roster: people, railway: railway.install(sync, land, { roster: people }) };
}

/** The playable namespace retains the eager base APIs; only railway owns Place material. */
export function installPlayableRailwayRules(sync: SyncView, land: Land) {
  const base = installRules(sync, land);
  return { ...base, railway: railway.install(sync, land, base, { playable: true, line1: true }) };
}
