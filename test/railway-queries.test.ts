// M8's differential test (docs/plans/ecs-migration-railway.md, M8): every derived fact the `Railway` read model has
// (the 33 of section 2's table, and railTrainsOf) equals its world twin in src/sim/railway-queries*.ts, on the server's
// world, on a client's confirmed mirror and on a predicted clone, along a seeded action stream with rule ticks; and on
// random rows for the facts a short stream never reaches. jobProgress equals the mirror's job clock (`at(tick)`) for
// every job. The read facade (`adapter.read`) is the world behind what the views see, always whole. Temporary: M12b
// deletes it with the read model.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import { createSync } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway, type Actor } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { railPredict } from '../src/world/railway-predict.ts';
import { railwayModelAt, railwayOf } from './helpers/railway-model.ts';
import { createRailwayAdapter, railMovement } from '../src/adapters/railway-session.ts';
import { specOf } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.ts';
import * as old from '../src/sim/railway.ts';
import * as oldLine2 from '../src/sim/railway-line2.ts';
import * as oldWorks from '../src/sim/railway-works.ts';
import * as oldTrains from '../src/sim/railway-trains.ts';
import * as q from '../src/sim/railway-queries.ts';
import * as q1 from '../src/sim/railway-queries-line1.ts';
import * as q2 from '../src/sim/railway-queries-line2.ts';
import * as qt from '../src/sim/railway-queries-trains.ts';
import * as qw from '../src/sim/railway-queries-works.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { LINE1_STATIONS } from '../src/sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { RAIL_LINES, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { WORKS } from '../src/sim/railway-works-layout.ts';
import {
  Account,
  Boiler,
  Cart,
  Forge,
  Job,
  JobRun,
  Pile,
  QJob,
  Rail,
  Shed,
  Train,
  Tree,
  Works,
  createRailwayWorld,
} from '../src/sim/railway-components.ts';
import type { RailAction, Railway } from '../src/sim/railway.ts';

type Fact = {
  /** The argument lists to try (after the world or railway). */
  args: readonly (readonly unknown[])[];
  old: (s: Railway, args: readonly unknown[]) => unknown;
  /** `at`: the job clock's tick, or undefined for the run rows. */
  now: (w: World, args: readonly unknown[], at: number | undefined) => unknown;
};
const pick = (row: object | undefined, names: readonly string[]) =>
  row && Object.fromEntries(names.map((n) => [n, (row as Record<string, unknown>)[n] ?? 0]));
const JOB = [
  'stock',
  'allocation',
  'used',
  'delivered',
  'start',
  'elapsed',
  'lastTick',
  'completion',
  'stoneStock',
  'stoneAllocation',
  'stoneUsed',
  'stoneDelivered',
];
const merged = (r: q.JobRead) => pick({ ...r.job, ...r.run }, JOB);
const none = [[]] as const;
const pids = ['alice', 'bob', 'cleo', 'nobody'];
const stations = LINE2_STATIONS.map((_s, k) => [k] as const);
const lines = RAIL_LINES.map((_l, k) => [k] as const);
/** Every fact on the read model and its world twin. A fact on the old side without an entry here fails the test. */
const FACTS: Record<string, Fact> = {
  railAccount: {
    args: pids.map((p) => [p]),
    old: (s, [p]) => pick(old.railAccount(s, p as string), Account.names),
    now: (w, [p]) => pick(q.railAccount(w, p as string), Account.names),
  },
  railCounts: { args: none, old: (s) => old.railCounts(s), now: (w, _a, at) => q2.railCounts(w, at) },
  railPhase: {
    args: [[undefined], [0], [T1.wakeTicks], [1e6]],
    old: (s, [t]) => old.railPhase(s, t as number | undefined),
    now: (w, [t], at) => q1.railPhase(w, t as number | undefined, at),
  },
  railCarryMax: { args: none, old: (s) => oldLine2.railCarryMax(s), now: (w) => q.railCarryMax(w) },
  railJobs: {
    args: none,
    old: (s) => old.railJobs(s).map((j) => pick(j, JOB)),
    now: (w, _a, at) => q.railJobs(w, at).map(merged),
  },
  railActiveStation: { args: none, old: (s) => old.railActiveStation(s), now: (w) => q.railActiveStation(w) },
  railCurrentJob: {
    args: none,
    old: (s) => pick(old.railCurrentJob(s), JOB),
    now: (w, _a, at) => merged(q.railCurrentJob(w, at)),
  },
  railMaxDuration: { args: none, old: (s) => old.railMaxDuration(s), now: (w) => q1.railMaxDuration(w) },
  railLineOpen: { args: none, old: (s) => old.railLineOpen(s), now: (w) => q1.railLineOpen(w) },
  railPanelCount: { args: none, old: (s) => old.railPanelCount(s), now: (w, _a, at) => q1.railPanelCount(w, at) },
  railPanelStock: { args: none, old: (s) => old.railPanelStock(s), now: (w, _a, at) => q1.railPanelStock(w, at) },
  railBeamChoppable: { args: none, old: (s) => old.railBeamChoppable(s), now: (w) => q1.railBeamChoppable(w) },
  railAxeAvailable: { args: none, old: (s) => old.railAxeAvailable(s), now: (w) => q1.railAxeAvailable(w) },
  railTrainsOf: {
    args: lines,
    old: (s, [k]) => oldTrains.railTrainsOf(s, k as number).map((r) => pick(r, Train.names)),
    now: (w, [k]) => qt.railTrainsOf(w, k as number).map((r) => pick(r, Train.names)),
  },
  line2Open: { args: none, old: (s) => oldLine2.line2Open(s), now: (w) => q2.line2Open(w) },
  line2Lit: { args: none, old: (s) => oldLine2.line2Lit(s), now: (w) => q2.line2Lit(w) },
  line2PackReady: { args: none, old: (s) => oldLine2.line2PackReady(s), now: (w) => q2.line2PackReady(w) },
  line2Completed: { args: none, old: (s) => oldLine2.line2Completed(s), now: (w) => q2.line2Completed(w) },
  line2Active: { args: none, old: (s) => oldLine2.line2Active(s), now: (w) => q2.line2Active(w) },
  line2GateOpen: { args: none, old: (s) => oldLine2.line2GateOpen(s), now: (w) => q2.line2GateOpen(w) },
  line2SeaOpen: { args: none, old: (s) => oldLine2.line2SeaOpen(s), now: (w) => q2.line2SeaOpen(w) },
  line2GateDown: {
    args: stations,
    old: (s, [k]) => oldLine2.line2GateDown(s, k as number),
    now: (w, [k]) => q2.line2GateDown(w, k as number),
  },
  line2Served: { args: none, old: (s) => oldLine2.line2Served(s), now: (w) => q2.line2Served(w) },
  line2CartWants: {
    args: stations,
    old: (s, [k]) => oldLine2.line2CartWants(s, k as number),
    now: (w, [k]) => q2.line2CartWants(w, k as number),
  },
  line2CartStatus: { args: none, old: (s) => oldLine2.line2CartStatus(s), now: (w) => q2.line2CartStatus(w) },
  line2Aboard: {
    args: [['logs'], ['rails'], ['foot']],
    old: (s, [k]) => oldLine2.line2Aboard(s, k as 'logs'),
    now: (w, [k]) => q2.line2Aboard(w, k as 'logs'),
  },
  line2Logs: { args: none, old: (s) => oldLine2.line2Logs(s), now: (w, _a, at) => q2.line2Logs(w, at) },
  line2Rails: { args: none, old: (s) => oldLine2.line2Rails(s), now: (w, _a, at) => q2.line2Rails(w, at) },
  line2Trains: { args: none, old: (s) => oldLine2.line2Trains(s), now: (w) => q2.line2Trains(w) },
  line2KitOwed: { args: none, old: (s) => oldLine2.line2KitOwed(s), now: (w) => q2.line2KitOwed(w) },
  trainStops: {
    args: lines,
    old: (s, [k]) => oldLine2.trainStops(s, k as number),
    now: (w, [k]) => qt.trainStops(w, k as number),
  },
  footingTotal: { args: none, old: (s) => oldWorks.footingTotal(s), now: (w) => qw.footingTotal(w) },
  pierNeed: { args: none, old: (s) => oldWorks.pierNeed(s), now: (w) => qw.pierNeed(w) },
  worksStage: { args: none, old: (s) => oldWorks.worksStage(s), now: (w) => qw.worksStage(w) },
  // M10's two: no read-model function, so the old side is the adapter's arithmetic in buildState and inspection().
  treeGrowth: {
    args: RAILWAY_SOURCES.map((_s, k) => [k] as const),
    old: (s, [k]) => Math.max(0, (s.supply!.ages[k as number] ?? 0) - 31),
    now: (w, [k]) => q1.treeGrowth(w, k as number),
  },
  freeCarryIgnoringBig: {
    args: pids.map((p) => [p]),
    old: (s, [p]) => {
      const a = old.railAccount(s, p as string);
      return Math.max(0, oldLine2.railCarryMax(s) - (a?.carry ?? 0) - (a?.stone ?? 0) - (a?.rails ?? 0));
    },
    now: (w, [p]) => q1.freeCarryIgnoringBig(w, p as string),
  },
};
// Section 2's table: 16 line2…, 13 rail…, footingTotal, pierNeed, trainStops, worksStage; plus railTrainsOf.
const LISTED = [
  ...['Open', 'Lit', 'PackReady', 'Completed', 'Active', 'GateOpen', 'SeaOpen', 'GateDown', 'Served'].map(
    (n) => `line2${n}`,
  ),
  ...['CartWants', 'CartStatus', 'Aboard', 'Logs', 'Rails', 'Trains', 'KitOwed'].map((n) => `line2${n}`),
  ...['Account', 'Counts', 'Phase', 'CarryMax', 'Jobs', 'ActiveStation', 'CurrentJob', 'MaxDuration', 'LineOpen'].map(
    (n) => `rail${n}`,
  ),
  ...['PanelCount', 'PanelStock', 'BeamChoppable', 'AxeAvailable'].map((n) => `rail${n}`),
  'footingTotal',
  'pierNeed',
  'trainStops',
  'worksStage',
];
/** Queries M10's view groups asked for, whose old side is an inspect() field rather than a read-model function. */
const INSPECTED = ['treeGrowth', 'freeCarryIgnoringBig'];
let checked = 0;
/** A fact's value, or the error it throws: a twin throws where the read model's did (line2CartStatus with cargo aboard,
 * no stretch served and the cart at or bound for home reads stretch -1; kept as it is, noted for the owner). */
const outcome = (f: () => unknown) => {
  try {
    return { value: f() };
  } catch (e) {
    return { throws: e instanceof TypeError ? 'TypeError' : String(e) };
  }
};
/** Every fact: the read model `s` against the world `w` read at `at`. */
function same(s: Railway, w: World, at: number | undefined, where: string) {
  for (const [name, f] of Object.entries(FACTS))
    for (const args of f.args) {
      assert.deepEqual(
        outcome(() => f.now(w, args, at)),
        outcome(() => f.old(s, args)),
        `${name}(${args.join(', ')}) ${where}`,
      );
      checked++;
    }
}

test('the list holds the 33 facts, railTrainsOf and the two M10 asked for, each exported on both sides under its name', () => {
  assert.equal(LISTED.length, 33);
  assert.deepEqual(Object.keys(FACTS).sort(), [...LISTED, 'railTrainsOf', ...INSPECTED].sort());
  const now: Record<string, unknown> = { ...q, ...q1, ...q2, ...qt, ...qw };
  const was: Record<string, unknown> = { ...old, ...oldLine2, ...oldWorks, ...oldTrains };
  for (const name of Object.keys(FACTS)) {
    assert.equal(typeof now[name], 'function', `${name} on the world`);
    if (!INSPECTED.includes(name)) assert.equal(typeof was[name], 'function', `${name} on the read model`);
  }
});

const anywhere: Actor = { reach: () => true, height: () => true, cadence: () => true };
function room() {
  const sync = createSync();
  sync.setSelfId('server');
  const replication = createReplicator();
  const api = installRailway(sync, installRules(sync, homeLand()), replication);
  api.touchAll();
  const mirror = createRailwayMirror();
  replication.addClient('a');
  let flushed = -1;
  const pump = () => {
    if (sync.roomStep() === flushed) sync.stepWorld(1000 / 60 + 1);
    const step = (flushed = sync.roomStep());
    replication.commit(step);
    replication.flush(step, (_cid, _p, json) => assert.ok(mirror.mirror.apply(JSON.parse(json), 0)));
  };
  return { sync, api, replication, mirror, pump };
}
type Room = ReturnType<typeof room>;
const PLAYERS = ['alice', 'bob', 'cleo'];
function randomAction(r: Room, rng: () => number): Omit<RailAction, 'epoch' | 'request'> {
  const int = (n: number) => Math.floor(rng() * n);
  const s = r.api.railway;
  const roll = rng();
  const active = LINE1_STATIONS[old.railActiveStation(s)]!.id;
  const qid = LINE2_STATIONS.find((_x, i) => !s.line2!.jobs[i]!.completion)?.id ?? 'Q1';
  if (roll < 0.03) return { op: 'rail.wake' };
  if (roll < 0.4)
    return { op: 'rail.chop', id: RAILWAY_SOURCES[int(RAILWAY_SOURCES.length)]![0], yaw: 0, collapsed: rng() < 0.5 };
  if (roll < 0.5) return { op: 'rail.mine', id: int(3) };
  if (roll < 0.68) return { op: 'rail.deposit', station: active, n: 1 + int(8), kind: int(2) };
  if (roll < 0.74)
    return { op: 'rail.deposit', station: rng() < 0.5 ? 'F' : qid, n: 1 + int(8), kind: rng() < 0.5 ? 0 : 2 };
  if (roll < 0.82) return { op: 'rail.drop', x: T1.x + int(3) * 100, y: 3000, z: T1.z, n: 1 + int(8), kind: int(3) };
  if (roll < 0.9) return { op: 'rail.take', id: s.piles[int(s.piles.length + 1)]?.id ?? 1, kind: int(3) };
  if (roll < 0.94) return { op: 'rail.forgeTake' };
  if (roll < 0.97) return { op: 'rail.rackTake', kind: int(2) };
  return { op: ['rail.axe', 'rail.beamChop', 'rail.lever', 'rail.pack', 'rail.jump'][int(5)]! };
}

test('on a seeded stream every fact equals its twin: the server, the confirmed mirror and predicted clones', () => {
  const r = room();
  const rng = mulberry32(808);
  const request = new Map(PLAYERS.map((p) => [p, 0]));
  for (const pid of PLAYERS) assert.ok(r.api.session(pid, 1));
  const act = (pid: string, e: Omit<RailAction, 'epoch' | 'request'>) => {
    request.set(pid, request.get(pid)! + 1);
    return r.api.act(pid, { ...e, epoch: 1, request: request.get(pid)! } as RailAction, anywhere);
  };
  let held = 0,
    heldQ = 0,
    funded = 0,
    clones = 0;
  const check = (where: string) => {
    r.pump();
    const tick = r.sync.world.tick;
    const server = r.api.world();
    // The server: run rows, and the job clock at its own tick (the clock follows from what the tick advanced).
    same(r.api.railway, server, undefined, `server ${where}`);
    same(r.api.railway, server, tick, `server clock ${where}`);
    // The confirmed mirror at the tick: its run rows never move, the clock is what the views see. Since M12 the old
    // side's clocks are jobProgress too (railwayModelAt; the mirror's advance() is gone), so the clock lines below hold the
    // ingest world equal to the published one; the clock's own arithmetic is held to the rule tick by the server
    // comparison above.
    const m = r.mirror;
    const shown = railwayModelAt(m.confirmed(), tick);
    same(shown, m.world(), tick, `mirror ${where}`);
    const jobs = old.railJobs(shown);
    for (let k = 0; k < jobs.length; k++)
      assert.deepEqual(
        pick(q.jobProgress(m.world(), Job, q.jobId(m.world(), k), tick), ['elapsed', 'lastTick', 'used', 'allocation']),
        pick(jobs[k]!, ['elapsed', 'lastTick', 'used', 'allocation']),
        `T${k + 1} clock ${where}`,
      );
    for (let k = 0; k < LINE2_STATIONS.length; k++) {
      const j = shown.line2!.jobs[k]!;
      const p = q.jobProgress(m.world(), QJob, q.qjobId(m.world(), k), tick);
      assert.deepEqual(
        [p.elapsed, p.lastTick, p.used, p.allocation, p.railUsed, p.railAllocation],
        [j.elapsed, j.lastTick, j.used, j.allocation, j.railUsed, j.railAllocation],
      );
    }
    // A predicted clone: every player's deposit at the active stations, thresholds held back for the server.
    for (const pid of PLAYERS) {
      const a = q.railAccount(m.world(), pid);
      if (!a) continue;
      const cw = q.cloneWorld(m.confirmed());
      assert.notEqual(cw, m.confirmed());
      const before = q.railJobs(cw).map((j) => j.job.stock);
      const station = LINE1_STATIONS[q.railActiveStation(cw)]!;
      railPredict(
        cw,
        pid,
        {
          op: 'rail.deposit',
          station: station.id,
          n: Math.max(1, a.carry),
          kind: 0,
          epoch: a.epoch,
          request: a.request + 1,
        },
        tick,
      );
      const qk = q.qActive(cw);
      if (qk >= 0)
        railPredict(
          cw,
          pid,
          {
            op: 'rail.deposit',
            station: LINE2_STATIONS[qk]!.id,
            n: Math.max(1, a.carry),
            kind: 0,
            epoch: a.epoch,
            request: a.request + 2,
          },
          tick,
        );
      const after = q.railJobs(cw);
      if (
        after.some((j, k) => j.job.start < 0 && j.job.stock === LINE1_STATIONS[k]!.bill[0] && before[k] !== j.job.stock)
      )
        held++;
      const qj = qk >= 0 ? cw.get(QJob, q.qjobId(cw, qk))! : null;
      if (
        qj &&
        qj.start < 0 &&
        qj.stock === LINE2_STATIONS[qk]!.bill[0] &&
        qj.railStock === LINE2_STATIONS[qk]!.bill[1]
      )
        heldQ++;
      same(railwayModelAt(cw, tick), cw, tick, `clone ${pid} ${where}`);
      clones++;
    }
    funded = q.railJobs(server).filter((j) => j.job.start >= 0).length;
  };
  check('at the start');
  for (let k = 0; k < 2400; k++) {
    act(PLAYERS[Math.floor(rng() * PLAYERS.length)]!, randomAction(r, rng));
    if (rng() < 0.3) r.sync.stepWorld(Math.floor(rng() * 4) * 50 + 17);
    if (rng() < 0.5) r.pump();
    if (k % 60 === 59) check(`after ${k + 1} actions`);
  }
  // Let every funded job lay out on its schedule, checked as it runs.
  for (let k = 0; k < 1600; k++) {
    r.sync.stepWorld(100);
    if (k % 40 === 0) check(`laying ${k}`);
  }
  check('line one laid');
  // Line two, set up on the server's world (marked, so it replicates): line one laid, the forge lit and Q1 one log
  // short, so a predicted deposit fills it (held back), then the server funds it and it lays out, checked as it runs.
  const w = r.api.world();
  LINE1_STATIONS.forEach((spec, k) => {
    const id = q.jobId(w, k);
    const done = q.scheduleOf(spec, w.get(Job, id)!).totalTicks;
    Object.assign(w.mut(Job, id)!, { start: 0, completion: 1, stock: 0, delivered: spec.bill[0] });
    Object.assign(w.mut(JobRun, id)!, { elapsed: done, used: spec.bill[0], allocation: 0, lastTick: 0 });
    Object.assign(w.mut(JobRun, id)!, { stoneUsed: spec.bill[1], stoneAllocation: 0 });
  });
  w.mut(Forge, q.forgeId(w))!.lit = 0; // lit long ago: past its turn
  const q1 = LINE2_STATIONS[0]!;
  Object.assign(w.mut(QJob, q.qjobId(w, 0))!, { stock: q1.bill[0] - 1, railStock: q1.bill[1] });
  Object.assign(w.mut(Account, w.lookup(Account, 'alice')!)!, { carry: 1, stone: 0, rails: 0 });
  r.api.touchAll();
  r.sync.stepWorld(100);
  check('Q1 one log short');
  assert.ok(heldQ >= 1, 'a predicted deposit filled Q1 and its funding was held back');
  assert.equal(act('alice', { op: 'rail.deposit', station: 'Q1', n: 1, kind: 0 }).status, 'accepted');
  assert.ok(w.get(QJob, q.qjobId(w, 0))!.start >= 0, 'Q1 funded');
  const q1Ticks = q.scheduleOf(q1, w.get(QJob, q.qjobId(w, 0))!).totalTicks;
  for (let k = 0; k * 10 <= q1Ticks + 40; k++) {
    for (let i = 0; i < 10; i++) r.sync.stepWorld(100);
    check(`Q1 laying ${k}`);
  }
  assert.ok(w.get(QJob, q.qjobId(w, 0))!.completion, 'Q1 laid');
  check('at the end');
  console.log(
    `[railway-queries] ${checked} fact checks, ${clones} clones, ${held}+${heldQ} held-back bills, ${funded} funded`,
  );
  assert.ok(funded >= 1, 'the stream funded a job');
  assert.ok(held >= 1, `a prediction completed a bill and held its funding back (${held})`);
  assert.ok(clones > 50, `${clones} clones`);
});

test('on random rows every fact equals its twin (the stretches, the cart, the trains, the Works)', () => {
  const rng = mulberry32(2611);
  const int = (n: number) => Math.floor(rng() * n);
  const coin = () => rng() < 0.5;
  for (let round = 0; round < 300; round++) {
    const w = createRailwayWorld();
    const set = <C extends Parameters<World['mut']>[0]>(c: C, id: number, f: object) => Object.assign(w.mut(c, id)!, f);
    set(Rail, q.railId(w), {
      awake: int(3) - 1,
      axe: coin(),
      lever: coin(),
      sea: coin(),
      pack: coin(),
      trains: int(3) - 1,
      depot: int(30),
      depotRails: int(30),
      shelfOut: int(40),
      out0: int(30),
      out5: int(40),
      rack: int(10),
      produced: int(50),
      depotProduced: int(50),
      stoneRack: int(10),
      stoneProduced: int(20),
    });
    set(Forge, q.forgeId(w), { used: int(60), lit: int(3) - 1, rack: int(12), poured: int(80) });
    set(Cart, q.cartId(w), { phase: int(8), logs: int(12), rails: int(12) });
    set(Boiler, q.boilerId(w), { state: ['none', 'standing', 'held', 'fitted'][int(4)]! });
    set(Works, q.worksId(w), {
      breaker: int(3),
      seams: int(4),
      logs: int(10),
      stone: int(10),
      lit: int(3) - 1,
      rack: int(6),
      pierRack: int(6),
      pierSet: int(WORKS.pier + 1),
      crossing: int(3) - 1,
    });
    set(Shed, q.shedId(w), { stall: int(WORKS.stall + 1), cradle: int(3), cradleRails: int(9), fitted: int(3) - 1 });
    RAIL_TRAINS.forEach((_t, slot) =>
      set(Train, q.trainId(w, slot), { logs: int(9), rails: int(9), foot: int(3), wagon: rng() < 0.2 }),
    );
    // Stretches done in order up to a random one; the next stocked, maybe funded.
    const done1 = int(4),
      done2 = int(7);
    LINE1_STATIONS.forEach((spec, k) =>
      set(Job, q.jobId(w, k), {
        completion: k < done1 ? 1 : 0,
        start: k < done1 || (k === done1 && coin()) ? int(500) : -1,
        stock: int(spec.bill[0] + 1),
        delivered: int(spec.bill[0] + 1),
        stoneStock: int(spec.bill[1] + 1),
      }),
    );
    LINE2_STATIONS.forEach((spec, k) =>
      set(QJob, q.qjobId(w, k), {
        completion: k < done2 ? 1 : 0,
        start: k < done2 || (k === done2 && coin()) ? int(500) : -1,
        stock: int(spec.bill[0] + 1),
        railStock: int(spec.bill[1] + 1),
        delivered: int(spec.bill[0] + 1),
        railDelivered: int(spec.bill[1] + 1),
      }),
    );
    for (const pid of pids.slice(0, int(4)))
      w.spawn([Account, { pid, carry: int(8), stone: int(4), rails: int(4), foot: int(2), epoch: 1 }]);
    for (let k = int(5); k > 0; k--) w.spawn([Pile, { x: int(1000), z: int(1000), n: 1 + int(8), kind: int(4) }]);
    // Drawn last, so the rows above are what they were before M10 added these: felled trees at every age, a big load.
    RAILWAY_SOURCES.forEach((_s, slot) =>
      set(Tree, w.lookup(Tree, slot)!, { left: coin() ? 0 : int(9), age: int(40) }),
    );
    if (coin()) set(Boiler, q.boilerId(w), { state: 'held', holder: pids[int(4)]! });
    same(railwayOf(w), w, undefined, `round ${round}`);
  }
});

test('read.world() is the world behind what the views see: whole before a packet, the clone while pending, kept in a refill', () => {
  const r = room();
  r.api.session('a', 1);
  const mirror = r.mirror;
  const adapter = createRailwayAdapter({
    mirror,
    movement: () => railMovement({ get: (k) => specOf(k)!.def }),
    pid: 'a',
    pose: () => ({ x: T1.x / 100, y: 30, z: T1.z / 100 }),
    now: () => 1000,
  });
  const read = adapter.read;
  assert.equal(read.pid, 'a');
  assert.equal(read.world().count(Rail), 1, 'whole before any packet (a fresh railway)');
  let hear: ((message: unknown, from: string) => void) | undefined;
  let connection: ((live: boolean) => void) | undefined;
  adapter.attach({
    selfId: 'a',
    send: () => {},
    onMessage: (fn) => {
      hear = fn;
      return () => {};
    },
    onConnection: (fn) => {
      connection = fn;
      return () => {};
    },
  });
  hear!({ t: 'r:session', to: 'a', epoch: 1, next: 1 }, SERVER_ID);
  r.pump();
  assert.equal(read.status(), 'ready');
  assert.equal(read.world(), mirror.confirmed(), 'nothing pending: the confirmed mirror');
  // A predicted wake: the views see the clone, and so does read.world().
  assert.equal(adapter.wake(), true);
  const clone = read.world();
  assert.notEqual(clone, mirror.confirmed());
  assert.equal(clone.count(Rail), 1);
  assert.equal(read.pending(), 1);
  const awake = (w: World) => w.get(Rail, q.railId(w))!.awake;
  assert.equal(awake(mirror.confirmed()), -1);
  assert.ok(awake(clone) >= 0);
  assert.equal(read.world(), clone, 'the same world on a second read in the frame');
  // A lost socket: the last shown state stays shown while the whole state comes again, and its world with it.
  connection!(false);
  assert.equal(read.world(), clone, 'kept through the refill');
  assert.equal(read.world().count(Rail), 1);
  adapter.dispose();
});
