// World sync with a fake in-memory room: one host + clients, deterministic frame driver, toy counter-grid state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers';
import * as singleton from '../src/world/sync.js';
import { createSync } from '../src/world/sync.js';
import { makeNet, run, live } from './helpers/net.mjs';

// opts: env goes to createSync (the host facts validate reads); failLoad ({ on }) makes grid loads throw while on (bad data
// from a peer); the rest goes to attachWorld (storage, serverUrl, fetch, ...).
function makePeer(net, id, host, opts = {}) {
  const { env, failLoad, pid, ...attach } = opts;
  const s = createSync({ env });
  if (pid) s.setPid(pid);
  const grid = new Int32Array(16);
  const log = [];
  s.registerState('grid', {
    serialize: () => Array.from(grid),
    load: (a) => {
      if (failLoad?.on) throw new Error('cannot read this grid');
      grid.set(a);
    },
    hash: () => grid.reduce((h, v, i) => (Math.imul(h ^ (v + i), 16777619) >>> 0) | 0, 7) >>> 0,
  });
  s.registerOp('add', {
    validate: (e) => e.i >= 0 && e.i < 4 && e.j >= 0 && e.j < 4 && Number.isInteger(e.v),
    apply: (e) => {
      grid[e.i * 4 + e.j] += e.v;
      log.push(`${e.p}:${e.v}`);
    },
  });
  const last = new Map(); // a per-player rate limit: one edit per 2 ticks, recorded in validate
  s.registerOp('slow', {
    validate: (e, ctx) => {
      if (ctx.tick - (last.get(e.p) ?? -1e9) < 2) return false;
      last.set(e.p, ctx.tick);
      return true;
    },
    apply: (e) => {
      grid[e.i * 4 + e.j] += e.v;
      log.push(`${e.p}:${e.v}`);
    },
  });
  s.registerOp('mark', { apply: (e) => log.push(`${e.p}=${e.u}`) }); // who sent it, as the host stamped it
  s.registerOp('gate', { validate: (e, ctx) => ctx.env.allow(e.v), apply: (e) => (grid[e.i * 4 + e.j] += e.v) });
  const p = net.add(id, host);
  s.attachWorld(p.room, { roomId: 'test', storage: null, now: () => 1234, ...attach });
  return { s, grid, log, p };
}

// In-memory localStorage that counts writes, and a fetch that logs each method and finds no snapshot on the server.
const mem = () => {
  const m = new Map();
  const store = { writes: 0, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => (store.writes++, m.set(k, v)) };
  return store;
};
const fetchSpy = (log) => async (url, init) => (log.push(init?.method ?? 'GET'), { ok: false, status: 404 });
const SERVER = 'http://server.invalid';
const saved = (store) => JSON.parse(store.getItem('boogle.world.test'));
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

test("the host stamps each edit with its sender's pid (u), never one the edit claims", async () => {
  const net = makeNet();
  const all = [makePeer(net, 'h', true, { pid: 'pidh' }), makePeer(net, 'c0', false, { pid: 'pid0' })];
  await run(net, all, 60);
  all[1].s.submitEdit({ op: 'mark', i: 0, j: 0, u: 'pidh' });
  all[0].s.submitEdit({ op: 'mark', i: 0, j: 0, u: 'pid0' });
  await run(net, all, 20);
  assert.deepEqual(all[0].log.sort(), ['c0=pid0', 'h=pidh']);
  assert.deepEqual(all[1].log.sort(), all[0].log);
  assert.equal(all[0].s.pidOf('c0'), 'pid0');
  assert.equal(all[1].s.pidOf('h'), 'pidh');
});

test('an edit from a tab that never said its pid is rejected', async () => {
  const net = makeNet();
  const all = [makePeer(net, 'h', true, { pid: 'pidh' })];
  await run(net, all, 20);
  const ghost = net.add('ghost', false); // a raw room: no sync, so no w:id
  ghost.room.send({ t: 'w:edit', e: { op: 'mark', i: 0, j: 0, u: 'pidh' } });
  await run(net, all, 20);
  assert.deepEqual(all[0].log, []);
  ghost.room.send({ t: 'w:id', u: 'pidg' });
  ghost.room.send({ t: 'w:edit', e: { op: 'mark', i: 0, j: 0 } });
  await run(net, all, 20);
  assert.deepEqual(all[0].log, ['ghost=pidg']);
});

