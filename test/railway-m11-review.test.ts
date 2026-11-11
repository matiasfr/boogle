// Review of M11 (branch ecs/m11-server-reads-world): the host's reads and the tools' reads moved off the `Railway` read
// model onto rows and queries on the world. Each test compares what the new code reads with what the read model said,
// value for value (as test/railway-m10d-review.test.ts), at the points the M11 proof does not reach: a client's mirror
// while a late join's chunks are still arriving (dev/peer-test/ws-page.ts's probes), a row held across a rule (the
// comment on dev/loop/run.ts's `Game.w`), and the away credit's cap exactly at the active job's schedule and a tick
// either side, on every stage and mid-job.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import { createSync } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway, type Actor } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { railwayModelAt, railwayOf } from './helpers/railway-model.ts';
import * as old from '../src/sim/railway.ts';
import * as q1 from '../src/sim/railway-queries-line1.ts';
import * as rows from '../src/sim/railway-rows.ts';
import { buildSeedWorld, type SeedStage } from '../src/sim/railway-seeds.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { railResume } from '../src/sim/railway-sys-away.ts';
import { Job, createRailwayWorld } from '../src/sim/railway-components.ts';
import { LINE1_STATIONS } from '../src/sim/railway-line-layout.ts';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import type { ServerPacket } from '../src/world/replicate.ts';
import { homeLand } from './helpers/land.ts';
import { probe, probeWas } from './helpers/railway-m11.ts';

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
  sync.setSelfId('server');
  const replication = createReplicator();
  const api = installRailway(sync, installRules(sync, homeLand()), replication);
  api.touchAll();
  if (stage) {
    const seed = seedOf(stage);
    while (sync.world.tick <= seed.t) sync.stepWorld(100);
    api.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())), railwayCheck);
    api.touchAll();
  }
  return { sync, api, replication };
}

// ---------------------------------------------------------------- ws-page.ts's probes during a late join
// As ws-page.ts reads now (fixed after this review): the world the mirror's read model is linked to, which is linked
// only once the state is whole, a fresh railway before that. The review's first copy gated on `count(Rail) === 1`,
// which a late join's first chunk already meets.
// Since M12: the mirror's confirmed world, published only once whole (a fresh railway before that).
const mirrored = (m: ReturnType<typeof createRailwayMirror>): World => m.confirmed();
/** T.railLoad's reads (ws-page.ts, the no-adapter load cycle): the account and the first standing tree from `first`. */
function loadReads(mw: World, first: number) {
  let source = first;
  for (let n = 0; n < RAILWAY_SOURCES.length && rows.tree(mw, source).left === 0; n++)
    source = (source + 1) % RAILWAY_SOURCES.length;
  return { me: rows.account(mw, 'a') ? { ...rows.account(mw, 'a')! } : undefined, source };
}
function loadReadsWas(s: old.Railway, first: number) {
  let source = first;
  for (let n = 0; n < RAILWAY_SOURCES.length && s.sources[source] === 0; n++)
    source = (source + 1) % RAILWAY_SOURCES.length;
  const me = s.accounts.find((a) => a.pid === 'a');
  return { me: me ? { ...me } : undefined, source };
}

for (const stage of ['fresh', 'q6-done', 'ring-joined'] as const)
  test(`M11 review at ${stage}: ws-page's probes between a late join's chunks read what the read model did`, () => {
    const r = host(stage === 'fresh' ? undefined : stage);
    const step = r.sync.roomStep();
    r.replication.commit(step);
    r.replication.addClient('c');
    const packets: ServerPacket[] = [];
    r.replication.flush(step, (_cid, _p, json) => packets.push(JSON.parse(json)));
    assert.ok(packets.length > 1, `${stage}: the whole state goes in ${packets.length} chunks (more than one)`);
    const m = createRailwayMirror();
    const tick = r.sync.world.tick;
    for (const [k, p] of packets.entries()) {
      assert.ok(m.mirror.apply(p, 0), `chunk ${k} applies`);
      const was = probeWas(railwayModelAt(m.confirmed(), tick), tick);
      let now: unknown;
      try {
        now = probe(mirrored(m), tick);
      } catch (e) {
        assert.fail(`${stage}: chunk ${k} of ${packets.length} (synced ${m.synced()}): T.rail throws: ${String(e)}`);
      }
      assert.deepEqual(now, was, `${stage}: T.rail after chunk ${k} of ${packets.length} (synced ${m.synced()})`);
      let reads: unknown;
      try {
        reads = loadReads(mirrored(m), 0);
      } catch (e) {
        assert.fail(`${stage}: chunk ${k} of ${packets.length}: T.railLoad's reads throw: ${String(e)}`);
      }
      assert.deepEqual(reads, loadReadsWas(railwayOf(m.confirmed()), 0), `${stage}: T.railLoad after chunk ${k}`);
    }
  });

