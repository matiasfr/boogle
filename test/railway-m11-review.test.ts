// Review of M11 (branch ecs/m11-server-reads-world): the host's reads and the tools' reads moved off the `Railway` read
// model onto rows and queries on the world. Since M12b-1 (the model is gone) each test holds a rule of its own, at the
// points the M11 proof did not reach: the host's reads at each stage against literals (recorded on ecs/m12f, where the
// host and the read model still agreed value for value), a client's mirror while a late join's chunks are still
// arriving (dev/peer-test/ws-page.ts's probes), a row held across a rule (the comment on dev/loop/run.ts's `Game.w`),
// the away credit's cap exactly at the active job's schedule and a tick either side, on every stage and mid-job, and
// phase() tick by tick across its edges.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import { createSync } from '../src/world/sync.ts';
import { installRailRules } from './helpers/rail-rules.ts';
import { install as installRailway, type Actor } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import * as q from '../src/sim/railway-queries.ts';
import * as q1 from '../src/sim/railway-queries-line1.ts';
import * as q2 from '../src/sim/railway-queries-line2.ts';
import * as rows from '../src/sim/railway-rows.ts';
import { buildSeedWorld, type SeedStage } from '../src/sim/railway-seeds.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { railResume } from '../src/sim/railway-sys-away.ts';
import { Job, Pile, createRailwayWorld } from '../src/sim/railway-components.ts';
import { LINE1_STATIONS } from '../src/sim/railway-line-layout.ts';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import type { ServerPacket } from '../src/world/replicate.ts';
import { homeLand } from './helpers/land.ts';

const anywhere: Actor = { reach: () => true, height: () => true, cadence: () => true };

// A seed takes seconds to build: each is built once and loaded as often as needed.
const seeds = new Map<SeedStage, ReturnType<typeof buildSeedWorld>>();
const seedOf = (stage: SeedStage) => seeds.get(stage) ?? seeds.set(stage, buildSeedWorld(stage)).get(stage)!;
/** Open pid's next session; its epoch. */
function open(r: ReturnType<typeof host>, pid: string) {
  const e = (r.api.account(pid)?.epoch ?? 0) + 1;
  assert.ok(r.api.session(pid, e), `session ${pid} ${e}`);
  return e;
}
function host(stage?: SeedStage) {
  const sync = createSync();
  const replication = createReplicator();
  const api = installRailway(sync, installRailRules(sync, homeLand(), replication), replication);
  api.touchAll();
  if (stage) {
    const seed = seedOf(stage);
    while (sync.world.tick <= seed.t) sync.stepWorld(100);
    api.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())), railwayCheck);
    api.touchAll();
  }
  return { sync, api, replication };
}

// ---------------------------------------------------------------- the host's reads at each stage
// [stage, phase(), panels() committed and stock, line2() active, completed and gateOpen, railMaxDuration (the away
// credit's cap), and counts()' score, total, rails.total and stone.total].
const HOST_READS = [
  ['fresh', 'asleep', 0, 56, -1, 0, false, 115, 0, 3910, 0, 40],
  ['awake', 'idle', 0, 56, -1, 0, false, 115, 0, 3910, 0, 40],
  ['q1-done', 'done', 56, 0, 1, 1, false, 217, 6460, 3934, 33, 40],
  ['q3-done', 'done', 56, 0, 3, 3, false, 217, 9020, 3934, 61, 40],
  ['q4-done', 'done', 56, 0, 4, 4, true, 217, 10400, 3934, 77, 40],
  ['q5-finishing', 'done', 56, 0, 4, 4, true, 217, 11720, 3934, 101, 40],
  ['glide-earned', 'done', 56, 0, 5, 5, true, 217, 12220, 3934, 101, 40],
  ['boiler', 'done', 56, 0, 5, 5, true, 217, 12220, 3934, 101, 40],
  ['trains-on', 'done', 56, 0, 5, 5, true, 217, 12220, 3966, 104, 40],
  ['q6-done', 'done', 56, 0, -1, 6, true, 217, 14480, 3966, 133, 40],
  ['works-open', 'done', 56, 0, -1, 6, true, 217, 14480, 3966, 133, 40],
  ['works-lit', 'done', 56, 0, -1, 6, true, 217, 14480, 3966, 133, 40],
  ['crossing-finishing', 'done', 56, 0, -1, 6, true, 217, 14480, 3966, 141, 40],
  ['crossing-done', 'done', 56, 0, 6, 6, true, 217, 14480, 3966, 141, 40],
  ['deck-laid', 'done', 56, 0, -1, 7, true, 217, 16080, 3986, 161, 40],
  // R2: the rivet's first train at the Village took the steel works' kit (8 logs made, 12 rails the forge pours again).
  ['ring-joined', 'done', 56, 0, -1, 7, true, 217, 16080, 3994, 169, 40],
] as const;
// Built at module scope, outside the 5 s test timeout (as the golden shards do); STAGES below is a subset.
for (const [stage] of HOST_READS) if (stage !== 'fresh') seedOf(stage);
/** A HOST_READS row (without its stage) from the host now. */
function hostRow(r: ReturnType<typeof host>) {
  const p = r.api.panels(),
    l = r.api.line2(),
    c = r.api.counts();
  const got = [r.api.phase(), p.committed, p.stock, l.active, l.completed, l.gateOpen];
  got.push(q1.railMaxDuration(r.api.world()), c.score, c.total, c.rails.total, c.stone.total);
  return got;
}
test("M11 review: the host's phase, panels, line two, resume cap and counts at each stage", () => {
  for (const [stage, ...want] of HOST_READS)
    assert.deepEqual(hostRow(host(stage === 'fresh' ? undefined : stage)), want, stage);
});

