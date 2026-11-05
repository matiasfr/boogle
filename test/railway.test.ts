// Slice 1's exact conserved balances, bounded terminal receipts and recovery documents.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRailway,
  hashRailway,
  loadRailway,
  railAccount,
  railApply,
  railCounts,
  railOutcome,
  railPhase,
  railResume,
  railSession,
  railTick,
  serializeRailway,
  railwayInvariant,
  RAILWAY_DURATION,
  RAILWAY_OUTCOMES,
  RAILWAY_PILES,
  RAILWAY_MAX_INT,
  RAILWAY_MAX_MARKER,
  type Railway,
  type RailAction,
} from '../src/sim/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_SUPPLY, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { MAX_PLAYERS, createRoster, ensure, serializeRoster } from '../src/sim/roster.ts';
import { createSync, MAX_RECOVERY_BYTES, type RecoveryEnvelope } from '../src/world/sync.ts';
import { install as roster } from '../src/world/rules/roster.ts';
import { install as railway, edits } from '../src/world/rules/railway.ts';
import { homeLand } from './helpers/land.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { installPlayableRailwayRules } from '../src/world/rules/railway-index.ts';
import { createRailSupply } from '../src/sim/railway-supply.ts';

const action = (s: Railway, pid: string, op: string, fields: Partial<RailAction> = {}, tick = 100) => {
  const a = railAccount(s, pid)!;
  const e = { epoch: a.epoch, request: a.request + 1, op, ...fields };
  const result = railApply(s, pid, e, tick);
  assert.equal(railwayInvariant(s), null);
  return { result, e };
};
function seed(carries: number[], stock = 0) {
  const s = createRailway();
  carries.forEach((carry, i) => {
    railSession(s, `p${i}`, 1);
    s.accounts[i]!.carry = carry;
  });
  s.awake = 0;
  s.stock = s.delivered = stock;
  let debit = carries.reduce((a, b) => a + b, stock);
  for (let i = 0; debit && i < s.sources.length; i++) {
    const n = Math.min(debit, s.sources[i]!);
    s.sources[i]! -= n;
    s.work[i] = Math.ceil(n / 2) * 3;
    debit -= n;
  }
  assert.equal(railwayInvariant(s), null);
  return s;
}
function restore(s: Railway) {
  const next = createRailway();
  loadRailway(next, JSON.parse(JSON.stringify(serializeRailway(s))));
  assert.equal(hashRailway(next), hashRailway(s));
  assert.deepEqual(railCounts(next), railCounts(s));
  return next;
}

test('T1 last piece: reverse order, retry, retained carry and one funded completion', () => {
  for (const order of [
    ['p0', 'p1'],
    ['p1', 'p0'],
  ]) {
    const s = seed([4, 4], 23);
    const first = action(s, order[0]!, 'rail.deposit', { n: 4 });
    const second = action(s, order[1]!, 'rail.deposit', { n: 4 });
    assert.equal(first.result.accepted, 1);
    assert.equal(second.result.accepted, 0);
    assert.equal(railCounts(s).carry, 7);
    assert.equal(s.start, 100);
    assert.equal(s.allocation, 24);
    assert.deepEqual(railApply(s, order[0]!, first.e, 101), first.result);
    const joined = restore(s);
    railTick(s, 100 + RAILWAY_DURATION);
    railTick(joined, 100 + RAILWAY_DURATION);
    assert.equal(s.completion, 1);
    assert.equal(s.used, 24);
    assert.equal(s.allocation, 0);
    assert.equal(hashRailway(joined), hashRailway(s));
    const completed = restore(s);
    railTick(completed, 1000);
    assert.equal(hashRailway(completed), hashRailway(s));
    assert.equal(railCounts(s).score, 24 * 15 + 500);
  }
});

test('finite source: last stroke race and clipped/full capacity never destroy remaining logs', () => {
  const s = seed([7, 2]); // source0 has one left
  const a = action(s, 'p0', 'rail.chop', { id: 0 });
  const b = action(s, 'p1', 'rail.chop', { id: 0 });
  assert.equal(a.result.accepted, 1);
  assert.equal(b.result.accepted, 0);
  const before = s.sources[1];
  assert.equal(action(s, 'p0', 'rail.chop', { id: 1 }).result.accepted, 0);
  assert.equal(s.sources[1], before);
  assert.equal(railCounts(s).total, RAILWAY_SUPPLY);
  assert.equal(restore(s).sources[0], 0);
});