test('M11 review: after a refill swaps in, and during it, the probes read the read model', () => {
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
  for (const [k, p] of packets.entries()) {
    assert.ok(m.mirror.apply(p, 0), `refill chunk ${k}`);
    assert.deepEqual(
      probe(mirrored(m), tick),
      probeWas(railwayModelAt(m.confirmed(), tick), tick),
      `refill chunk ${k} of ${packets.length}`,
    );
  }
});

// ---------------------------------------------------------------- dev/loop/run.ts: a row held across a rule
// `Game.w`'s first comment said a held row keeps its value from before a press, as the read model's copy did. It does
// not: `world.mut` writes the row in place (src/ecs/world.ts, `write`: only a row a cloned world still shares is
// copied), so a row held across a rule is live and shows the write; only the read model's copy keeps the old value.
// The comments now say so (dev/loop/run.ts, src/sim/railway-rows.ts); the loop's hash shows no policy relied on it.
// Held here: the account row and the read model's account, across one accepted chop.
test('M11 review: a row held across an accepted action is live; the read model copy kept its value from before', () => {
  const r = host('awake');
  const e = open(r, 'a');
  const held = rows.account(r.api.world(), 'a')!;
  const heldWas = old.railAccount(railwayOf(r.api.world()), 'a')!;
  const before = { ...held };
  const res = r.api.act(
    'a',
    { op: 'rail.chop', id: RAILWAY_SOURCES[0]![0], yaw: 0, collapsed: true, epoch: e, request: 1 } as never,
    anywhere,
  );
  assert.equal(res.status, 'accepted');
  assert.notDeepEqual({ ...rows.account(r.api.world(), 'a')! }, before, 'the chop changed the account');
  assert.deepEqual({ ...heldWas }, before, 'the read model copy kept its value');
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
/** The host's resume against railResume capped by the read model's railMaxDuration, on a copy of the same world. */
function resumeAgrees(r: ReturnType<typeof host>, ticks: number, yard: number, where: string) {
  const marker = r.api.resumeMarker() + 1;
  const copy = createRailwayWorld();
  copy.load(JSON.parse(JSON.stringify(r.api.world().snapshot())));
  const cap = old.railMaxDuration(railwayOf(copy));
  assert.equal(q1.railMaxDuration(r.api.world()), cap, `${where}: the cap`);
  const want = railResume(copy, Math.min(ticks, cap), marker, r.sync.world.tick, yard);
  assert.equal(r.api.resume(ticks, marker, yard), want, `${where}: job ticks credited`);
  assert.equal(r.api.world().hash(), copy.hash(), `${where}: the same world`);
}
for (const stage of STAGES)
  test(`M11 review at ${stage}: the away credit at the cap, a tick under and a tick over`, () => {
    const probeCap = host(stage);
    const cap = q1.railMaxDuration(probeCap.api.world());
    for (const ticks of [cap - 1, cap, cap + 1, Number.MAX_SAFE_INTEGER])
      for (const yard of [0, 600]) resumeAgrees(host(stage), Math.max(1, ticks), yard, `${stage} ${ticks}/${yard}`);
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
// The host passes sync.world.tick; the read model's railPhase took the same tick. Every tick across the wake's edge, a
// funded T1's deposit, feed and lay edges, a save and restore, and an away credit: the host's phase() against the read
// model of the same world at the same tick (the M11 proof steps several ticks at a time and can step over an edge).
function phaseAgrees(r: ReturnType<typeof host>, where: string) {
  const tick = r.sync.world.tick;
  assert.equal(r.api.phase(), old.railPhase(railwayOf(r.api.world()), tick), `${where} tick ${tick}`);
}
test('M11 review: phase() every tick across the wake, a funded job, a restore and an away credit', () => {
  const r = host();
  const e = open(r, 'a');
  for (let t = 0; t < 5; t++) r.sync.stepWorld(100);
  phaseAgrees(r, 'asleep');
  const tk = r.sync.world.tick;
  assert.equal(r.api.act('a', { op: 'rail.wake', epoch: e, request: 1, tk } as never, anywhere).status, 'accepted');
  const phases = new Set<string>();
  for (let t = 0; t < 40; t++) {
    phaseAgrees(r, 'waking');
    phases.add(r.api.phase());
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
    phaseAgrees(r, `funding ${k}`);
  }
  assert.ok(rows.job(w, 0).start >= 0, 'T1 funded');
  const whole = q1.railMaxDuration(w);
  for (let t = 0; t < whole + 3; t++) {
    phaseAgrees(r, `T1 ${t}`);
    phases.add(r.api.phase());
    if (t === Math.floor(whole / 3)) {
      r.api.world().load(JSON.parse(JSON.stringify(r.api.world().snapshot())), railwayCheck);
      r.api.touchAll();
      phaseAgrees(r, `restored at ${t}`);
    }
    if (t === Math.floor((2 * whole) / 3)) {
      r.api.resume(5, r.api.resumeMarker() + 1, 0);
      phaseAgrees(r, `credited at ${t}`);
    }
    r.sync.stepWorld(100);
  }
  for (const p of ['waking', 'idle', 'deposit', 'feeding', 'laying'])
    assert.ok(phases.has(p), `the walk passed ${p} (${[...phases].join(', ')})`);
});
