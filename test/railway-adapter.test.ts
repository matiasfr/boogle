// Real sync + in-memory transport: reconnect recovery must survive the host's snapshot throttle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRailwayAdapter } from '../src/adapters/railway.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { createSync } from '../src/world/sync.ts';
import { install as roster } from '../src/world/rules/roster.ts';
import { install as railway } from '../src/world/rules/railway.ts';
import { makeNet, run } from './helpers/net.ts';
import { homeLand } from './helpers/land.ts';

test('quick reconnect retries a throttled snapshot and enables railway only after verified recovery', async () => {
  const net = makeNet();
  const peer = (id: string, host: boolean) => {
    const s = createSync();
    const api = railway(s, homeLand(), { roster: roster(s) }, { playable: true });
    const p = net.add(id, host, host ? 'server' : 'alice');
    s.attachWorld(p.room, { host, roomId: 'adapter-reconnect', storage: null });
    return { s, api, p };
  };
  const host = peer(SERVER_ID, true);
  host.s.submitEdit({ op: 'rail.session', i: 0, j: 0, pid: 'alice', epoch: 1 });
  await run(net, [host], 10);
  const client = peer('client', false);
  const all = [host, client];
  await run(net, all, 5);
  const adapter = createRailwayAdapter({ api: client.api, sync: client.s, pid: 'alice' });
  adapter.attach(client.p.room);
  const session = () => host.p.room.send({ t: 'r:session', to: 'client', epoch: 1, next: 1 });
  session();
  net.flush();
  assert.equal(adapter.inspect().ready, true);
  const snapshots = host.s.worldStatus().snapsSent;
  let effects = 0;
  adapter.onAccepted(() => effects++);
  net.setUp(client.p, false);
  adapter.update(50);
  assert.equal(adapter.inspect().ready, false);
  assert.equal(adapter.wake(), false, 'disconnected input is gated');
  net.setUp(client.p, true);
  // The room host requests this unsolicited snapshot on every new connection.
  client.p.room.send({ t: 'w:need' });
  session();
  await run(net, all, 2);
  assert.equal(host.s.worldStatus().snapsSent, snapshots, 'quick reconnect snapshot really was throttled');
  assert.equal(adapter.inspect().ready, false, 'a session reply is not a verified snapshot');
  for (let frame = 0; frame < 60; frame++) {
    adapter.update(100 + frame * 50);
    await run(net, all, 1);
  }
  assert.ok(client.s.worldStatus().resyncs > 0, 'adapter actively requests recovery');
  assert.ok(host.s.worldStatus().snapsSent > snapshots, 'retry survives the 1500 ms throttle');
  assert.equal(adapter.inspect().ready, true);
  assert.equal(effects, 0, 'snapshot recovery replays no accepted effects');
  assert.equal(adapter.wake(), true, 'input resumes after verified recovery');
  adapter.dispose();
});

test('each request carries the actor position in whole centimetres (never -0) and the action time', async () => {
  const net = makeNet();
  const peer = (id: string, host: boolean) => {
    const s = createSync();
    const api = railway(s, homeLand(), { roster: roster(s) }, { playable: true });
    const p = net.add(id, host, host ? 'server' : 'alice');
    s.attachWorld(p.room, { host, roomId: 'adapter-facts', storage: null });
    return { s, api, p };
  };
  const host = peer(SERVER_ID, true);
  host.s.submitEdit({ op: 'rail.session', i: 0, j: 0, pid: 'alice', epoch: 1 });
  await run(net, [host], 10);
  const client = peer('client', false);
  await run(net, [host, client], 5);
  const adapter = createRailwayAdapter({
    api: client.api,
    sync: client.s,
    pid: 'alice',
    pose: () => ({ x: -0.001, y: 0.0001, z: 995.62 }),
    now: () => 1234.4,
  });
  adapter.attach(client.p.room);
  const edits: Record<string, unknown>[] = [];
  host.p.room.onMessage((m) => {
    const msg = m as { t?: string; e?: Record<string, unknown> };
    if (msg.t === 'r:edit' && msg.e) edits.push(msg.e);
  });
  host.p.room.send({ t: 'r:session', to: 'client', epoch: 1, next: 1 });
  net.flush();
  assert.equal(adapter.wake(), true);
  net.flush();
  assert.deepEqual(edits.at(-1), { op: 'rail.wake', epoch: 1, request: 1, ms: 1234, at: [0, 0, 99562] });
  assert.ok(Object.is((edits.at(-1)!.at as number[])[0], 0), 'no -0, which railInt refuses');
  adapter.dispose();
});
