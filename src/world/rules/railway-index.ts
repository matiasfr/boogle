// Explicit installation for the isolated T1 namespace. Never changes classic RULES or the default game.
import * as roster from './roster.ts';
import * as railway from './railway.ts';
import type { SyncView, Land } from './types.ts';

export const RAILWAY_RULES = [roster, railway] as const;
export type RailwayRules = ReturnType<typeof installRailwayRules>;
export function installRailwayRules(sync: SyncView, land: Land) {
  const people = roster.install(sync);
  return { roster: people, railway: railway.install(sync, land, { roster: people }) };
}