// ---------------------------------------------------------------- ws-page.ts's probes during a late join
// ws-page.ts's gate: the mirror's confirmed world, published only once whole (a fresh railway before that). The
// review's first copy gated on `count(Rail) === 1`, which a late join's first chunk already meets.
const mirrored = (m: ReturnType<typeof createRailwayMirror>): World => m.confirmed();
/** What ws-page.ts's probes report from a world at `tick`. */
function probe(mw: World, tick: number) {
  const piles: number[][] = [];
  mw.each([Pile], (id, p) => piles.push([id, p.x, p.y, p.z, p.n, p.kind]));
  return {
    phase: q1.railPhase(mw, tick, tick),
    activeStation: q.railActiveStation(mw),
    counts: q2.railCounts(mw, tick),
    accounts: rows.accounts(mw).map((a) => ({ ...a })),
    sources: RAILWAY_SOURCES.map(([id], k) => ({ id, remaining: rows.tree(mw, k).left })),
    line2: rows.qjobs(mw).map((j) => j.completion),
    piles,
  };
}
/** T.railLoad's reads (ws-page.ts, the no-adapter load cycle): the account and the first standing tree from `first`. */
function loadReads(mw: World, first: number) {
  let source = first;
  for (let n = 0; n < RAILWAY_SOURCES.length && rows.tree(mw, source).left === 0; n++)
    source = (source + 1) % RAILWAY_SOURCES.length;
  return { me: rows.account(mw, 'a') ? { ...rows.account(mw, 'a')! } : undefined, source };
}
/** Both reads, failing with the chunk named if either throws. */
function reads(m: ReturnType<typeof createRailwayMirror>, tick: number, where: string) {
  try {
    return { probe: probe(mirrored(m), tick), load: loadReads(mirrored(m), 0) };
  } catch (e) {
    return assert.fail(`${where} (synced ${m.synced()}): the probes throw: ${String(e)}`);
  }
}

test('M11 review: before a whole state, the probes read a fresh railway', () => {
  const m = createRailwayMirror();
  assert.deepEqual(probe(mirrored(m), 0), probe(createRailwayWorld(), 0));
});
for (const stage of ['fresh', 'q6-done', 'ring-joined'] as const)
  test(`M11 review at ${stage}: ws-page's probes between a late join's chunks read a fresh railway, then the server's`, () => {
    const r = host(stage === 'fresh' ? undefined : stage);
    const step = r.sync.roomStep();
    r.replication.commit(step);
    r.replication.addClient('c');
    const packets: ServerPacket[] = [];
    r.replication.flush(step, (_cid, _p, json) => packets.push(JSON.parse(json)));
    assert.ok(packets.length > 1, `${stage}: the whole state goes in ${packets.length} chunks (more than one)`);
    const m = createRailwayMirror();
    const tick = r.sync.world.tick;
    const fresh = reads(m, tick, `${stage}: before the first chunk`);
    const server = { probe: probe(r.api.world(), tick), load: loadReads(r.api.world(), 0) };
    for (const [k, p] of packets.entries()) {
      assert.ok(m.mirror.apply(p, 0), `chunk ${k} applies`);
      const where = `${stage}: after chunk ${k} of ${packets.length}`;
      assert.deepEqual(reads(m, tick, where), k < packets.length - 1 ? fresh : server, where);
    }
  });