test('shared drops move only accepted capacity; whole-pile pickup race and saturation conserve', () => {
  const s = seed([8, 0, 0]);
  action(s, 'p0', 'rail.drop', { n: 8, x: T1.x, z: T1.z });
  const id = s.piles[0]!.id;
  assert.equal(action(s, 'p1', 'rail.take', { id }).result.accepted, 8);
  assert.equal(action(s, 'p2', 'rail.take', { id }).result.accepted, 0);
  assert.equal(restore(s).accounts[1]!.carry, 8);
  // Capacity case analogous to the audited classic bug: admitted writes contend for the final slot.
  const full = seed([8, 8]);
  full.piles = Array.from({ length: RAILWAY_PILES - 1 }, (_, id) => ({ id: id + 1, x: id, z: 0, n: 1 }));
  full.nextPile = RAILWAY_PILES;
  let n = RAILWAY_PILES - 1;
  for (let k = 2; n; k++) {
    const take = Math.min(n, full.sources[k]!);
    full.sources[k]! -= take;
    full.work[k] = Math.ceil((10 - full.sources[k]!) / 2) * 3;
    n -= take;
  }
  assert.equal(railwayInvariant(full), null);
  assert.equal(action(full, 'p0', 'rail.drop', { n: 8, x: 90000, z: 1 }).result.accepted, 8);
  assert.equal(action(full, 'p1', 'rail.drop', { n: 8, x: 90001, z: 1 }).result.accepted, 0);
  assert.equal(railAccount(full, 'p1')!.carry, 8);
});

test('late joins preserve 16/24, deposited, feeding, half laid; offline resumes only funded job once', () => {
  const partial = seed([8], 16);
  restore(partial);
  railResume(partial, RAILWAY_DURATION, 1, 100);
  assert.equal(partial.stock, 16);
  assert.equal(partial.completion, 0);
  action(partial, 'p0', 'rail.deposit', { n: 8 });
  for (const elapsed of [0, T1.depositTicks + 1, T1.depositTicks + T1.feedTicks + Math.floor(T1.layTicks / 2)]) {
    const s = restore(partial);
    railTick(s, 100 + elapsed);
    const peer = restore(s);
    assert.equal(railPhase(peer), railPhase(s));
    assert.equal(peer.elapsed, elapsed);
    const tick = 100 + elapsed;
    railResume(s, RAILWAY_DURATION, 2, tick);
    railResume(peer, RAILWAY_DURATION, 2, tick);
    assert.equal(s.completion, 1);
    assert.equal(hashRailway(s), hashRailway(peer));
    const final = hashRailway(s);
    railResume(s, RAILWAY_DURATION, 2, tick);
    assert.equal(hashRailway(s), final);
    assert.equal(railCounts(s).total, RAILWAY_SUPPLY);
  }
});

test('terminal outcomes survive retries, rejection, eviction, takeover and restart without respending', () => {
  const s = seed([8]);
  const first = action(s, 'p0', 'rail.drop', { n: 1, x: T1.x, z: T1.z });
  for (let i = 0; i < RAILWAY_OUTCOMES + 1; i++) action(s, 'p0', 'rail.reject');
  assert.equal(s.outcomes.length, RAILWAY_OUTCOMES);
  const r = restore(s);
  const total = railCounts(r);
  assert.equal(railApply(r, 'p0', first.e, 200).status, 'snapshot-required');
  assert.deepEqual(railCounts(r), total);
  const rejected = action(r, 'p0', 'rail.reject');
  assert.equal(railApply(r, 'p0', { ...rejected.e, op: 'rail.drop', n: 8, x: T1.x, z: T1.z }, 200).status, 'rejected');
  assert.equal(railSession(r, 'p0', 2), true);
  assert.equal(railSession(r, 'p0', 2), false);
  assert.equal(railOutcome(r, 'p0', 1, rejected.e.request + 1)!.status, 'snapshot-required');
  assert.equal(railAccount(r, 'p0')!.carry, 7);
});

test('strict atomic loading refuses cross-account loss, future catalog and malformed phase', () => {
  const s = seed([4, 4], 16),
    original = hashRailway(s);
  for (const change of [
    (j: Railway) => j.accounts[0]!.carry++,
    (j: Railway) => j.catalog++,
    (j: Railway) => j.sources.push(10),
    (j: Railway) => (j.completion = 1),
    (j: Railway) => j.accounts.push({ ...j.accounts[0]! }),
    (j: Railway) => (j.accounts[0]!.request = NaN),
  ]) {
    const j = structuredClone(s);
    change(j);
    assert.throws(() => loadRailway(s, serializeRailway(j)));
    assert.equal(hashRailway(s), original);
  }
});

