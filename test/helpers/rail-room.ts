// A railway server room and its clients behind one-way delays in steps (6 steps ~ 100 ms), for the tests that read a
// client's world next to the server's: the server's rules and replicator, one client adapter per player, stepped by
// hand. The one home of the harness the M10 view and review tests and the read-session test each carried a copy of.
// State is read as rows: `serverWorld()` is the server's world now, `client.adapter.read.world()` the client's (take it
// again at every read: a published world is never written, so a held one is the past). With `{ served: true }` the room
// also records the server's replicated rows at the end of each room step: `served(step)` is them as they stood then,
// which is the step a client's mirror reports (`mirror.step()`) when it is current to it.
import { createRailwayAdapter, type RailwayAdapter } from '../../src/adapters/railway-session.ts';
import { railMovement } from '../../src/adapters/railway-read.ts';
import { specOf, type TuneKey } from '../../src/sim/tune.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
import { createSync, type WorldRoom } from '../../src/world/sync.ts';
import { installRules } from '../../src/world/rules/index.ts';
import { install as installRailway } from '../../src/world/railway-server.ts';
import { createReplicator } from '../../src/world/replicate-server.ts';
import { RAIL_SCHEMAS, createRailwayMirror, type RailwayMirror } from '../../src/world/railway-replicate.ts';
import { createRailwayRequests } from '../../server/src/host/railway-requests.ts';
import { RAILWAY_T1 as T1 } from '../../src/sim/railway-layout.ts';
import type { ReadWorld } from '../../src/sim/railway-rows.ts';
import type { World } from '../../src/ecs/index.ts';
import { homeLand } from './land.ts';
import type { Seed } from './rail.ts';

export type RoomClient = {
  cid: string;
  pid: string;
  /** One-way delay in steps; change it to lag the client. */
  delay: number;
  adapter: RailwayAdapter;
  mirror: RailwayMirror;
  live: boolean;
  movementReads(): number;
  /** A tune edit as rules.tune makes one: the value, then the rev. */
  set(key: TuneKey, v: number): void;
  disconnect(): void;
  reconnect(): void;
};

/** Every replicated row of a world, as one string: two worlds with the same rows give the same string. */
export function replicatedRows(w: World) {
  return JSON.stringify(
    RAIL_SCHEMAS.map((c) => [
      c.kind,
      [...w.ids(c)].sort((a, b) => Number(a) - Number(b)).map((id) => [id, w.get(c, id)]),
    ]),
  );
}

export type RailRoomOptions = {
  /** Record the server's replicated rows at the end of every room step, for `served(step)`. Off by default: it
   * serialises every replicated row each step. */
  served?: boolean;
};