test('M11 review: during a refill the probes read the state shown before it, then the refilled one', () => {
  const r = host('q6-done');
  const m = createRailwayMirror();
  r.replication.addClient('c');
  let step = r.sync.roomStep();
  r.replication.commit(step);
  r.replication.flush(step, (_cid, _p, json) => assert.ok(m.mirror.apply(JSON.parse(json), 0)));
  assert.ok(m.synced());
  // Move the world on, then the client resyncs: a whole state built aside while the old one stays shown.
  for (let t = 0; t < 30; t++) r.sync.stepWorld(100);
  const e = open(r, 'a');
  r.api.act(
    'a',
    { op: 'rail.chop', id: RAILWAY_SOURCES[3]![0], yaw: 0, collapsed: true, epoch: e, request: 1 } as never,
    anywhere,
  );
  m.refill();
  r.replication.removeClient?.('c');
  r.replication.addClient('c');
  step = r.sync.roomStep();
  r.replication.commit(step);
  const packets: ServerPacket[] = [];
  r.replication.flush(step, (_cid, _p, json) => packets.push(JSON.parse(json)));
  const tick = r.sync.world.tick;
  const shown = reads(m, tick, 'before the refill');
  const server = { probe: probe(r.api.world(), tick), load: loadReads(r.api.world(), 0) };
  assert.notDeepEqual(shown, server, 'the chop moved the server on');
  for (const [k, p] of packets.entries()) {
    assert.ok(m.mirror.apply(p, 0), `refill chunk ${k}`);
    const where = `refill chunk ${k} of ${packets.length}`;
    assert.deepEqual(reads(m, tick, where), k < packets.length - 1 ? shown : server, where);
  }
});

// ---------------------------------------------------------------- dev/loop/run.ts: a row held across a rule
// `Game.w`'s first comment said a held row keeps its value from before a press, as the read model's copy did. It does
// not: `world.mut` writes the row in place (src/ecs/world.ts, `write`: only a row a cloned world still shares is
// copied), so a row held across a rule is live and shows the write. The comments say so (dev/loop/run.ts,
// src/sim/railway-rows.ts); the loop's hash shows no policy relied on it.
test('M11 review: a row held across an accepted action is live', () => {
  const r = host('awake');
  const e = open(r, 'a');
  const held = rows.account(r.api.world(), 'a')!;
  const before = { ...held };
  const res = r.api.act(
    'a',
    { op: 'rail.chop', id: RAILWAY_SOURCES[0]![0], yaw: 0, collapsed: true, epoch: e, request: 1 } as never,
    anywhere,
  );
  assert.equal(res.status, 'accepted');
  assert.notDeepEqual({ ...rows.account(r.api.world(), 'a')! }, before, 'the chop changed the account');
  assert.deepEqual({ ...held }, { ...rows.account(r.api.world(), 'a')! }, 'the held row is live: it shows the chop');
});

// ---------------------------------------------------------------- the away credit's cap
const STAGES: readonly SeedStage[] = [
  'awake',
  'q1-done',
  'q3-done',
  'q4-done',
  'q5-finishing',
  'glide-earned',
  'boiler',
  'trains-on',
  'q6-done',
  'works-open',
  'works-lit',
  'crossing-finishing',
  'crossing-done',
  'deck-laid',
  'ring-joined',
];
/** The host's resume against railResume capped by railMaxDuration, on a copy of the same world. */
function resumeAgrees(r: ReturnType<typeof host>, ticks: number, yard: number, where: string) {
  const marker = r.api.resumeMarker() + 1;
  const copy = createRailwayWorld();
  copy.load(JSON.parse(JSON.stringify(r.api.world().snapshot())));
  const want = railResume(copy, Math.min(ticks, q1.railMaxDuration(copy)), marker, r.sync.world.tick, yard);
  assert.equal(r.api.resume(ticks, marker, yard), want, `${where}: job ticks credited`);
  assert.equal(r.api.world().hash(), copy.hash(), `${where}: the same world`);
  return want;
}
for (const stage of STAGES)
  test(`M11 review at ${stage}: the away credit at the cap, a tick under and a tick over`, () => {
    const probeCap = host(stage);
    const cap = q1.railMaxDuration(probeCap.api.world());
    for (const ticks of [cap - 1, cap, cap + 1, Number.MAX_SAFE_INTEGER])
      for (const yard of [0, 600]) resumeAgrees(host(stage), Math.max(1, ticks), yard, `${stage} ${ticks}/${yard}`);
  });