test('supported pid lifetime cannot strand the full finite catalog; bounded document stays below60KB', (t) => {
  const s = createRailway();
  s.awake = 0;
  for (let k = 0; k < MAX_PLAYERS; k++) railSession(s, `p${k}`.padEnd(32, 'x'), 1);
  let index = 0;
  for (const a of s.accounts)
    for (let hit = 0; hit < 4; hit++) {
      while (s.sources[index] === 0) index++;
      action(s, a.pid, 'rail.chop', { id: RAILWAY_SOURCES[index]![0] });
    }
  assert.equal(railCounts(s).carry, MAX_PLAYERS * T1.carry);
  assert.ok(railCounts(s).source >= T1.bill);
  for (const a of s.accounts) {
    a.epoch = RAILWAY_MAX_INT;
    a.request = RAILWAY_MAX_INT;
  }
  for (const r of s.outcomes) {
    r.epoch = RAILWAY_MAX_INT;
    r.request = RAILWAY_MAX_INT;
  }
  // Distinct last64 outcomes are compacted here to one per actual account before checking the worst ID widths.
  s.outcomes = s.accounts
    .slice(-64)
    .map((a) => ({ pid: a.pid, epoch: a.epoch, request: a.request, status: 'noop', accepted: 0 }));
  const rosterState = createRoster();
  for (const a of s.accounts) {
    const k = ensure(rosterState, a.pid);
    rosterState.names[k] = '木'.repeat(16);
    rosterState.colors[k] = 7;
  }
  s.piles = Array.from({ length: RAILWAY_PILES }, (_, k) => ({
    id: RAILWAY_MAX_INT - RAILWAY_PILES + k,
    x: 200000,
    z: -200000,
    n: T1.carry,
  }));
  s.nextPile = RAILWAY_MAX_INT;
  s.awake = RAILWAY_MAX_INT;
  s.lastTick = RAILWAY_MAX_INT;
  s.resumeMarker = RAILWAY_MAX_MARKER;
  let debit = RAILWAY_PILES * T1.carry;
  for (let k = 0; debit; k++) {
    const n = Math.min(debit, s.sources[k]!);
    s.sources[k]! -= n;
    debit -= n;
    if (n) s.work[k] = Math.ceil((10 - s.sources[k]!) / 2) * 3;
  }
  const snapshot = {
    tick: RAILWAY_MAX_INT,
    seed: 20261028,
    epochMs: 1793850000000,
    data: { roster: serializeRoster(rosterState), railway: serializeRailway(s) },
    vers: { roster: 0, railway: 0 },
  };
  const envelope: RecoveryEnvelope = {
    version: 1,
    namespace: 't1v01',
    catalog: '1',
    checkpoint: snapshot,
    hash: 4294967295,
    tail: Array.from({ length: 64 }, (_, k) => ({
      tick: RAILWAY_MAX_INT,
      seq: RAILWAY_MAX_INT - 64 + k,
      e: {
        op: 'rail.drop',
        i: 0,
        j: 0,
        p: 's'.repeat(32),
        u: s.accounts[k]!.pid,
        epoch: RAILWAY_MAX_INT,
        request: RAILWAY_MAX_INT,
        n: 8,
        x: -200000,
        z: -200000,
      },
    })),
    seq: RAILWAY_MAX_INT,
    checksum: 4294967295,
  };
  const bytes = Buffer.byteLength(JSON.stringify(envelope));
  t.diagnostic(`maximum capped recovery fixture: ${bytes}/${MAX_RECOVERY_BYTES} bytes`);
  assert.ok(bytes < MAX_RECOVERY_BYTES, `${bytes} bytes`);
  // Production admits identity/ball-rest and two bounded supply tune overrides in explicit proto rooms.
  // All other base states stay initial; their material ops are rejected at the room boundary.
  const production = createSync();
  const base = installPlayableRailwayRules(production, homeLand());
  production.updateWorld(0.1);
  base.ball.ball.p = [-25500, 19999, 25500];
  base.ball.ball.at = RAILWAY_MAX_INT;
  base.tune.tune.v.railRegrowMinutes = 1440;
  base.tune.tune.v.railRecoveryMinutes = 1440;
  const initial = production.snapshot();
  const placed = structuredClone(s);
  placed.supply = createRailSupply();
  placed.supply.marker = Number.MAX_SAFE_INTEGER;
  placed.falls = {
    yaw: placed.sources.map((n) => (n === 0 ? 6.123456789012345 : 0)),
    collapsed: placed.sources.map((n) => n === 0),
  };
  for (const pile of placed.piles) {
    pile.y = -200000;
    pile.age = 21;
  }
  const playableData = serializeRailway(placed, rosterState.pids);
  loadRailway(createRailway(true), playableData, rosterState.pids);
  const playable = {
    ...envelope,
    namespace: 't1v02',
    tail: envelope.tail.map((entry) => ({ ...entry, e: { ...entry.e, y: -200000 } })),
    checkpoint: {
      ...snapshot,
      data: { ...initial.data, ...snapshot.data, railway: playableData },
      vers: { ...initial.vers, ...snapshot.vers },
    },
  };
  const playableBytes = Buffer.byteLength(JSON.stringify(playable));
  t.diagnostic(`maximum playable recovery fixture: ${playableBytes}/${MAX_RECOVERY_BYTES} bytes`);
  assert.ok(playableBytes < MAX_RECOVERY_BYTES, `${playableBytes} bytes`);
  const chopTail = envelope.tail.map((entry) => ({
    ...entry,
    e: {
      op: 'rail.chop',
      i: 0,
      j: 0,
      p: entry.e.p,
      u: entry.e.u,
      epoch: RAILWAY_MAX_INT,
      request: RAILWAY_MAX_INT,
      id: RAILWAY_SOURCES.at(-1)![0],
      yaw: -0.0000010000000000000002,
      collapsed: false,
    },
  }));
  const chopBytes = Buffer.byteLength(JSON.stringify({ ...playable, tail: chopTail }));
  t.diagnostic(`maximum playable chop-tail recovery fixture: ${chopBytes}/${MAX_RECOVERY_BYTES} bytes`);
  assert.ok(chopBytes < MAX_RECOVERY_BYTES, `${chopBytes} bytes with chop tail`);
  // Supply keeps the same fixed-length source ages even at every growth stage. Bound its largest ledger counters
  // and a mixed 64-stamp tail independently of timings on a loaded host.
  const mixed = structuredClone(playable);
  mixed.checkpoint.data.railway.supply!.produced = 2147479760;
  mixed.checkpoint.data.railway.supply!.rack = 2147483640;
  const supplyEdit = {
    op: 'rail.supply',
    i: 0,
    j: 0,
    p: 's'.repeat(32),
    u: 'p'.repeat(32),
    marker: Number.MAX_SAFE_INTEGER,
    grow: 'f'.repeat(Math.ceil(RAILWAY_SOURCES.length / 4)),
    recover: [RAILWAY_MAX_INT],
  };
  // maintainSupply holds one pending stamp until onApplied; the real-host gate is tested in
  // railway-supply-durability.test.ts. A hypothetical tail of 64 supply stamps is not reachable.
  const mixedBytes = Buffer.byteLength(
    JSON.stringify({ ...mixed, tail: chopTail.map((entry, k) => ({ ...entry, e: k === 0 ? supplyEdit : entry.e })) }),
  );
  t.diagnostic(`maximum mixed supply-tail recovery bound: ${mixedBytes}/${MAX_RECOVERY_BYTES} bytes`);
  assert.ok(mixedBytes < MAX_RECOVERY_BYTES, `${mixedBytes} bytes with max supply/chop stamps`);
  assert.equal(railwayInvariant(s), null);
});

