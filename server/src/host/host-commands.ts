// Authenticated command wiring and per-player action clocks; durable saves are owned by the checkpoint boundary.
import { isProtoRoom } from '../../../src/sim/tune.ts';
import { RAILWAY_PLAY_NS } from '../../../src/world/railway-namespace.ts';
import type { createSync } from '../../../src/world/sync.ts';
import type { RailwayApi, Actor } from '../../../src/world/railway-server.ts';
import type { Replicator } from '../../../src/world/replicate-server.ts';
import type { ServerOps } from '../../../src/world/server-ops.ts';
import { railCadence, RAIL_CADENCE_SLACK_MS } from '../../../src/world/railway-predict.ts';
import { createRailwayRequests, type ActorFacts } from './railway-requests.ts';

export function createHostCommands({
  api,
  sync,
  ops,
  roomId,
  pidOf,
  tuneController,
  send,
  replication,
  available,
  unavailable,
  save,
}: {
  api: RailwayApi;
  sync: ReturnType<typeof createSync>;
  ops: ServerOps;
  roomId: string;
  pidOf: (sid: string) => string | null;
  tuneController: (sid: string) => boolean;
  send: (message: Record<string, unknown>) => void;
  replication: Replicator;
  available: () => boolean;
  unavailable: () => 'storage' | 'starting';
  save: () => Promise<void>;
}) {
  // Preserve the existing playtest-only tune policy; ordinary railway rooms cannot change shared rates.
  const env = { protoRoom: isProtoRoom(roomId.slice(RAILWAY_PLAY_NS.length + 1)), tuneController };
  // The actor owns their body (docs/plans/replication.md, revision 1): a client action carries its own position
  // (`at`, centimetres) and action time (`ms`, the client's monotonic clock), and reach and cadence are judged from
  // those, never from presence or arrival time. They are validation facts only, never saved or replicated.
  const clientClocks = new Map<string, { epoch: number; last: Map<string, number> }>();
  const actor = (a: ActorFacts): Actor => ({
    reach(x, z, radius) {
      const dx = a.at[0] - x,
        dz = a.at[2] - z;
      return dx * dx + dz * dz <= radius * radius;
    },
    height: (y, radius) => Math.abs(a.at[1] - y) <= radius,
    // railCadence on the client's own action clock, the check its prediction also runs. No bound against the
    // server's clock: exploits don't matter in casual co-op, and such a bound refuses honest clients whose clock runs
    // at another rate (a test harness's warped page clock, a throttled tab).
    cadence(op) {
      const { kind, ms } = railCadence(op);
      let clock = clientClocks.get(a.pid);
      if (!clock || clock.epoch !== a.epoch) {
        clock = { epoch: a.epoch, last: new Map() }; // a new session is a new page, with its own clock
        clientClocks.set(a.pid, clock);
      }
      if (a.ms - (clock.last.get(kind) ?? -Infinity) < ms - RAIL_CADENCE_SLACK_MS) return false;
      clock.last.set(kind, a.ms);
      return true;
    },
  });
  return createRailwayRequests({
    api,
    pidOf,
    send,
    replication,
    available,
    unavailable,
    actor,
    commands: {
      ops,
      context: (from, actor) => ({ from, tick: sync.world.tick, actor, ...env }),
      save,
    },
  });
}