// A room resumed after three days away (yard credit included), then the host's reads: [stage, job ticks credited,
// then the HOST_READS row after the credit]. No stage has a job laying, so none credits job ticks; the yard's credit
// shows in the rails (q1-done's 33 become 37). The mid-job test below holds the cap on a laying job. Recorded on 5241b102f from the host (unchanged since 9e7dfcbde, where the
// deleted M11 proof held the same reads equal to the read model's).
const DAYS_AWAY = [
  ['awake', 0, 'idle', 0, 56, -1, 0, false, 115, 0, 3910, 0, 40],
  ['q1-done', 0, 'done', 56, 0, 1, 1, false, 217, 6460, 3934, 37, 40],
  ['q4-done', 0, 'done', 56, 0, 4, 4, true, 217, 10400, 3934, 77, 40],
  ['q6-done', 0, 'done', 56, 0, -1, 6, true, 217, 14480, 3966, 133, 40],
  ['works-lit', 0, 'done', 56, 0, -1, 6, true, 217, 14480, 3966, 133, 40],
  ['ring-joined', 0, 'done', 56, 0, -1, 7, true, 217, 16080, 3994, 173, 40], // R2: the steel kit, as above
] as const;
test('M11 review: a room resumed after three days is capped, credited and read as recorded', () => {
  const days = 3 * 24 * 36000; // ticks of 100 ms
  const got = DAYS_AWAY.map(([stage]) => {
    const r = host(stage);
    return [stage, resumeAgrees(r, days, days, `${stage} after three days`), ...hostRow(r)];
  });
  assert.deepEqual(got, DAYS_AWAY);
});
test('M11 review: the away credit mid-job on line one, at the cap and either side of it', () => {
  // T1 funded `part` ticks ago (its row set as a funding would leave it), then credited around what is left.
  const whole = q1.railMaxDuration(host('awake').api.world());
  for (const part of [0, 1, Math.floor(whole / 2), whole - 1]) {
    const base = host('awake');
    const w = base.api.world();
    Object.assign(w.mut(Job, w.lookup(Job, 0)!)!, {
      start: base.sync.world.tick - part,
      stock: LINE1_STATIONS[0]!.bill[0],
    });
    assert.ok(q1.railMaxDuration(w) > part, 'mid-job');
    const snap = JSON.stringify(base.api.world().snapshot());
    const cap = q1.railMaxDuration(base.api.world());
    for (const ticks of [cap - part - 1, cap - part, cap - part + 1, cap - 1, cap, cap + 1]) {
      const r = host();
      while (r.sync.world.tick < base.sync.world.tick) r.sync.stepWorld(100);
      r.api.world().load(JSON.parse(snap));
      r.api.touchAll();
      resumeAgrees(r, Math.max(1, ticks), 0, `T1 part ${part}, ${ticks}`);
    }
  }
});

// ---------------------------------------------------------------- phase() tick by tick across its edges
// Every tick across the wake's edge, a funded T1's deposit, feed and lay edges, a save and restore, and an away
// credit: the host's phase() as runs of [phase, reads], recorded on ecs/m12f where each read equalled the read model's
// railPhase of the same world at the same tick (the M11 proof stepped several ticks at a time and could step over an
// edge). A restore or a credit that moved the phase shows as a changed run.
const PHASE_RUNS = [
  ['asleep', 1],
  ['waking', 31],
  ['idle', 28],
  ['deposit', 5],
  ['feeding', 22],
  ['laying', 86],
  ['idle', 8],
];
test('M11 review: phase() every tick across the wake, a funded job, a restore and an away credit', () => {
  const r = host();
  const e = open(r, 'a');
  const runs: [string, number][] = [];
  const note = () => {
    const p = r.api.phase(),
      last = runs.at(-1);
    if (last?.[0] === p) last[1]++;
    else runs.push([p, 1]);
  };
  for (let t = 0; t < 5; t++) r.sync.stepWorld(100);
  note();
  const tk = r.sync.world.tick;
  assert.equal(r.api.act('a', { op: 'rail.wake', epoch: e, request: 1, tk } as never, anywhere).status, 'accepted');
  for (let t = 0; t < 40; t++) {
    note();
    r.sync.stepWorld(100);
  }
  // Fund T1 by hand (chop, deposit), then every tick of its schedule, with a save and restore and an away credit.
  const w = r.api.world();
  let request = 1;
  for (let k = 0, src = 0; k < 400 && rows.job(w, 0).start < 0; k++) {
    const a = rows.account(w, 'a')!;
    const act = (f: object) => r.api.act('a', { ...f, epoch: e, request: ++request } as never, anywhere);
    if (a.carry >= 4 || (a.carry > 0 && rows.trees(w).every((t) => t.left === 0)))
      act({ op: 'rail.deposit', station: 'T1', n: a.carry, kind: 0 });
    else if (act({ op: 'rail.chop', id: RAILWAY_SOURCES[src]![0], yaw: 0, collapsed: true }).accepted === 0)
      src = (src + 1) % RAILWAY_SOURCES.length;
    note();
  }
  assert.ok(rows.job(w, 0).start >= 0, 'T1 funded');
  const whole = q1.railMaxDuration(w);
  for (let t = 0; t < whole + 3; t++) {
    note();
    if (t === Math.floor(whole / 3)) {
      r.api.world().load(JSON.parse(JSON.stringify(r.api.world().snapshot())), railwayCheck);
      r.api.touchAll();
      note();
    }
    if (t === Math.floor((2 * whole) / 3)) {
      r.api.resume(5, r.api.resumeMarker() + 1, 0);
      note();
    }
    r.sync.stepWorld(100);
  }
  assert.deepEqual(runs, PHASE_RUNS);
});