test('catalog exactly pins current T1 recipe and every starter source to centimetres', async () => {
  const layout = await import('../src/proto/place/layout.ts');
  const { frameBesideLine } = await import('../src/proto/place/spatial-station.ts');
  const { LAND_TREES } = await import('../src/proto/place/tree-catalog.ts');
  const rng = mulberry32(77),
    rows: number[][] = [];
  let id = 0;
  for (const g of layout.GROVES)
    for (let k = 0; k < g.n; k++) {
      const a = (k / g.n) * Math.PI * 2 + rng() * 0.5,
        r = g.r * (0.35 + rng() * 0.65);
      rows.push([
        id++,
        Math.round((g.x + Math.cos(a) * r + layout.ORIGIN.x) * 100),
        Math.round((g.z + Math.sin(a) * r + layout.ORIGIN.z) * 100),
      ]);
      rng(); // tree size consumes the third value
    }
  rows.push([
    id++,
    Math.round((layout.OAK.x + layout.ORIGIN.x) * 100),
    Math.round((layout.OAK.z + layout.ORIGIN.z) * 100),
  ]);
  id++; // great tree is a later beam, not T1 material
  for (const t of LAND_TREES) {
    if (!t.hardwood) rows.push([id, Math.round(t.x * 100), Math.round(t.z * 100)]);
    id++;
  }
  assert.deepEqual(RAILWAY_SOURCES, rows);
  const link = layout.LINKS[0]!,
    station = link.stations[0]!,
    at = frameBesideLine(station, link.line, link.dir);
  assert.equal(T1.bill, station.logs);
  assert.equal(station.rails, 0);
  assert.equal(T1.carry, layout.TUNE.carry);
  assert.equal(T1.strokeYield, layout.TUNE.logsPerStroke);
  assert.equal(T1.sourceYield, layout.TUNE.strokes * layout.TUNE.logsPerStroke);
  assert.equal(T1.fromCm, Math.round(station.s * 100));
  assert.equal(T1.toCm, Math.round(station.to * 100));
  assert.equal(T1.x, Math.round(at.x * 100));
  assert.equal(T1.z, Math.round(at.z * 100));
  assert.equal(T1.layTicks, Math.ceil(((station.s - station.to) / layout.TUNE.laySpeed) * 10));
  assert.equal(T1.feedTicks, Math.ceil(((station.logs - 1) * layout.TUNE.feedS + 0.55) * 10));
  assert.equal(T1.starterRails, layout.TUNE.rackStart);
  assert.equal(T1.swingMs, layout.TUNE.swingS * 1000);
  assert.equal(T1.unloadMs, layout.TUNE.unloadS * 1000);
});

