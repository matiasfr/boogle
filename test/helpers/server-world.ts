// The production Server-kind registrations, without sockets, timers or rendering.
import { createSync } from '../../src/world/sync.ts';
import { createServerOps } from '../../src/world/server-ops.ts';
import { createReplicator } from '../../src/world/replicate-server.ts';
import { installServer } from '../../src/world/rules/roster.ts';
import { installRailTune } from '../../src/world/rules/tune.ts';
import { install as installRailway } from '../../src/world/railway-server.ts';
import { projectRailTune, projectRoster } from '../../src/world/classic-replicate.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';

export function serverWorld() {
  const sync = createSync();
  const ops = createServerOps();
  const replication = createReplicator();
  let now = 0;
  const roster = installServer(sync, ops, replication, () => now);
  const railTune = installRailTune(sync, ops, replication);
  projectRoster(replication, roster);
  projectRailTune(replication, railTune);
  const railway = installRailway(sync, { railTune }, replication);
  railway.touchAll();
  const clients = new Map<string, ReturnType<typeof createRailwayMirror>>();
  const join = (id: string) => {
    const mirror = createRailwayMirror();
    clients.set(id, mirror);
    replication.addClient(id);
    return mirror;
  };
  return {
    sync,
    ops,
    replication,
    roster,
    railTune,
    railway,
    clients,
    join,
    run(pid: string, edit: Record<string, unknown>) {
      now += 3000;
      return ops.run(pid, edit, {
        from: pid,
        tick: sync.world.tick,
        env: {},
        protoRoom: true,
        tuneController: () => true,
        actor: { reach: () => true, height: () => true, cadence: () => true },
      });
    },
    flush() {
      sync.stepWorld(100);
      const step = sync.roomStep();
      replication.commit(step);
      replication.flush(step, (id, _packet, json) => {
        if (!clients.get(id)!.mirror.apply(JSON.parse(json))) throw new Error('invalid server packet');
      });
    },
  };
}
