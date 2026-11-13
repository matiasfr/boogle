// Headless railway fixtures install the same split state/projections as the production host.
import { installServer } from '../../src/world/rules/roster.ts';
import { installRailTune } from '../../src/world/rules/tune.ts';
import { createServerOps } from '../../src/world/server-ops.ts';
import { projectRailTune, projectRoster } from '../../src/world/classic-replicate.ts';
import type { SyncView, Land } from '../../src/world/rules/types.ts';
import type { Replicator } from '../../src/world/replicate-server.ts';

export function installRailRules(sync: SyncView, _land: Land, replication: Replicator) {
  const ops = createServerOps();
  const roster = installServer(sync, ops, replication, () => sync.world.tick * 100);
  const railTune = installRailTune(sync, ops, replication);
  projectRoster(replication, roster);
  projectRailTune(replication, railTune);
  return { roster, railTune };
}
