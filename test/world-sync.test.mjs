// World sync with a fake in-memory room: one host + clients, deterministic frame driver, toy counter-grid state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as singleton from '../src/world/sync.ts';
import { createSync } from '../src/world/sync.ts';
import { makeNet, run, live } from './helpers/net.mjs';

// opts: env goes to createSync (the host facts validate reads); failLoad ({ on }) makes grid loads throw while on (bad data
// from a peer); the rest goes to attachWorld (storage, saveMs, ...).
function makePeer(net, id, host, opts = {}) {
  const { env, failLoad, pid, extra, ...attach } = opts;
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
  extra?.(s); // more states or ops on this peer only, registered before it attaches
  const p = net.add(id, host, pid ?? id);
  s.attachWorld(p.room, { roomId: 'test', host, storage: null, now: () => 1234, ...attach });
  return { s, grid, log, p };
}

// In-memory storage (the host's save) that counts writes.
const mem = () => {
  const m = new Map();
  const store = { writes: 0, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => (store.writes++, m.set(k, v)) };
  return store;
};
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

test('an edit from a session the room has no pid for is rejected', async () => {
  const net = makeNet();
  const all = [makePeer(net, 'h', true, { pid: 'pidh' })];
  await run(net, all, 20);
  const ghost = net.add('ghost', false, null); // a raw room the server bound to no player
  ghost.room.send({ t: 'w:edit', e: { op: 'mark', i: 0, j: 0, u: 'pidh' } });
  await run(net, all, 20);
  assert.deepEqual(all[0].log, []);
  const known = net.add('known', false, 'pidg');
  known.room.send({ t: 'w:edit', e: { op: 'mark', i: 0, j: 0, u: 'pidh' } });
  await run(net, all, 20);
  assert.deepEqual(all[0].log, ['known=pidg']);
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

test("unloadable snapshots are reported (peer chunk, the host's save)", async () => {
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
  const room = { selfId: 'x', send() {}, onMessage: () => () => {}, onConnection: () => () => {} };
  solo.attachWorld(room, { roomId: 'test', host: true, storage: { getItem: () => '{corrupt', setItem() {} } });
  assert.deepEqual(fails, [{ from: 'local', reason: 'parse' }]);
  assert.ok(solo.worldStatus().ready, 'starts fresh anyway');
  solo.detachWorld();
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

test('a host whose save fails to load never writes its fresh fallback over that save', async () => {
  // A corrupt file, and a valid file whose grid this build's load rejects.
  for (const [saved, failLoad] of [
    ['{not json', undefined],
    [JSON.stringify(snapOf({ grid: Array(16).fill(4) })), { on: true }],
  ]) {
    const store = mem();
    store.setItem('boogle.world.test', saved);
    const writes = store.writes;
    const net = makeNet();
    const host = makePeer(net, 'h', true, { storage: store, failLoad });
    await run(net, [host], 1);
    if (failLoad) failLoad.on = false;
    assert.equal(host.s.worldStatus().ready, true, 'the room still runs, on a fresh world');
    assert.equal(host.s.worldStatus().badSave, true);
    host.s.submitEdit({ op: 'add', i: 0, j: 0, v: 1 });
    await run(net, [host], 620); // past the 30 s save interval
    assert.equal(host.s.saveNow(true), false, 'a forced save (shutdown) is refused too');
    assert.equal(store.writes, writes, 'nothing saved');
    assert.equal(store.getItem('boogle.world.test'), saved, 'the bad save is left for a fix');
  }
});

test("a state only the host has does not fail the client's hash check", async () => {
  const net = makeNet();
  let n = 0;
  const host = makePeer(net, 'h', true, {
    extra: (s) => s.registerState('serverOnly', { serialize: () => n, load: (v) => (n = v), hash: () => (n += 1) }),
  });
  const c = makePeer(net, 'c', false);
  await run(net, [host, c], 60);
  const st = c.s.worldStatus();
  assert.ok(st.hashOk > 0, 'hash checks ran');
  assert.equal(st.hashBad, 0);
  assert.equal(st.resyncs, 0);
});

test('a state skipped as newer is left out of the hash check', async () => {
  const net = makeNet();
  let t = 0;
  const thing = (version) => (s) =>
    s.registerState('thing', { version, serialize: () => t, load: () => {}, hash: () => (t += 7) });
  const host = makePeer(net, 'h', true, { extra: thing(2) });
  const c = makePeer(net, 'c', false, { extra: thing(1) });
  await run(net, [host, c], 60);
  const st = c.s.worldStatus();
  assert.equal(st.newerSave, true);
  assert.ok(st.resyncs <= 1, `resyncs ${st.resyncs}`);
});

test('saveMs sets how often a host saves', async () => {
  const net = makeNet();
  const storage = mem();
  const host = makePeer(net, 'h', true, { storage, saveMs: 1000 });
  await run(net, [host], 4);
  const w0 = storage.writes;
  host.s.submitEdit({ op: 'add', i: 0, j: 0, v: 1 });
  await run(net, [host], 25); // 1.25 s
  assert.equal(storage.writes - w0, 1);
});

test('saveNow writes at once and skips an unchanged world', async () => {
  const net = makeNet();
  const storage = mem();
  const host = makePeer(net, 'h', true, { storage });
  await run(net, [host], 4);
  host.s.submitEdit({ op: 'add', i: 0, j: 0, v: 2 });
  await run(net, [host], 4);
  const w0 = storage.writes;
  assert.equal(host.s.saveNow(), true);
  assert.equal(storage.writes, w0 + 1);
  assert.equal(host.s.saveNow(), false, 'nothing changed since');
  assert.equal(storage.writes, w0 + 1);
});
