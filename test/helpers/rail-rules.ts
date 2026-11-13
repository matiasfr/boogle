// Headless railway fixtures install the same split state/projections as the production host.
import { installRules } from '../../src/world/rules/index.ts';
import { installRailTune } from '../../src/world/rules/tune.ts';
import { createServerOps } from '../../src/world/server-ops.ts';
import { projectRailTune } from '../../src/world/classic-replicate.ts';
import type { SyncView, Land } from '../../src/world/rules/types.ts';
import type { Replicator } from '../../src/world/replicate-server.ts';

export function installRailRules(sync: SyncView, land: Land, replication: Replicator) {
  const base = installRules(sync, land);
  const railTune = installRailTune(sync, createServerOps(), replication);
  projectRailTune(replication, railTune);
  return { ...base, railTune };
}
