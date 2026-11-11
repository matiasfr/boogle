// A railway room in Node for the M10 view tests (test/railway-m10a-views, -m10a-review and -m10c-review): the server's
// rules and replicator, and one client adapter per player behind a one-way delay in server steps, stepped by hand. It is
// the one home of the harness those three each carried a copy of. State is read as rows: a client's
// `adapter.read.world()`, the server's `host.world()`; `served(step)` is the server's replicated rows as they stood at the
// end of that room step, which is the step a client's mirror reports (`mirror.step()`) when it is current to it.
import { createRailwayAdapter, railMovement } from '../../src/adapters/railway.ts';
import { specOf } from '../../src/sim/tune.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
import { createSync, type WorldRoom } from '../../src/world/sync.ts';
import { installRules } from '../../src/world/rules/index.ts';
import { install as installRailway } from '../../src/world/railway-server.ts';
import { createReplicator } from '../../src/world/replicate-server.ts';
import { RAIL_SCHEMAS, createRailwayMirror } from '../../src/world/railway-replicate.ts';
import { createRailwayRequests } from '../../server/src/host/railway-requests.ts';
import { RAILWAY_T1 as T1 } from '../../src/sim/railway-layout.ts';
import type { World } from '../../src/ecs/index.ts';
import { homeLand } from './land.ts';
import type { Seed } from './rail.ts';

export type RailRoomClient = {
  cid: string;
  pid: string;
  adapter: ReturnType<typeof createRailwayAdapter>;
  mirror: ReturnType<typeof createRailwayMirror>;
};
const MOVEMENT = railMovement({ get: (k) => specOf(k)!.def });

/** Every replicated row of a world, as one string: two worlds with the same rows give the same string. */
export function replicatedRows(w: World) {
  return JSON.stringify(
    RAIL_SCHEMAS.map((c) => [
      c.kind,
      [...w.ids(c)].sort((a, b) => Number(a) - Number(b)).map((id) => [id, w.get(c, id)]),
    ]),
  );
}

export function railViewsRoom(seed?: Seed) {
  const sync = createSync();
  sync.setSelfId('server');
  const replication = createReplicator();
  const host = installRailway(sync, installRules(sync, homeLand()), replication);
  if (seed) {
    while (sync.world.tick < seed.t) sync.stepWorld(100);
    host.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())));
  }
  host.touchAll();
  const clients = new Map<string, RailRoomClient>();
  const delays = new Map<string, number>();
  const handlers = new Map<string, Set<(m: unknown, from: string) => void>>();
  const history = new Map<number, string>();
  let step = 0;
  const clock = { now: 1000 };
  const up: { at: number; cid: string; m: unknown }[] = [];
  const down: { at: number; cid: string; m: unknown }[] = [];
  const requests = createRailwayRequests({
    api: host,
    pidOf: (sid) => clients.get(sid)?.pid ?? null,
    send: (m) => down.push({ at: step + (delays.get(m.to) ?? 0), cid: m.to, m }),
    replication,
    available: () => true,
    unavailable: () => 'starting',
    actor: () => ({ reach: () => true, height: () => true, cadence: () => true }),
  });
  function join(cid: string, pid: string, delay = 0) {
    delays.set(cid, delay);
    const hs = new Set<(m: unknown, from: string) => void>();
    handlers.set(cid, hs);
    const mirror = createRailwayMirror();
    const adapter = createRailwayAdapter({
      mirror,
      movement: () => MOVEMENT,
      pid,
      pose: () => ({ x: T1.x / 100, y: 30, z: T1.z / 100 }),
      now: () => clock.now,
    });
    const c: RailRoomClient = { cid, pid, adapter, mirror };
    const r: WorldRoom = {
      selfId: cid,
      send: (m) => void up.push({ at: step + delay, cid, m }),
      onMessage: (h) => (hs.add(h), () => hs.delete(h)),
      onConnection: () => () => {},
    };
    clients.set(cid, c);
    replication.addClient(cid);
    adapter.attach(r);
    return c;
  }
  /** `n` server steps; `each` runs on every client after its frame's update, as the views' frame would. */
  function run(n = 1, each?: (c: RailRoomClient) => void) {
    for (let k = 0; k < n; k++) {
      step++;
      for (const x of up.filter((x) => x.at <= step)) {
        up.splice(up.indexOf(x), 1);
        requests.receive(x.m, x.cid);
      }
      sync.stepWorld(1000 / 60 + 1);
      history.set(sync.roomStep(), replicatedRows(host.world()));
      clock.now += 17;
      replication.commit(sync.roomStep());
      replication.flush(sync.roomStep(), (cid, _p, json) =>
        down.push({ at: step + (delays.get(cid) ?? 0), cid, m: JSON.parse(json) }),
      );
      for (const cid of clients.keys())
        down.push({ at: step + (delays.get(cid) ?? 0), cid, m: { t: 'w:c', ht: sync.world.tick } });
      for (const x of down.filter((x) => x.at <= step)) {
        down.splice(down.indexOf(x), 1);
        for (const h of handlers.get(x.cid)!) h(x.m, SERVER_ID);
      }
      for (const c of clients.values()) {
        c.adapter.update(clock.now);
        each?.(c);
      }
    }
  }
  /** Steps until every client has its whole state and an open window (at most 300 steps). */
  const ready = () => {
    for (let k = 0; k < 300 && ![...clients.values()].every((c) => c.adapter.read.ready()); k++) run();
  };
  return {
    sync,
    host,
    join,
    run,
    ready,
    clock,
    /** The server's replicated rows at the end of room step `step` (see `replicatedRows`). */
    served: (at: number) => history.get(at),
  };
}
