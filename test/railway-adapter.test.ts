// The railway adapter on the replicated mirror (replication R1a): readiness, acks and refusals, effects from events,
// and reconnect, against the real server rules and requests behind a hand-driven room.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRailwayAdapter } from '../src/adapters/railway.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { createSync, type WorldRoom } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { createRailwayRequests } from '../server/src/host/railway-requests.ts';
import { RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { homeLand } from './helpers/land.ts';

const MOVEMENT = { beamSoloSpeed: 2, beamHelpSpeed: 5, jumpImpulse: 6, jumpTurn: 1, jumpSteer: 25, jumpApexSpeed: 1 };

function fixture({ actor = true } = {}) {
  const sync = createSync();
  sync.setSelfId('server');
  const base = installRules(sync, homeLand());
  const replication = createReplicator();
  const api = installRailway(sync, base, replication);
  api.touchAll();
  const toClient: { msg: unknown }[] = [];
  const handlers = new Set<(m: unknown, from: string) => void>();
  const connection = new Set<(live: boolean) => void>();
  const edits: Record<string, unknown>[] = [];
  const requests = createRailwayRequests({
    api,
    pidOf: (sid) => (sid === 'client' ? 'alice' : null),
    send: (m) => toClient.push({ msg: m }),
    replication,
    available: () => true,
    unavailable: () => 'starting',
    actor: () => ({ reach: () => actor, height: () => true, cadence: () => true }),
  });
  let live = true;
  const room: WorldRoom = {
    selfId: 'client',
    send(m) {
      if (!live) return;
      const msg = m as { t?: string; e?: Record<string, unknown> };
      if (msg.t === 'r:edit' && msg.e) edits.push(msg.e);
      requests.receive(m, 'client');
    },
    onMessage: (h) => (handlers.add(h), () => handlers.delete(h)),
    onConnection: (h) => (connection.add(h), () => connection.delete(h)),
  };
  replication.addClient('client');
  const mirror = createRailwayMirror();
  let now = 1000;
  const adapter = createRailwayAdapter({
    mirror,
    movement: () => MOVEMENT,
    pid: 'alice',
    pose: () => ({ x: -0.001, y: 0.0001, z: 995.62 }),
    now: () => now,
  });
  // One server step: the host's commit and flush, then the addressed one-off messages, as the hosted room sends them.
  const step = (n = 1) => {
    for (let k = 0; k < n; k++) {
      sync.stepWorld(1000 / 60 + 1);
      now += 17;
      replication.commit(sync.roomStep());
      replication.flush(sync.roomStep(), (_cid, _p, json) => {
        if (live) for (const h of handlers) h(JSON.parse(json), SERVER_ID);
      });
      for (const { msg } of toClient.splice(0)) if (live) for (const h of handlers) h(msg, SERVER_ID);
      adapter.update(now);
    }
  };
  const disconnect = () => {
    live = false;
    replication.removeClient('client');
    for (const h of connection) h(false);
  };
  const reconnect = () => {
    live = true;
    replication.addClient('client');
    for (const h of connection) h(true);
  };
  adapter.attach(room);
  return { sync, api, adapter, step, edits, disconnect, reconnect, mirror };
}

test('the adapter is ready once the whole state and its session have arrived', () => {
  const f = fixture();
  assert.equal(f.adapter.inspect().ready, false);
  f.step(40);
  const s = f.adapter.inspect();
  assert.equal(s.ready, true, JSON.stringify({ status: s.status, epoch: s.epoch, synced: s.synced }));
  assert.equal(s.epoch, 1);
  assert.equal(s.counts.total, f.api.counts().total);
});

test('each request carries the actor position in whole centimetres (never -0) and the action time', () => {
  const f = fixture();
  f.step(40);
  assert.equal(f.adapter.wake(), true);
  assert.deepEqual(f.edits.at(-1), {
    op: 'rail.wake',
    epoch: 1,
    request: 1,
    ms: f.edits.at(-1)!.ms,
    at: [0, 0, 99562],
  });
  assert.ok(Object.is((f.edits.at(-1)!.at as number[])[0], 0), 'no -0, which railInt refuses');
});

test('an ack retires the reservation; the effect fires once, after the state it describes', () => {
  const f = fixture();
  f.step(40);
  const effects: { op: string; awake: number }[] = [];
  f.adapter.onAccepted((e) => effects.push({ op: e.op, awake: f.adapter.inspect().awake }));
  assert.equal(f.adapter.wake(), true);
  assert.equal(f.adapter.inspect().pending, 1);
  f.step();
  assert.equal(f.adapter.inspect().pending, 0);
  assert.deepEqual(effects, [{ op: 'rail.wake', awake: f.api.railway.awake }]);
  assert.ok(f.api.railway.awake >= 0);
  f.step(T1.wakeTicks * 6 + 6);
  assert.equal(f.adapter.inspect().phase, 'idle');
});

test('a refused action retires without material or effects; a reconnect rebuilds from the whole state', () => {
  const f = fixture({ actor: false });
  f.step(40);
  let effects = 0;
  f.adapter.onAccepted(() => effects++);
  assert.equal(f.adapter.wake(), true);
  f.step();
  const s = f.adapter.inspect();
  assert.equal(s.pending, 0);
  assert.equal(s.ready, true, 'a refusal is about the action, not the session');
  assert.equal(effects, 0);
  assert.equal(f.api.railway.awake, -1);
  f.disconnect();
  assert.equal(f.adapter.inspect().ready, false);
  assert.equal(f.adapter.wake(), false, 'disconnected input is gated');
  f.reconnect();
  f.step(40);
  const back = f.adapter.inspect();
  assert.equal(back.ready, true);
  assert.equal(back.epoch, 1, 'the same socket id resumes its session (a server restart issues a new epoch)');
  assert.equal(back.next, f.api.account('alice')!.request + 1);
  assert.equal(effects, 0, 'the late join replays no effects');
  assert.equal(back.counts.total, f.api.counts().total);
});
