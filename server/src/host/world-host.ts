// Compose one authoritative railway room. Each host service owns its transient state;
// the callbacks below are its explicit cross-service contracts. Registration and startup order are intentional.
import type { WorldHostOptions } from './ordinary-host.ts';
export { createWorldHost } from './ordinary-host.ts';
export type { WorldHost, WorldHostOptions } from './ordinary-host.ts';
import { createSync } from '../../../src/world/sync.ts';
import { isRailwayRoom } from '../../../src/world/railway-namespace.ts';
import { createHostStatus } from './host-status.ts';
import { createHostCheckpoint } from './host-checkpoint.ts';
import type { RailwayPosition } from './railway-supply.ts';
import { createHostAway } from './host-away.ts';
export type { RailwayPosition } from './railway-supply.ts';
import { install as installRailway } from '../../../src/world/railway-server.ts';
import { createReplicator, type Replicator } from '../../../src/world/replicate-server.ts';
import { createHostCommands } from './host-commands.ts';
import { installServer as installRoster } from '../../../src/world/rules/roster.ts';
import { installRailTune } from '../../../src/world/rules/tune.ts';
import { projectRailTune, projectRoster } from '../../../src/world/classic-replicate.ts';
import { createServerOps } from '../../../src/world/server-ops.ts';
import { installSeats } from '../../../src/world/rules/seats.ts';
import { projectSeats } from '../../../src/world/seat-replicate.ts';
import { createHostMaintenance } from './host-maintenance.ts';
import { createHostSupply } from './host-supply.ts';
import { createHostBoogler } from './host-boogler.ts';

type Msg = Record<string, unknown>;

export type RailwayHostOptions = WorldHostOptions & {
  /** Every connected session, including unknown poses. Unknown blocks maintenance. */
  positions?: () => (RailwayPosition | null)[];
  hasPlayers?: () => boolean;
  now?: () => number;
  /** The room's replicator (hosted-room.ts flushes it each step); a host of its own makes one. */
  replication?: Replicator;
  /** Start simulating once loaded (default). A hosted room passes false and wakes the world on its first join. */
  awake?: boolean;
};

// The railway room: roster, rail tuning and railway are Server kind, applied when an action arrives and replicated
// to clients by the room's replicator. Persistence is the sync's 2 s checkpoint plus the save on close: a crash may
// roll the room back up to 2 s (owner, 6 November). Actions are not journalled before they apply.
//
// The paused world (docs/decisions.md, "2026-11-06, economy principles amended"): a room simulates only while
// someone is in it. The hosted room pauses it after its last player has been gone a short grace (pause()), and the next
// join wakes it (wake()) with one away credit for the time it stood still, the same credit a load from disk applies for
// the time the server was down: the yards fill railAwayCredit(away) of production (src/sim/railway-away.ts), an absence
// of at least RAIL_AWAY.finishTicks finishes the funded job (a shorter one advances it), and the supply pulse catches up
// regrowth and drop recovery (up to 24 h, src/sim/railway-supply.ts). A rejoin within the grace never paused: no credit.
export function createRailwayWorldHost({
  roomId,
  store,
  saveMs = 2000,
  tick = true,
  pidOf = () => null,
  tuneController = () => false,
  positions = () => [null],
  hasPlayers = () => true,
  now = Date.now,
  meter,
  log = () => {},
  replication = createReplicator(),
  awake = true,
}: RailwayHostOptions) {
  if (!isRailwayRoom(roomId)) throw new Error('railway host requires a railway namespace');
  const ops = createServerOps();
  const sync = createSync();
  const roster = installRoster(sync, ops, replication, now);
  const seats = installSeats(ops, replication, now);
  projectSeats(replication, seats);
  projectRoster(replication, roster);
  const railTune = installRailTune(sync, ops, replication);
  projectRailTune(replication, railTune);
  const api = installRailway(sync, { railTune }, replication);
  const rules = { roster, railTune, railway: api, seats };
  const sent = new Set<(message: Msg) => void>();
  const send = (message: Msg) => {
    for (const fn of sent) fn(message);
  };
  const {
    boogler,
    reactions: booglerReactions,
    meter: booglerMeter,
  } = createHostBoogler({
    sync,
    ops,
    replication,
    now,
    positions,
    active: () => checkpoint.running() && hasPlayers(),
  });
  const away = createHostAway(api, now);
  const checkpoint = createHostCheckpoint({
    sync,
    api,
    away,
    roomId,
    store,
    now,
    saveMs,
    awake,
    send,
    log,
    failed: () => requests.failed(),
    whenCommandsDurable: () => requests.whenDurable(),
    maintainSupply: () => supply.maintain(),
    pauseActors: () => {
      boogler.pause();
      seats.clear();
    },
  });
  const supply = createHostSupply({
    api,
    now,
    positions,
    available: checkpoint.available,
  });
  const requests = createHostCommands({
    api,
    sync,
    ops,
    roomId,
    pidOf,
    tuneController,
    send,
    replication,
    available: () => checkpoint.available() && supply.current(),
    unavailable: checkpoint.unavailable,
    save: checkpoint.saveCommand,
  });
  const maintenance = createHostMaintenance({
    api,
    railTune,
    now,
    positions,
    active: requests.active,
    maintainSupply: supply.maintain,
  });
  const ready = checkpoint.start();
  const status = createHostStatus({
    sync,
    tick,
    meter,
    checkpoint,
    maintain: maintenance.maintain,
    receive: requests.receive,
    failed: requests.failed,
    seats,
    boogler,
    booglerMeter,
    ops,
  });
  return {
    sync,
    rules,
    replication,
    ops,
    stats: status.stats,
    onSend(fn: (message: Msg) => void) {
      sent.add(fn);
      return () => sent.delete(fn);
    },
    deliver(message: unknown, from: string) {
      if (!requests.failed() && !supply.current()) supply.maintain();
      status.deliver(message, from);
    },
    step: status.step,
    status: status.status,
    roomStatus() {
      const ws = status.status();
      return {
        noSave: ws.badSave,
        railway: status.stats,
        seats: ws.seats,
        boogler: ws.boogler,
        booglerMeter: ws.booglerMeter,
      };
    },
    whenReady: () => ready,
    wake: checkpoint.wake,
    pause: checkpoint.pause,
    paused: checkpoint.paused,
    /** The room's actual departure of a session (after its reconnect grace). A carried beam waits for its carrier. */
    depart(sid: string) {
      // requests.depart removed the pid's one session, so the pid is no longer active.
      const session = requests.depart(sid);
      if (!session) return;
      booglerReactions.release(session.pid);
      seats.release(session.pid);
      maintenance.departed(session.pid);
    },
    close: (options?: { save?: boolean }) => checkpoint.close(status.stop, options),
  };
}
export type RailwayWorldHost = ReturnType<typeof createRailwayWorldHost>;
