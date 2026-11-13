// Clock, replica observation and existing command/ball probes for built-game scripts.
import { onStart } from '../loop.ts';
import { world, worldStatus } from '../world/sync.ts';
import { gfx } from '../render/scene.ts';
import { grabBall, throwBall } from '../entities/ball/state.ts';
import { launch } from '../player/throw.ts';
import { railwayMirror } from '../world/game-world.ts';
import { railwayCommands } from '../entities/railway/state.ts';

// Never sample the ingest mirror between chunks of a split send; the published views still hold the prior state.
let replicaComplete = false;
railwayMirror?.mirror.onPacket((packet) => (replicaComplete = !packet.m));

const sync = {
  world,
  worldStatus,
  replica() {
    const r = railwayMirror;
    if (!r) return null;
    return {
      ready: r.synced() && replicaComplete,
      step: r.step(),
      hash: r.hash(),
      roster: r.roster.roster.pids.map((pid, k) => [pid, r.roster.nameOf(k), r.roster.colorOf(k)]),
      tune: { values: { ...r.tune.tune.v }, revision: r.tune.tune.revision },
    };
  },
  act: (op: string, fields: Record<string, unknown>) => railwayCommands()?.act(op, fields) ?? null,
  tossBall(charge = 0.5) {
    grabBall();
    const { p, v } = launch('ball', charge);
    throwBall(p, v);
  },
};
export type SyncHandle = typeof sync;
onStart(() => {
  if (!window.boogle) return;
  Object.defineProperty(window.boogle, 'gfx', { get: gfx, enumerable: true });
  window.boogle.sync = sync;
});