export function railRoom(seed?: Seed, options: RailRoomOptions = {}) {
  const sync = createSync();
  sync.setSelfId('server');
  const replication = createReplicator();
  const api = installRailway(sync, installRules(sync, homeLand()), replication);
  if (seed) {
    while (sync.world.tick < seed.t) sync.stepWorld(100);
    api.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())));
  }
  api.touchAll();
  let step = 0;
  const clock = { now: 1000 };
  const up: { at: number; cid: string; m: unknown }[] = [];
  const down: { at: number; cid: string; m: unknown }[] = [];
  const clients = new Map<string, RoomClient>();
  const handlersOf = new Map<string, Set<(m: unknown, from: string) => void>>();
  const history = new Map<number, string>();
  const requests = createRailwayRequests({
    api,
    pidOf: (sid) => clients.get(sid)?.pid ?? null,
    send: (m) => down.push({ at: step + (clients.get(m.to)?.delay ?? 0), cid: m.to, m }),
    replication,
    available: () => true,
    unavailable: () => 'starting',
    actor: () => ({ reach: () => true, height: () => true, cadence: () => true }),
  });
  /** A client `pid` on connection `cid`. `withRev` gives the adapter a tune rev (as rules.tune does in the game). */
  function join(cid: string, pid: string, delay = 0, withRev = true) {
    const tune = { v: new Map<TuneKey, number>(), rev: 0 };
    const handlers = new Set<(m: unknown, from: string) => void>();
    const connection = new Set<(live: boolean) => void>();
    let movementReads = 0;
    const mirror = createRailwayMirror();
    const adapter = createRailwayAdapter({
      mirror,
      movement: () => (movementReads++, railMovement({ get: (k) => tune.v.get(k) ?? specOf(k)!.def })),
      ...(withRev ? { movementRev: () => tune.rev } : {}),
      pid,
      pose: () => ({ x: T1.x / 100, y: 30, z: T1.z / 100 }),
      now: () => clock.now,
    });
    const c: RoomClient = {
      cid,
      pid,
      delay,
      adapter,
      mirror,
      live: true,
      movementReads: () => movementReads,
      set(key, v) {
        tune.v.set(key, v);
        tune.rev++;
      },
      disconnect() {
        c.live = false;
        for (const q of [up, down]) for (let i = q.length - 1; i >= 0; i--) if (q[i]!.cid === cid) q.splice(i, 1);
        replication.removeClient(cid);
        for (const h of connection) h(false);
      },
      reconnect() {
        c.live = true;
        replication.addClient(cid);
        for (const h of connection) h(true);
      },
    };
    const r: WorldRoom = {
      selfId: cid,
      send(m) {
        if (c.live) up.push({ at: step + c.delay, cid, m });
      },
      onMessage: (h) => (handlers.add(h), () => handlers.delete(h)),
      onConnection: (h) => (connection.add(h), () => connection.delete(h)),
    };
    clients.set(cid, c);
    handlersOf.set(cid, handlers);
    replication.addClient(cid);
    adapter.attach(r);
    return c;
  }
  /** `n` server steps; after each, every client's frame (update) when `loop`, as the game's loop runs them, then `each`. */
  function run(n = 1, o: { loop?: boolean; each?: (c: RoomClient) => void } = {}) {
    const { loop = true, each } = o;
    for (let k = 0; k < n; k++) {
      step++;
      for (const x of up.filter((x) => x.at <= step)) {
        up.splice(up.indexOf(x), 1);
        if (clients.get(x.cid)?.live) requests.receive(x.m, x.cid);
      }
      sync.stepWorld(1000 / 60 + 1);
      if (options.served) history.set(sync.roomStep(), replicatedRows(api.world()));
      clock.now += 17;
      replication.commit(sync.roomStep());
      replication.flush(
        sync.roomStep(),
        (cid, _p, json) => down.push({ at: step + (clients.get(cid)?.delay ?? 0), cid, m: JSON.parse(json) }),
      );
      for (const c of clients.values())
        down.push({ at: step + c.delay, cid: c.cid, m: { t: 'w:c', ht: sync.world.tick } });
      for (const x of down.filter((x) => x.at <= step)) {
        down.splice(down.indexOf(x), 1);
        const c = clients.get(x.cid);
        if (c?.live) for (const h of handlersOf.get(x.cid)!) h(x.m, SERVER_ID);
      }
      for (const c of clients.values()) {
        if (loop) c.adapter.update(clock.now);
        each?.(c);
      }
    }
  }
  return {
    sync,
    api,
    join,
    run,
    clients,
    clock,
    advance: (ms: number) => void (clock.now += ms),
    /** The head of a frame on every client (the railway entity's update). */
    frame: () => clients.forEach((c) => c.adapter.update(clock.now)),
    /** Run until every client's `read.ready()`. */
    ready() {
      for (let k = 0; k < 300 && ![...clients.values()].every((c) => c.adapter.read.ready()); k++) run();
    },
    /** The server's world now: the oracle for a client's rows. Take it again at every read. */
    serverWorld: () => api.world() as unknown as ReadWorld,
    /** The server's replicated rows at the end of room step `at` (see `replicatedRows`); only with `{ served: true }`. */
    served(at: number) {
      if (!options.served) throw new Error('served() needs railRoom(seed, { served: true })');
      return history.get(at);
    },
  };
}