test('wake eligibility is scheduled; source work retains a clipped productive hit after restore', () => {
  const s = createRailway();
  railSession(s, 'p0', 1);
  assert.equal(action(s, 'p0', 'rail.chop', { id: 0 }, 1).result.accepted, 0);
  action(s, 'p0', 'rail.wake', {}, 2);
  assert.equal(railPhase(s, 2), 'waking');
  assert.equal(railPhase(s, 2 + T1.wakeTicks), 'idle');
  const clipped = seed([7]);
  assert.equal(action(clipped, 'p0', 'rail.chop', { id: 1 }).result.accepted, 1);
  assert.equal(clipped.work[1], 3);
  assert.equal(clipped.sources[1], 9);
  assert.equal(restore(clipped).work[1], 3);
});

test('isolated registered rules fail closed without host facts; seeded edit replay matches each tick', () => {
  const make = (facts = true) => {
    const sync = createSync({ env: facts ? { railReach: () => true, railCadence: () => true } : {} });
    sync.setSelfId('railtester');
    sync.setPid('railtester');
    const land = homeLand(),
      r = roster(sync),
      api = railway(sync, land, { roster: r });
    return { sync, api };
  };
  const missing = make(false);
  assert.equal(missing.sync.submitEdit({ op: 'rail.session', i: 0, j: 0, pid: 'railtester', epoch: 1 }), true);
  missing.sync.updateWorld(0.1);
  assert.equal(missing.sync.submitEdit({ op: 'rail.chop', i: 0, j: 0, epoch: 1, request: 1, id: 0 }), false);
  const a = make(),
    b = make();
  let joiner: ReturnType<typeof make> | null = null;
  const accepted = new Set<string>();
  const random = mulberry32(17);
  const stream = {
    next: random,
    int: (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1)),
    pick: <T>(xs: readonly T[]) => xs[Math.floor(random() * xs.length)]!,
    chance: (p: number) => random() < p,
  };
  for (const peer of [a, b]) {
    peer.sync.submitEdit({ op: 'rail.session', i: 0, j: 0, pid: 'railtester', epoch: 1 });
    peer.sync.updateWorld(0.1);
  }
  for (let k = 0; k < 400; k++) {
    const keys = Object.keys(edits) as (keyof typeof edits)[],
      op = keys[k % keys.length]!;
    const e = edits[op](stream, { rules: { railway: a.api }, tick: a.sync.world.tick });
    const queued = a.sync.submitEdit(e);
    assert.equal(queued, b.sync.submitEdit(e));
    if (queued) accepted.add(op);
    if (joiner) assert.equal(queued, joiner.sync.submitEdit(e));
    a.sync.updateWorld(0.1);
    b.sync.updateWorld(0.1);
    joiner?.sync.updateWorld(0.1);
    assert.deepEqual(a.sync.stateHashes(), b.sync.stateHashes());
    assert.equal(railwayInvariant(a.api.railway), null);
    if (joiner) assert.deepEqual(a.sync.stateHashes(), joiner.sync.stateHashes());
    if (k === 199) {
      const saved = JSON.parse(JSON.stringify(a.sync.snapshot()));
      b.sync.loadSnapshot(saved);
      joiner = make();
      joiner.sync.loadSnapshot(saved);
    }
  }
  assert.deepEqual([...accepted].sort(), Object.keys(edits).sort(), 'every isolated op has a seeded accepted edit');
  assert.deepEqual(a.sync.registry().ops.sort(), Object.keys(edits).concat('who.set').sort());
});
