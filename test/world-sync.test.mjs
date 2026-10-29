// World sync with a fake in-memory room: one host + clients, deterministic frame driver, toy counter-grid state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers';
import { createSync } from '../src/world/sync.js';

function makeNet() {
  const peers = []; // { id, room, handlers, host }
  const net = {
    queue: [],
    peers,
    add(id, host) {
      const p = { id, host, msg: new Set(), hostCb: new Set(), connCb: new Set(), alive: true, up: true };
      p.room = {
        selfId: id,
        isHost: () => p.host,
        send(m) {
          if (p.up) net.queue.push({ from: p, m: JSON.parse(JSON.stringify(m)) });
        },
        onMessage: (h) => (p.msg.add(h), () => p.msg.delete(h)),
        onConnection: (h) => (p.connCb.add(h), () => p.connCb.delete(h)),
        onHostChange: (h) => (p.hostCb.add(h), () => p.hostCb.delete(h)),
      };
      peers.push(p);
      return p;
    },
    // host's message -> all clients; a client's -> host and the other clients (like peer-room's relay)
    flush() {
      const q = net.queue;
      net.queue = [];
      for (const { from, m } of q) {
        if (!from.alive) continue;
        for (const p of peers) if (p !== from && p.alive && p.up) for (const h of p.msg) h(m, from.id);
      }
    },
    // A peer's room drops and later comes back (peer-room's reconnect after a stall): nothing in or out meanwhile.
    setUp(p, up) {
      p.up = up;
      for (const h of p.connCb) h(up);
    },
    killHost() {
      const old = peers.find((p) => p.host && p.alive);
      old.alive = false;
      const next = peers.find((p) => p.alive);
      next.host = true;
      for (const h of next.hostCb) h(true);
    },
  };
  return net;
}

function makePeer(net, id, host) {
  const s = createSync();
  const grid = new Int32Array(16);
  const log = [];
  s.registerState('grid', {
    serialize: () => Array.from(grid),
    load: (a) => grid.set(a),
    hash: () => grid.reduce((h, v, i) => (Math.imul(h ^ (v + i), 16777619) >>> 0) | 0, 7) >>> 0,
  });
  s.registerOp('add', {
    validate: (e) => e.i >= 0 && e.i < 4 && e.j >= 0 && e.j < 4 && Number.isInteger(e.v),
    apply: (e) => {
      grid[e.i * 4 + e.j] += e.v;
      log.push(`${e.p}:${e.v}`);
    },
  });
  const p = net.add(id, host);
  s.attachWorld(p.room, { roomId: 'test', storage: null, now: () => 1234 });
  return { s, grid, log, p };
}

async function run(net, peers, frames) {
  for (let f = 0; f < frames; f++) {
    for (const x of peers) if (x.p.alive) x.s.updateWorld(0.05);
    await new Promise((r) => setImmediate(r));
    net.flush();
  }
}
const live = (peers) => peers.filter((x) => x.p.alive);
const same = (peers) => new Set(live(peers).map((x) => x.grid.join())).size === 1;

async function setup(n = 2) {
  const net = makeNet();
  const host = makePeer(net, 'h', true);
  const clients = Array.from({ length: n }, (_, k) => makePeer(net, `c${k}`, false));
  const all = [host, ...clients];
  await run(net, all, 60);
  return { net, host, clients, all };
}

test('edits from all peers converge in identical order', async () => {
  const { net, host, clients, all } = await setup();
  assert.ok(clients.every((c) => c.s.worldStatus().ready));
  for (let k = 0; k < 6; k++) {
    host.s.submitEdit({ op: 'add', i: 0, j: 0, v: 1 });
    clients[0].s.submitEdit({ op: 'add', i: 1, j: 1, v: 10 });
    clients[1].s.submitEdit({ op: 'add', i: 0, j: 0, v: 100, p: 'forged' });
    await run(net, all, 3);
  }
  await run(net, all, 60);
  assert.equal(host.grid[0], 606);
  assert.equal(clients[1].grid[0], 606);
  assert.ok(same(all));
  assert.deepEqual(clients[0].log, host.log);
  assert.deepEqual(clients[1].log, host.log);
  assert.ok(!host.log.some((l) => l.startsWith('forged')), 'p comes from the real sender');
  assert.ok(Math.abs(clients[0].s.world.tick - host.s.world.tick) <= 6);
});

test('host rejects invalid edits', async () => {
  const { net, host, clients, all } = await setup(1);
  clients[0].s.submitEdit({ op: 'add', i: 9, j: 0, v: 1 });
  clients[0].s.submitEdit({ op: 'add', i: 0, j: 0, v: 1.5 });
  await run(net, all, 30);
  assert.equal(
    host.grid.reduce((a, b) => a + b),
    0,
  );
});

test('late joiner converges via snapshot (incl. in-flight edits)', async () => {
  const { net, host, all } = await setup(1);
  host.s.submitEdit({ op: 'add', i: 2, j: 2, v: 5 });
  await run(net, all, 20);
  host.s.submitEdit({ op: 'add', i: 3, j: 3, v: 7 });
  const late = makePeer(net, 'late', false);
  all.push(late);
  await run(net, all, 80);
  assert.equal(late.grid[10], 5);
  assert.equal(late.grid[15], 7);
  assert.ok(late.s.worldStatus().snapsLoaded >= 1);
  assert.ok(same(all));
});