test('pids survive host migration, even to a late joiner that never heard the others say theirs', async () => {
  const net = makeNet();
  const all = [makePeer(net, 'h', true, { pid: 'pidh' }), makePeer(net, 'c0', false, { pid: 'pid0' })];
  await run(net, all, 60);
  const late = makePeer(net, 'late', false, { pid: 'pidl' }); // learns pid0 only from the host's snapshot
  all.push(late);
  await run(net, all, 60);
  // the late joiner is next in line, so it takes over when the host dies
  net.peers.splice(net.peers.indexOf(late.p), 1);
  net.peers.splice(1, 0, late.p);
  net.killHost();
  await run(net, all, 80);
  assert.equal(late.s.worldStatus().mode, 'host');
  all[1].s.submitEdit({ op: 'mark', i: 0, j: 0 });
  late.s.submitEdit({ op: 'mark', i: 0, j: 0 });
  await run(net, all, 40);
  assert.deepEqual(late.log.sort(), ['c0=pid0', 'late=pidl']);
  assert.deepEqual(all[1].log.sort(), late.log);
});

test('a pid already held by a session in the room cannot be claimed by another', async () => {
  const net = makeNet();
  const all = [makePeer(net, 'h', true, { pid: 'pidh' }), makePeer(net, 'c0', false, { pid: 'pid0' })];
  await run(net, all, 60);
  const thief = net.add('thief', false); // a raw room claiming c0's pid, then the host's
  thief.room.send({ t: 'w:id', u: 'pid0' });
  thief.room.send({ t: 'w:edit', e: { op: 'mark', i: 0, j: 0 } });
  thief.room.send({ t: 'w:id', u: 'pidh' });
  thief.room.send({ t: 'w:edit', e: { op: 'mark', i: 0, j: 0 } });
  all[1].s.submitEdit({ op: 'mark', i: 0, j: 0 });
  await run(net, all, 20);
  assert.deepEqual(all[0].log, ['c0=pid0'], 'only the real holder plays as pid0');
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

test('edits held while reconnecting are all accepted by a rate-limited op, in order', async () => {
  const { net, host, clients, all } = await setup(1);
  net.setUp(clients[0].p, false);
  for (let v = 1; v <= 4; v++) assert.ok(clients[0].s.submitEdit({ op: 'slow', i: 0, j: 2, v: v * 10 ** v }));
  await run(net, all, 10);
  net.setUp(clients[0].p, true);
  await run(net, all, 60);
  assert.equal(host.grid[2], 43210);
  assert.deepEqual(host.log, ['c0:10', 'c0:200', 'c0:3000', 'c0:40000']);
  assert.ok(same(all));
});

test('a fresh edit after a reconnect replaces the held backlog and goes out in the next slot', async () => {
  const { net, host, clients, all } = await setup(1);
  net.setUp(clients[0].p, false);
  for (let v = 1; v <= 4; v++) assert.ok(clients[0].s.submitEdit({ op: 'slow', i: 0, j: 2, v }));
  await run(net, all, 10);
  net.setUp(clients[0].p, true);
  await run(net, all, 1); // the first held edit goes out
  for (let v = 5; v <= 8; v++) {
    assert.ok(clients[0].s.submitEdit({ op: 'slow', i: 0, j: 2, v })); // like a held button
    await run(net, all, 5);
  }
  await run(net, all, 60);
  assert.equal(clients[0].s.worldStatus().heldDropped, 3);
  // 5 waits for the slot after 1 instead of taking its rate-limit slot. 6 comes on the button's own repeat, which can be
  // too soon after 5 for the host's rate limit: at most that one live edit is lost.
  assert.deepEqual(host.log.slice(0, 2), ['c0:1', 'c0:5']);
  assert.deepEqual(host.log.slice(-2), ['c0:7', 'c0:8']);
  assert.ok(same(all));
});

test('live input after a reconnect is back to normal latency', async () => {
  const { net, host, clients, all } = await setup(1);
  const c = clients[0];
  let v = 0;
  const press = async () => {
    assert.ok(c.s.submitEdit({ op: 'slow', i: 0, j: 2, v: ++v }));
    await run(net, all, 5); // the button's repeat, rounded up to whole frames like the held-edit pacing
  };
  net.setUp(c.p, false);
  for (let k = 0; k < 16; k++) await press(); // 4 s down with the button held
  net.setUp(c.p, true);
  for (let k = 0; k < 20; k++) await press(); // 5 s more
  await run(net, all, 15); // with the 5 frames after the last press: 1 s
  assert.equal(host.log.at(-1), `c0:${v}`, 'the last edit lands within 1 s, not seconds behind a backlog');
  const live = host.log.slice(host.log.indexOf('c0:17')).map((l) => Number(l.slice(3)));
  assert.ok(live.length >= 19, 'live edits are accepted (at most one lost to the rate limit after the delayed one)');
  assert.ok(
    live.every((x, k) => k === 0 || x > live[k - 1]),
    'in order',
  );
  assert.ok(same(all));
});

test('a reclaimed host stamps held edits, then fresh ones in their place', async () => {
  const { net, clients, all } = await setup(2);
  net.setUp(clients[0].p, false);
  for (let v = 1; v <= 3; v++) assert.ok(clients[0].s.submitEdit({ op: 'slow', i: 1, j: 0, v }));
  net.killHost();
  net.setUp(clients[0].p, true);
  await run(net, all, 1); // the first held edit is stamped
  for (let v = 4; v <= 6; v++) {
    clients[0].s.submitEdit({ op: 'slow', i: 1, j: 0, v }); // 5 can be too soon after the delayed 4 (rate limit)
    await run(net, all, 5);
  }
  await run(net, all, 120);
  assert.equal(clients[0].s.worldStatus().mode, 'host');
  assert.equal(clients[0].s.worldStatus().heldDropped, 2);
  assert.deepEqual(clients[0].log.slice(0, 2), ['c0:1', 'c0:4']);
  assert.equal(clients[0].log.at(-1), 'c0:6');
  assert.ok(same(all)); // c1 has not re-pinned the new host yet: it converges by snapshot
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

test('a held edit waits for a reclaimed host to finish loading', async () => {
  const net = makeNet();
  const host = makePeer(net, 'h', true);
  const c = makePeer(net, 'c0', false); // never got a snapshot: not ready when it takes over
  net.setUp(c.p, false);
  assert.ok(c.s.submitEdit({ op: 'add', i: 1, j: 2, v: 6 }));
  net.killHost(); // becomeHost awaits loadPersisted
  net.setUp(c.p, true);
  assert.equal(c.s.worldStatus().ready, false);
  await run(net, [host, c], 20);
  assert.equal(c.s.worldStatus().mode, 'host');
  assert.equal(c.grid[6], 6);
});

test('an edit held past the age limit is dropped and counted', async () => {
  const { net, host, clients, all } = await setup(1);
  net.setUp(clients[0].p, false);
  clients[0].s.submitEdit({ op: 'add', i: 2, j: 3, v: 8 });
  await run(net, all, 120); // 6 s
  net.setUp(clients[0].p, true);
  await run(net, all, 60);
  assert.equal(host.grid[11], 0);
  assert.equal(clients[0].s.worldStatus().heldDropped, 1);
  assert.ok(same(all));
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

test('clients save the world too (but only the host uploads), so the next host starts from it', async () => {
  const net = makeNet();
  const hostCalls = [];
  const clientCalls = [];
  const host = makePeer(net, 'h', true, { serverUrl: SERVER, fetch: fetchSpy(hostCalls) });
  const store = mem();
  const client = makePeer(net, 'c', false, { storage: store, serverUrl: SERVER, fetch: fetchSpy(clientCalls) });
  await run(net, [host, client], 60);
  client.s.submitEdit({ op: 'add', i: 2, j: 3, v: 7 });
  await run(net, [host, client], 620); // past the 30 s save interval
  assert.equal(client.grid[11], 7);
  assert.ok(store.getItem('boogle.world.test'), 'client saved');
  assert.equal(client.s.worldStatus().snapBytes, store.getItem('boogle.world.test').length, 'the size is reported');
  assert.deepEqual(clientCalls, [], 'a client never touches the server');
  assert.equal(client.s.worldStatus().saves, 0);
  assert.ok(hostCalls.includes('PUT'), 'the host uploads');

  const next = makePeer(makeNet(), 'n', true, { storage: store }); // another day, the client hosts
  await new Promise((r) => setImmediate(r));
  assert.equal(next.grid[11], 7);
});

test('a tab that takes over as host while waiting for its first snapshot still saves', async () => {
  const net = makeNet();
  const host = makePeer(net, 'h', true);
  const store = mem();
  const c = makePeer(net, 'c', false, { storage: store }); // asked for a snapshot, none came yet
  net.killHost();
  await run(net, [host, c], 620); // past the 30 s save interval
  assert.equal(c.s.worldStatus().mode, 'host');
  assert.ok(store.writes > 0, 'the new host saved');
});

test('a promoted client uploads its world even if it already saved that state locally', async () => {
  const net = makeNet();
  const host = makePeer(net, 'h', true);
  const store = mem();
  const calls = [];
  const c = makePeer(net, 'c', false, { storage: store, serverUrl: SERVER, fetch: fetchSpy(calls) });
  await run(net, [host, c], 60);
  c.s.submitEdit({ op: 'add', i: 2, j: 3, v: 7 });
  await run(net, [host, c], 620);
  assert.equal(store.writes, 1, 'saved locally as a client');
  net.killHost(); // the old host is gone; the world does not change after this
  await run(net, [host, c], 620);
  assert.deepEqual(calls, ['PUT']);
  assert.equal(saved(store).data.grid[11], 7);
});

test('a client saves only hash-verified state, so a desync never reaches the next host', async () => {
  const net = makeNet();
  const host = makePeer(net, 'h', true);
  const store = mem();
  const client = makePeer(net, 'c', false, { storage: store });
  await run(net, [host, client], 60);
  host.s.submitEdit({ op: 'add', i: 2, j: 3, v: 7 });
  await run(net, [host, client], 530); // 29.5 s: the 30 s save falls due before the next hash check
  client.grid[5] = 999; // a silent desync
  await run(net, [host, client], 80);
  assert.ok(client.s.worldStatus().resyncs >= 1);
  assert.deepEqual(saved(store).data.grid, Array.from(host.grid));

  const next = makePeer(makeNet(), 'n', true, { storage: store });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(next.grid, host.grid);
});

test('a client waiting for a resync does not save, then saves the repaired world', async () => {
  const net = makeNet();
  const host = makePeer(net, 'h', true);
  const store = mem();
  const client = makePeer(net, 'c', false, { storage: store });
  await run(net, [host, client], 60);
  let dropSnaps = true; // the resync reply gets lost
  for (const h of [...client.p.msg]) {
    client.p.msg.delete(h);
    client.p.msg.add((m, from) => (dropSnaps && m.t === 'w:snap' ? undefined : h(m, from)));
  }
  client.grid[5] = 999;
  await run(net, [host, client], 620); // past the 30 s save interval
  assert.ok(client.s.worldStatus().resyncs >= 1);
  assert.equal(store.getItem('boogle.world.test'), null, 'the diverged world was not saved');
  dropSnaps = false;
  await run(net, [host, client], 620);
  assert.equal(client.grid[5], 0);
  assert.equal(saved(store).data.grid[5], 0);
});

test('a new host loads the newer of its local and server copies', async () => {
  const snap = (tick, v) => ({ tick, seed: 1, epochMs: 0, data: { grid: [v, ...Array(15).fill(0)] } });
  const start = async (local, server) => {
    const storage = { getItem: () => JSON.stringify(local), setItem() {} };
    const fetch = async () => ({ ok: true, json: async () => ({ data: server }) });
    const peer = makePeer(makeNet(), 'n', true, { storage, serverUrl: SERVER, fetch });
    await new Promise((r) => setImmediate(r));
    return [peer.s.world.tick, peer.grid[0]];
  };
  assert.deepEqual(await start(snap(500, 1), snap(300, 2)), [500, 1]);
  assert.deepEqual(await start(snap(300, 1), snap(500, 2)), [500, 2]);
});

test('profileTicks times each handler per tick and changes nothing', () => {
  const solo = () => {
    const s = createSync();
    let total = 0;
    s.registerState('n', { serialize: () => total, load: (v) => (total = v), hash: () => total });
    s.registerOp('add', { apply: (e) => (total += e.v) });
    s.onAfterTick(() => {}, 'draw');
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
  const { rows, kinds } = prof.stop();
  assert.deepEqual(kinds, { 'op add': 'sim', 'hash n': 'sim', 'applied #0': 'applied', grow: 'sim', draw: 'view' });
  assert.deepEqual(rows, [
    { 'op add': 1, 'applied #0': 1, grow: 1, draw: 1 },
    { grow: 1, draw: 1 },
    { grow: 1, draw: 1, 'hash n': 1 },
  ]);
  assert.equal(a.worldHash(), b.worldHash());
  const before = clock;
  a.updateWorld(0.1);
  assert.equal(clock, before); // stop() put the original handlers back
  a.profileTicks().stop(); // and a new profiler may start
});

test('validate sees the host env (ctx.env), set at creation or with setEnv; a missing fact rejects', async () => {
  const net = makeNet();
  const host = makePeer(net, 'h', true, { env: { allow: (v) => v < 5 } });
  const c = makePeer(net, 'c0', false, { env: { allow: () => true } }); // a client's env never decides
  const bare = makePeer(net, 'c1', false); // no env at all
  const all = [host, c, bare];
  await run(net, all, 60);
  c.s.submitEdit({ op: 'gate', i: 0, j: 0, v: 3 });
  c.s.submitEdit({ op: 'gate', i: 0, j: 0, v: 9 });
  await run(net, all, 20);
  assert.equal(host.grid[0], 3);
  host.s.setEnv({ allow: (v) => v > 5 });
  c.s.submitEdit({ op: 'gate', i: 0, j: 1, v: 3 });
  c.s.submitEdit({ op: 'gate', i: 0, j: 1, v: 9 });
  await run(net, all, 20);
  assert.equal(host.grid[1], 9);
  assert.ok(new Set(live(all).map((x) => x.grid.join())).size === 1);

  const solo = createSync(); // validate reads env.allow, which is missing: it throws, and stamp rejects (fails closed)
  solo.registerOp('gate', { validate: (e, ctx) => ctx.env.allow(e.v), apply: () => assert.fail('applied') });
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(solo.submitEdit({ op: 'gate', i: 0, j: 0, v: 1 }), false);
  } finally {
    console.warn = warn;
  }
  const given = { allow: () => true };
  const own = createSync({ env: given });
  own.registerOp('gate', { validate: (e, ctx) => ctx.env.allow(e.v) && ctx.env !== given, apply() {} });
  assert.ok(own.submitEdit({ op: 'gate', i: 0, j: 0, v: 1 }), 'createSync copies the env it is given');
});

test('onApplied listeners get the result of apply; a failing listener does not stop the next', () => {
  const s = createSync();
  let n = 0;
  s.registerOp('inc', {
    apply: (e) => {
      if (e.v < 0) throw new Error('bad edit');
      return (n += e.v);
    },
  });
  const seen = [];
  s.onApplied(() => {
    throw new Error('a broken effect');
  });
  s.onApplied((e, t, r) => seen.push([e.v, t, r]));
  const err = console.error;
  const errors = [];
  console.error = (m) => errors.push(m);
  try {
    s.submitEdit({ op: 'inc', i: 0, j: 0, v: 2 });
    s.updateWorld(0.1);
    s.submitEdit({ op: 'inc', i: 0, j: 0, v: -1 }); // apply throws: no listener runs
    s.updateWorld(0.1);
    s.submitEdit({ op: 'inc', i: 0, j: 0, v: 3 });
    s.updateWorld(0.1);
  } finally {
    console.error = err;
  }
  assert.deepEqual(seen, [
    [2, 1, 2],
    [3, 3, 5],
  ]);
  assert.deepEqual(errors, ['[world] onApplied failed', '[world] apply failed', '[world] onApplied failed']);
});

test('onAfterTick runs after every onTick handler and before the host sends its hash', async () => {
  const { net, host, all } = await setup(1);
  const log = [];
  host.s.onAfterTick((t) => log.push(`after ${t}`));
  host.s.onTick((t) => log.push(`tick ${t}`)); // registered later, still runs first
  host.s.onHashSent((t) => log.push(`hash ${t}`));
  await run(net, all, 50);
  const h = log.findIndex((l) => l.startsWith('hash'));
  assert.ok(h >= 2, log.join());
  const t = log[h].slice(5);
  assert.deepEqual(log.slice(h - 2, h + 1), [`tick ${t}`, `after ${t}`, `hash ${t}`]);
  assert.ok(log.every((l, k) => !l.startsWith('tick') || log[k + 1] === `after ${l.slice(5)}`));
});

test('registering an op or state key twice throws; registry() lists both in registration order', () => {
  const s = createSync();
  const st = { serialize: () => 0, load() {}, hash: () => 0 };
  s.registerState('b', st);
  s.registerState('a', st);
  s.registerOp('y', { apply() {} });
  s.registerOp('x', { apply() {} });
  assert.throws(() => s.registerOp('y', { apply() {} }), /duplicate op y/);
  assert.throws(() => s.registerState('a', st), /duplicate state a/);
  assert.deepEqual(s.registry(), { ops: ['y', 'x'], states: ['b', 'a'] });
  assert.deepEqual(Object.keys(s.snapshot().data), s.registry().states);
});

test('the singleton exports setEnv, onAfterTick and registry', () => {
  for (const k of ['setEnv', 'onAfterTick', 'registry']) assert.equal(typeof singleton[k], 'function', k);
  assert.deepEqual(singleton.registry(), { ops: [], states: [] });
});

// ------------------------------------------------------------ state versions (B3)
// A local sync with one versioned toy state, `thing` ({ n }); its load throws on anything without a numeric n.
function versioned(version, migrate) {
  const s = createSync();
  let value = { n: 0 };
  s.registerState('thing', {
    version,
    migrate,
    serialize: () => value,
    load: (json) => {
      if (typeof json?.n !== 'number') throw new Error('bad thing');
      value = json;
    },
    hash: () => value.n,
  });
  return { s, get: () => value };
}
const snapOf = (data, vers) => ({ tick: 3, seed: 1, epochMs: 0, data, ...(vers ? { vers } : {}) });

test('snapshots record each state version, and loads run the migrations from the saved version up, in order', () => {
  const order = [];
  const steps = {
    1: (j) => (order.push(1), { n: j.n + 10 }),
    2: (j) => (order.push(2), { n: j.n * 2 }),
  };
  const a = versioned(2, steps);
  assert.deepEqual(a.s.snapshot().vers, { thing: 2 });
  a.s.loadSnapshot(snapOf({ thing: { n: 1 } })); // no vers: version 0
  assert.deepEqual(order, [1, 2]);
  assert.equal(a.get().n, 22);
  order.length = 0;
  a.s.loadSnapshot(snapOf({ thing: { n: 1 } }, { thing: 1 }));
  assert.deepEqual(order, [2]);
  assert.equal(a.get().n, 2);
  order.length = 0;
  a.s.loadSnapshot(JSON.parse(JSON.stringify(a.s.snapshot()))); // this build's own save: nothing to migrate
  assert.deepEqual(order, []);
  assert.equal(a.get().n, 2);
  assert.equal(a.s.worldStatus().loadErrors, 0);
  assert.equal(a.s.worldStatus().newerSave, false);
  const bad = { version: -1, serialize: () => 0, load() {}, hash: () => 0 };
  assert.throws(() => createSync().registerState('x', bad), /bad version/);
});

test('a state that fails to load (or to migrate) starts fresh and is counted; the others still load', () => {
  const v = versioned(1, { 1: (j) => ({ n: j.n.deep.oops }) });
  const fails = [];
  v.s.onSnapFail((f) => fails.push(f));
  let other = 0;
  v.s.registerState('other', { serialize: () => other, load: (x) => (other = x), hash: () => other });
  assert.equal(v.s.loadSnapshot(snapOf({ thing: { n: 5 }, other: 9 })), true); // the migration throws
  assert.equal(v.get().n, 0, 'thing is fresh');
  assert.equal(other, 9);
  v.s.loadSnapshot(snapOf({ thing: { n: 'x' }, other: 4 }, { thing: 1 })); // load throws
  v.s.loadSnapshot(snapOf({ thing: { n: 5 }, other: 4 }, { thing: 'one' })); // a bad version
  assert.equal(v.get().n, 0);
  assert.equal(other, 4);
  assert.equal(v.s.worldStatus().loadErrors, 3);
  assert.deepEqual(fails[0], { from: 'state', reason: 'thing load' });
});

test('a state saved by a newer build is skipped, and the tab stops saving so it never overwrites that save', async () => {
  const store = mem();
  store.setItem('boogle.world.test', JSON.stringify(snapOf({ grid: Array(16).fill(4) }, { grid: 1 })));
  const writes = store.writes;
  const net = makeNet();
  const host = makePeer(net, 'h', true, { storage: store });
  await run(net, [host], 1);
  assert.equal(host.s.worldStatus().ready, true);
  assert.equal(host.grid[0], 0, 'grid v1 is unknown to this build: left fresh');
  assert.equal(host.s.worldStatus().newerSave, true);
  host.s.submitEdit({ op: 'add', i: 0, j: 0, v: 1 });
  await run(net, [host], 620); // past the 30 s save interval
  assert.equal(host.grid[0], 1);
  assert.equal(store.writes, writes, 'nothing saved');
  assert.equal(JSON.parse(store.getItem('boogle.world.test')).vers.grid, 1);
});

// A fetch that finds no server copy and keeps every uploaded body.
const uploads = (bodies) => async (url, init) => {
  if (init?.method === 'PUT') bodies.push(JSON.parse(init.body));
  return { ok: false, status: 404 };
};

test('a client whose state fell back to fresh, taking over as host, loads the saved copy instead of uploading fresh', async () => {
  const saved = JSON.stringify(snapOf({ grid: Array(16).fill(5) }));
  const hostStore = mem();
  hostStore.setItem('boogle.world.test', saved);
  const store = mem(); // the client's own earlier (verified) save
  store.setItem('boogle.world.test', saved);
  const net = makeNet();
  const host = makePeer(net, 'h', true, { storage: hostStore });
  const bodies = [];
  const bad = { on: true }; // the host's snapshots fail to load here; the client's own save does not
  const c = makePeer(net, 'c', false, { storage: store, serverUrl: SERVER, fetch: uploads(bodies), failLoad: bad });
  await run(net, [host, c], 60);
  assert.equal(host.grid[0], 5);
  assert.equal(c.grid[0], 0, "the host's grid failed to load here: fresh");
  assert.ok(c.s.worldStatus().loadErrors > 0);
  bad.on = false;
  net.killHost();
  await run(net, [host, c], 620); // past the 30 s save interval
  assert.equal(c.s.worldStatus().mode, 'host');
  assert.equal(c.grid[0], 5, 'the new host recovered the saved copy');
  assert.ok(bodies.length > 0, 'the new host uploads');
  for (const b of bodies) assert.deepEqual(b.data.data.grid, Array(16).fill(5), 'never the fresh fallback');
});

test('a snapshot served by a tab that skipped a newer state is never saved by the clients that load it', async () => {
  const hostStore = mem();
  hostStore.setItem('boogle.world.test', JSON.stringify(snapOf({ grid: Array(16).fill(4) }, { grid: 1 })));
  const store = mem();
  const net = makeNet();
  const host = makePeer(net, 'h', true, { storage: hostStore });
  const c = makePeer(net, 'c', false, { storage: store });
  await run(net, [host, c], 620); // past the 30 s save interval, with matching hashes
  assert.equal(host.s.worldStatus().newerSave, true);
  assert.ok(c.s.worldStatus().hashOk > 0, 'the client is in step');
  assert.equal(c.s.worldStatus().newerSave, true);
  assert.equal(store.writes, 0, 'the client saved nothing');
});