test('injected desync is detected by hash and repaired', async () => {
  const { net, host, clients, all } = await setup();
  clients[1].grid[5] = 999;
  const seen = [];
  clients[1].s.onDesync((d) => seen.push(d));
  await run(net, all, 120);
  assert.ok(seen.length >= 1 && seen[0].keys.length === 1, JSON.stringify(seen)); // names the diverged state
  assert.equal(clients[1].grid[5], 0);
  assert.ok(clients[1].s.worldStatus().resyncs >= 1);
  assert.ok(same(all));
  assert.equal(host.s.worldStatus().hashBad, 0);
});

test('host migration continues', async () => {
  const { net, host, clients, all } = await setup();
  host.s.submitEdit({ op: 'add', i: 0, j: 0, v: 1 });
  await run(net, all, 20);
  net.killHost();
  await run(net, all, 40);
  clients[1].s.submitEdit({ op: 'add', i: 0, j: 1, v: 3 });
  clients[0].s.submitEdit({ op: 'add', i: 0, j: 1, v: 4 });
  await run(net, all, 120);
  assert.equal(clients[0].s.worldStatus().mode, 'host');
  assert.equal(clients[1].grid[1], 7);
  assert.equal(clients[0].grid[1], 7);
  assert.ok(same(all));
});

test('an edit submitted while the room is reconnecting still reaches the host', async () => {
  const { net, host, clients, all } = await setup(1);
  net.setUp(clients[0].p, false);
  assert.ok(clients[0].s.submitEdit({ op: 'add', i: 2, j: 1, v: 9 }));
  await run(net, all, 20);
  net.setUp(clients[0].p, true);
  await run(net, all, 60);
  assert.equal(host.grid[9], 9);
  assert.ok(same(all));
});

test('an edit held while reconnecting is stamped locally if this tab comes back as host', async () => {
  const { net, clients, all } = await setup(2);
  net.setUp(clients[0].p, false);
  clients[0].s.submitEdit({ op: 'add', i: 3, j: 0, v: 2 });
  await run(net, all, 5);
  net.killHost(); // clients[0] claims the host id, then its connection is reported up (peer-room's order)
  net.setUp(clients[0].p, true);
  await run(net, all, 120);
  assert.equal(clients[0].s.worldStatus().mode, 'host');
  assert.equal(clients[0].grid[12], 2);
  assert.equal(clients[1].grid[12], 2);
});

test('unloadable snapshots are reported (peer chunk, local copy, server)', async () => {
  const { net, clients, all } = await setup(1);
  const seen = [];
  clients[0].s.onSnapFail(() => {
    throw new Error('a broken listener does not turn one failure into two');
  });
  clients[0].s.onSnapFail((f) => seen.push(f));
  for (const h of clients[0].p.msg) h({ t: 'w:snap', to: 'c0', id: 99, n: 1, k: 0, s: '{nope' }, 'h');
  for (const h of clients[0].p.msg) h({ t: 'w:snap', to: 'c0', id: 98, n: 1, k: 0, s: '{"snap":1}' }, 'h');
  await run(net, all, 2);
  assert.deepEqual(seen, [
    { from: 'peer', reason: 'parse' },
    { from: 'peer', reason: 'invalid' },
  ]);

  const solo = createSync();
  const fails = [];
  solo.onSnapFail((f) => fails.push(f));
  const room = { selfId: 'x', isHost: () => true, send() {}, onMessage: () => () => {}, onConnection: () => () => {} };
  room.onHostChange = () => () => {};
  solo.attachWorld(room, {
    roomId: 'test',
    serverUrl: 'http://server.invalid',
    storage: { getItem: () => '{corrupt', setItem() {} },
    fetch: async () => ({ ok: true, json: async () => ({ data: { tick: -1 } }) }),
  });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(fails, [
    { from: 'local', reason: 'parse' },
    { from: 'server', reason: 'invalid' },
  ]);
  assert.ok(solo.worldStatus().ready, 'starts fresh anyway');
  solo.detachWorld();
});

test('profileTicks times each handler per tick and changes nothing', () => {
  const solo = () => {
    const s = createSync();
    let total = 0;
    s.registerState('n', { serialize: () => total, load: (v) => (total = v), hash: () => total });
    s.registerOp('add', { apply: (e) => (total += e.v) });
    s.onTick((t) => (total += t), 'grow');
    s.onApplied(() => {});
    return s;
  };
  const a = solo(),
    b = solo();
  let clock = 0;
  const prof = a.profileTicks(() => clock++); // every timed call reads as 1 ms
  assert.throws(() => a.profileTicks(), /already profiling/);
  for (const s of [a, b]) {
    s.submitEdit({ op: 'add', i: 0, j: 0, v: 5 });
    for (let k = 0; k < 3; k++) s.updateWorld(0.1);
  }
  a.stateHashes();
  const rows = prof.stop();
  assert.deepEqual(rows, [{ 'op add': 1, 'applied #0': 1, grow: 1 }, { grow: 1 }, { grow: 1, 'hash n': 1 }]);
  assert.equal(a.worldHash(), b.worldHash());
  const before = clock;
  a.updateWorld(0.1);
  assert.equal(clock, before); // stop() put the original handlers back
  a.profileTicks().stop(); // and a new profiler may start
});
