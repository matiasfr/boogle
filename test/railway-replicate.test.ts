// Replication R1a: the railway is Server kind. A random action stream from several players, with rule ticks and supply
// pulses, runs on the server's rules; every client mirror (and a late joiner) rebuilt from the replication packets
// equals the server's state at the same tick, including the timed fields it derives instead of receiving.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../src/world/sync.ts';
import { installRailRules } from './helpers/rail-rules.ts';
import { install as installRailway, type Actor } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror, RAIL_SCHEMAS } from '../src/world/railway-replicate.ts';
import { Account, Job, Rail, Tree } from '../src/sim/railway-components.ts';
import { RULE_STEPS } from '../src/world/room-clock.ts';
import type { RailAction } from '../src/sim/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { LINE1_STATIONS, LINE1_INITIAL } from '../src/sim/railway-line-layout.ts';
import { LINE2_STATIONS, Q6 } from '../src/sim/railway-line2-layout.ts';
import { railPredict, RAIL_PREDICTED } from '../src/world/railway-predict.ts';
import type { World } from '../src/ecs/index.ts';
import {
  account,
  act as seedAct,
  buildSeedWorld,
  advance as seedAdvance,
  beam,
  boiler,
  carryMax,
  cart,
  check,
  cloneWorld,
  forge,
  job,
  line2Jobs,
  lines,
  pilesWithIds,
  logs as seedLogs,
  qjob,
  qjobRun,
  rail,
  rails as seedRails,
  railActiveStation,
  railJobs,
  railwayAtQ4,
  railwayAtQ5,
  railwayAtTrains,
  railwayAtWorks,
  rock,
  rocks,
  shed,
  steel,
  train,
  trains,
  trees,
  works,
} from './helpers/rail.ts';
import { STEEL } from '../src/sim/railway-ring-layout.ts';
import { WORKS } from '../src/sim/railway-works-layout.ts';
import { railPanelCount, railPhase } from '../src/sim/railway-queries-line1.ts';
import { line2SeaOpen, railCounts } from '../src/sim/railway-queries-line2.ts';
import { cartCycleTicks } from '../src/sim/railway-cart.ts';
import { RAILWAY_SUPPLY } from '../src/sim/railway-layout.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.ts';
import { createRailwayAdapter } from '../src/adapters/railway-session.ts';
import { railMovement } from '../src/adapters/railway-read.ts';
import type { RailwayAccepted, RailwayCorrection } from '../src/adapters/railway-effects.ts';
import { specOf } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';

const anywhere: Actor = { reach: () => true, height: () => true, cadence: () => true };

// A client predicts on a clone of its confirmed world (railPredict takes the world): a press shows in the rows of that
// clone, which a test reads with the row readers and queries after the prediction.
const shownOf = cloneWorld;

for (const k of [3, 4]) {
  test(`Q${k + 1} predicts a stocked gate pull without funding or returning cart/shelf rails early`, () => {
    const w = k === 3 ? railwayAtQ4() : railwayAtQ5('q4-done');
    const spec = LINE2_STATIONS[k]!;
    for (let t = 0; cart(w.w).rails === 0 && t < 3 * cartCycleTicks(k); t++) seedAdvance(w, 1);
    assert.ok(cart(w.w).rails > 0, 'rails aboard when the bill fills by hand');
    seedLogs(w, 'a', spec.id, spec.bill[0]);
    seedRails(w, 'b', spec.id, spec.bill[1]);
    const shown = shownOf(w.w);
    const before = structuredClone({ cart: cart(shown), rail: rail(shown), rack: forge(shown).rack });
    const a = account(w.w, 'a')!;
    const op = k === 3 ? 'rail.lever' : 'rail.seaSwitch';
    assert.equal(railPredict(shown, 'a', { op, epoch: a.epoch, request: a.request + 1 }, w.t).n, 1);
    const j = qjob(shown, k),
      run = qjobRun(shown, k);
    assert.equal(k === 3 ? rail(shown).lever : rail(shown).sea, true);
    assert.equal(j.start, -1, 'funding waits for confirmation');
    assert.equal(j.stock, spec.bill[0]);
    assert.equal(j.railStock, spec.bill[1]);
    assert.equal(run.allocation + run.railAllocation, 0);
    assert.deepEqual(cart(shown), before.cart);
    assert.equal(rail(shown).depotRails, before.rail.depotRails);
    assert.equal(rail(shown).shelfOut, before.rail.shelfOut);
    assert.equal(forge(shown).rack, before.rack);
    assert.equal(railCounts(shown).rails.total, railCounts(shown).rails.poured);
    assert.equal(seedAct(w, 'a', op), 1);
    assert.equal(qjob(w.w, k).start, w.t);
    assert.equal(cart(w.w).rails, 0, 'only the accepted pull returns surplus cargo');
  });
}

function room() {
  const sync = createSync();
  sync.setSelfId('server');
  const replication = createReplicator();
  const base = installRailRules(sync, homeLand(), replication);
  const api = installRailway(sync, base, replication);
  api.touchAll();
  const mirrors = new Map<string, ReturnType<typeof createRailwayMirror>>();
  let bytes = 0;
  const join = (cid: string) => {
    mirrors.set(cid, createRailwayMirror());
    replication.addClient(cid);
  };
  // One commit and flush per room step, as the hosted room does at the end of each step: a second flush within the
  // same step would already count as sent what the next commit stamps with that step.
  let flushed = -1;
  const pump = () => {
    if (sync.roomStep() === flushed) sync.stepWorld(1000 / 60 + 1);
    const step = (flushed = sync.roomStep());
    replication.commit(step);
    replication.flush(step, (cid, _p, json) => {
      bytes += json.length;
      assert.ok(mirrors.get(cid)!.mirror.apply(JSON.parse(json), 0), 'a well-formed packet');
    });
  };
  return { sync, api, replication, mirrors, join, pump, bytes: () => bytes };
}

// The mirror agrees with the server on every component and on every derived timed field at the server's tick.
function agree(r: ReturnType<typeof room>, cid: string) {
  const m = r.mirrors.get(cid)!;
  const tick = r.sync.world.tick;
  const w = r.api.world();
  const mirrored = m.confirmed();
  // Every replicated component of the server's world, row for row (accounts and piles included).
  for (const c of RAIL_SCHEMAS) {
    const ids = w.ids(c);
    assert.equal([...m.mirror.entries(c.kind)].length, ids.length, `${cid} ${c.kind} count`);
    for (const id of ids) {
      const row = w.get(c, id) as Record<string, unknown>;
      const fields = Object.fromEntries(c.names.map((f) => [f, row[f]]));
      assert.deepEqual(m.mirror.get(c.kind, id), fields, `${cid} ${c.kind} ${id}`);
      assert.deepEqual(m.world().get(c, id), row, `${cid} ${c.kind} ${id} in the mirror's world`);
      assert.deepEqual(m.confirmed().get(c, id), row, `${cid} ${c.kind} ${id} in the confirmed world`);
    }
  }
  // The facts derived from them agree at the server's tick.
  assert.deepEqual(railCounts(mirrored, tick), railCounts(w, tick), `${cid} counts`);
  assert.equal(railPhase(mirrored, tick, tick), railPhase(w, tick, tick), `${cid} phase`);
  assert.equal(railPanelCount(mirrored, tick), railPanelCount(w, tick), `${cid} panels`);
  assert.equal(railActiveStation(mirrored), railActiveStation(w));
  const timed = (x: World) =>
    [...railJobs(x, tick), ...line2Jobs(x, tick)].map((j) => [j.run.elapsed, j.run.used, j.run.allocation]);
  assert.deepEqual(timed(mirrored), timed(w), `${cid} timed job fields at tick ${tick}`);
}

test('a random multi-player action stream replicates exactly, live and to a late joiner', () => {
  const r = room();
  r.join('a');
  r.join('b');
  const rng = mulberry32(2026);
  const int = (n: number) => Math.floor(rng() * n);
  const players = ['alice', 'bob', 'cleo'];
  const request = new Map<string, number>();
  for (const pid of players) {
    assert.ok(r.api.session(pid, 1));
    request.set(pid, 0);
  }
  const act = (pid: string, fields: Omit<RailAction, 'epoch' | 'request'>) => {
    const n = request.get(pid)! + 1;
    request.set(pid, n);
    return r.api.act(pid, { ...fields, epoch: 1, request: n } as RailAction, anywhere);
  };
  r.pump();
  agree(r, 'a');
  let accepted = 0;
  const initial = LINE1_INITIAL[0];
  for (let k = 0; k < 6000; k++) {
    const pid = players[int(players.length)]!;
    const s = r.api.world();
    const roll = rng();
    const active = LINE1_STATIONS[railActiveStation(s)]!.id;
    const q = LINE2_STATIONS.find((_x, i) => !qjob(s, i).completion)?.id ?? 'Q1';
    const pileIds = pilesWithIds(s).map((p) => p.id);
    const fields: Omit<RailAction, 'epoch' | 'request'> =
      roll < 0.03
        ? { op: 'rail.wake' }
        : roll < 0.4
          ? {
              op: 'rail.chop',
              id: RAILWAY_SOURCES[int(RAILWAY_SOURCES.length)]![0],
              yaw: rng() * 6,
              collapsed: rng() < 0.5,
            }
          : roll < 0.5
            ? { op: 'rail.mine', id: int(3) }
            : roll < 0.66
              ? { op: 'rail.deposit', station: active, n: 1 + int(8), kind: int(2) }
              : roll < 0.72
                ? { op: 'rail.deposit', station: rng() < 0.5 ? 'F' : q, n: 1 + int(8), kind: rng() < 0.5 ? 0 : 2 }
                : roll < 0.8
                  ? { op: 'rail.drop', x: T1.x + int(3) * 100, y: 3000, z: T1.z, n: 1 + int(8), kind: int(3) }
                  : roll < 0.88
                    ? { op: 'rail.take', id: pileIds[int(pileIds.length + 1)] ?? 1, kind: int(3) }
                    : roll < 0.92
                      ? { op: 'rail.forgeTake' }
                      : roll < 0.95
                        ? { op: 'rail.depotTake' }
                        : roll < 0.97
                          ? { op: 'rail.rackTake', kind: int(2) }
                          : {
                              op: ['rail.axe', 'rail.beamChop', 'rail.lever', 'rail.hook', 'rail.jump', 'rail.glide'][
                                int(6)
                              ]!,
                            };
    if (act(pid, fields).status === 'accepted') accepted++;
    // Rule ticks (and the steps between them) at random; a supply pulse now and then.
    if (rng() < 0.3) r.sync.stepWorld(int(4) * 50 + 17);
    if (k % 700 === 699) r.api.supply({ marker: 1 + Math.floor(k / 700), grow: '0'.repeat(97), recover: [] });
    if (rng() < 0.5) r.pump();
    if (k === 3000) r.join('late');
    if (k % 97 === 0) {
      r.pump();
      for (const cid of r.mirrors.keys()) agree(r, cid);
      assert.equal(check(r.api.world()), null);
      assert.equal(railCounts(r.api.world()).total, initial + railCounts(r.api.world()).produced);
    }
  }
  // Let every funded stretch run out on its schedule; the mirror derives it from start ticks alone.
  for (let k = 0; k < 4000; k++) {
    r.sync.stepWorld(100);
    if (k % 50 === 0) {
      r.pump();
      for (const cid of r.mirrors.keys()) agree(r, cid);
    }
  }
  r.pump();
  for (const cid of r.mirrors.keys()) agree(r, cid);
  const counts = railCounts(r.api.world());
  assert.ok(accepted > 300, `${accepted} accepted`);
  assert.ok(counts.delivered >= T1.bill, `the stream funded at least T1: ${JSON.stringify(counts)}`);
  assert.equal(counts.total, RAILWAY_SUPPLY + 30 + counts.produced);
  console.log(
    `[railway-replicate] ${accepted} accepted actions, ${r.bytes()} packet chars, stations completed ${counts.completion}`,
  );
});

test('a running job sends nothing per rule tick: its timed fields are derived', () => {
  const r = room();
  r.join('a');
  // Fund T1 directly, then let it lay: the state is set up on the world (marked, so it replicates).
  r.api.session('alice', 1);
  const w = r.api.world();
  w.mut(Rail, w.single(Rail))!.awake = 0;
  for (let k = 0; k <= T1.wakeTicks; k++) r.sync.stepWorld(100);
  Object.assign(w.mut(Job, w.lookup(Job, 0)!)!, { stock: T1.bill - 1, delivered: T1.bill - 1 });
  w.mut(Tree, w.lookup(Tree, 0)!)!.left -= T1.bill;
  w.mut(Account, w.lookup(Account, 'alice')!)!.carry = 1;
  r.api.touchAll();
  r.pump();
  assert.equal(
    r.api.act('alice', { op: 'rail.deposit', station: 'T1', n: 1, epoch: 1, request: 1 }, anywhere).accepted,
    1,
  );
  assert.ok(job(r.api.world(), 0).start >= 0, 'funded');
  r.pump();
  const before = r.bytes();
  for (let k = 0; k < 30; k++) {
    r.sync.stepWorld(1000 / 60);
    r.pump();
  }
  assert.equal(r.bytes(), before, 'thirty steps of laying cost no bytes');
  agree(r, 'a');
  const elapsed = (x: World) => railJobs(x, r.sync.world.tick)[0]!.run.elapsed;
  assert.ok(elapsed(r.api.world()) > 0 && elapsed(r.mirrors.get('a')!.confirmed()) === elapsed(r.api.world()));
  assert.equal(RULE_STEPS, 6);
});

test('the railway state is a server state: saved by the host, never hashed or served to clients', () => {
  const r = room();
  r.api.session('alice', 1);
  assert.ok('railway' in r.sync.snapshot().data);
  assert.ok(!('railway' in r.sync.snapshot(false).data));
  assert.ok(!('railway' in r.sync.stateHashes()));
  const saved = JSON.parse(JSON.stringify(r.sync.snapshot()));
  const again = room();
  again.sync.loadSnapshot(saved);
  assert.equal(again.api.account('alice')?.epoch, 1);
  // the depot cart, boiler and trains; the Works and the shed; the lines; the aperture (v27); the yards, the town and
  // the till (slice 5); the steel works (ring-island-build2); the legs, the junction yard and the route (the greybox
  // route)
  assert.equal(RAIL_SCHEMAS.length, 24);
});

test('a scripted run through line one, the pack and line two to Q6 replicates exactly, live and to a late joiner', () => {
  const r = room();
  r.join('a');
  const w = () => r.api.world(); // taken again at every use: a published world is never held
  const req = new Map<string, number>();
  const RACED: Record<string, string> = { 'rail.seaSwitch': 'sea-predict', 'rail.glide': 'glide-predict' };
  const act = (pid: string, op: string, fields: Partial<RailAction> = {}) => {
    const n = (req.get(pid) ?? 0) + 1;
    req.set(pid, n);
    const result = r.api.act(pid, { op, ...fields, epoch: 1, request: n } as RailAction, anywhere);
    // The one-flag takes raced below: a's predicting adapter listens on its own mirror session.
    const racing = RACED[op];
    if (racing) {
      if (result.accepted) r.replication.emit({ op, pid, request: n, accepted: result.accepted }, pid);
      if (pid === 'a') r.replication.ack(racing, 1, n);
    }
    r.pump();
    agree(r, 'a');
    return result.accepted;
  };
  const advance = (ticks: number) => {
    for (let i = 0; i < ticks; i++) {
      r.sync.stepWorld(100);
      if (i % 7 === 0) {
        r.pump();
        agree(r, 'a');
      }
    }
  };
  const acct = (pid: string) => account(w(), pid)!;
  const chop = (pid: string) => {
    const load = () => acct(pid).carry + acct(pid).stone + acct(pid).rails;
    while (load() < 8) {
      const k = trees(w()).findIndex((t) => t.left > 0);
      act(pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0.5, collapsed: true });
    }
  };
  const logs = (pid: string, station: string, n: number) => {
    while (n > 0) {
      if (!acct(pid).carry) chop(pid);
      const moved = act(pid, 'rail.deposit', { station, n: Math.min(n, acct(pid).carry), kind: 0 });
      assert.ok(moved > 0, `${station} took logs`);
      n -= moved;
    }
  };
  const rails = (pid: string, station: string, n: number) => {
    while (n > 0) {
      if (!acct(pid).rails) {
        if (!forge(w()).rack) advance(40);
        assert.ok(act(pid, 'rail.forgeTake') > 0);
      }
      const moved = act(pid, 'rail.deposit', { station, n: Math.min(n, acct(pid).rails), kind: 2 });
      assert.ok(moved > 0, `${station} took rails`);
      n -= moved;
    }
  };
  for (const pid of ['a', 'b']) r.api.session(pid, 1);
  act('a', 'rail.wake');
  advance(T1.wakeTicks + 1);
  logs('a', 'T1', 24);
  advance(300);
  for (let i = 0; i < 8;) {
    const k = rocks(w()).findIndex((x) => x.left > 0);
    const n = act('b', 'rail.mine', { id: k });
    assert.equal(act('b', 'rail.deposit', { station: 'T2', kind: 1, n }), n);
    i += n;
  }
  logs('a', 'T2', 32);
  advance(300);
  logs('a', 'T3', 40);
  act('a', 'rail.axe');
  for (let i = 0; i < 12; i++) act('a', 'rail.beamChop');
  act('a', 'rail.beamTake', { revision: beam(w()).revision });
  assert.equal(act('a', 'rail.beamDeposit', { revision: beam(w()).revision, station: 'T3' }), 1);
  advance(600);
  assert.equal(job(w(), 1).completion, 1);
  assert.equal(act('a', 'rail.pack'), 0, 'no pack chest before the forge bill');
  logs('a', 'F', 24);
  // The pack, predicted on a's own copy of its mirror with the server's very system: one open, every back 16.
  const mirror = r.mirrors.get('a')!;
  const predicted = shownOf(mirror.confirmed());
  const press = railPredict(predicted, 'a', { op: 'rail.pack', epoch: 1, request: (req.get('a') ?? 0) + 1 }, 0);
  assert.equal(press.n, 1, 'the press is shown at once');
  assert.equal(rail(predicted).pack, true);
  assert.equal(carryMax(predicted), 16);
  assert.equal(rail(mirror.confirmed()).pack, false, 'the confirmed mirror waits for the server');
  assert.equal(act('a', 'rail.pack'), 1);
  assert.equal(act('b', 'rail.pack'), 0, 'one pack for two openers');
  assert.equal(carryMax(mirror.confirmed()), 16, 'the mirror carries 16 once confirmed');
  logs('b', 'F', 32);
  assert.ok(forge(w()).lit >= 0, 'the forge is lit');
  /** a's predicting adapter on its own mirror session `name`, standing at `pose`, for a one-flag take race. */
  const racer = (name: string, pose: { x: number; y: number; z: number }) => {
    r.join(name);
    const mirrorOf = r.mirrors.get(name)!;
    const adapter = createRailwayAdapter({
      mirror: mirrorOf,
      movement: () => ({
        ...railMovement({ get: (k) => specOf(k)!.def }),
        beamSoloSpeed: 2,
        beamHelpSpeed: 5,
        jumpImpulse: 6,
        jumpTurn: 1,
        jumpSteer: 25,
        jumpApexSpeed: 1,
      }),
      pid: 'a',
      pose: () => pose,
      now: () => 1000,
    });
    let hear: ((message: unknown, from: string) => void) | undefined;
    const corrections: RailwayCorrection[] = [],
      effects: RailwayAccepted[] = [];
    adapter.onCorrected((c) => corrections.push(c));
    adapter.onAccepted((e) => effects.push(e));
    adapter.attach({
      selfId: 'a',
      send: () => {},
      onMessage: (fn) => {
        hear = fn;
        return () => {};
      },
      onConnection: () => () => {},
    });
    hear!({ t: 'r:session', to: 'a', epoch: 1, next: (req.get('a') ?? 0) + 1 }, SERVER_ID);
    r.pump();
    return { adapter, mirror: mirrorOf, corrections, effects };
  };
  for (let k = 0; k <= Q6; k++) {
    const spec = LINE2_STATIONS[k]!;
    if (spec.gate === 'quarry') {
      chop('b');
      const shown = shownOf(mirror.confirmed());
      const deposit = {
        op: 'rail.deposit',
        station: spec.id,
        n: 1,
        kind: 0,
        epoch: 1,
        request: (req.get('b') ?? 0) + 1,
      };
      assert.equal(railPredict(shown, 'b', deposit, r.sync.world.tick).n, 1, 'gated deposit predicts');
      assert.equal(qjob(shown, k).stock, 1);
      assert.equal(qjob(shown, k).start, -1);
      assert.equal(act('b', 'rail.deposit', { station: spec.id, n: 1, kind: 0 }), 1, 'gated deposit confirms');
      assert.equal(act('a', 'rail.lever'), 1);
    }
    if (k === 3) {
      assert.equal(qjob(w(), 3).completion, 0, 'Q4 has not been built');
      const { adapter, mirror: seaMirror, corrections, effects } = racer('sea-predict', { x: 1011.8, y: 102.4, z: -6 });
      assert.equal(adapter.pullSeaSwitch(), true, 'sea switch predicts on the press');
      assert.equal(rail(adapter.read.world()).sea, true);
      assert.equal(line2SeaOpen(adapter.read.world()), true, 'the early press immediately predicts the open gate');
      assert.equal(rail(seaMirror.confirmed()).sea, false, 'confirmed mirror waits');
      assert.equal(act('b', 'rail.seaSwitch'), 1, 'a friend pulled it first');
      assert.equal(act('a', 'rail.seaSwitch'), 0, 'the pending press settles as noop');
      assert.equal(corrections.length, 0, 'a shared flag that holds gives no correction effect');
      assert.equal(effects.filter((e) => e.op === 'rail.seaSwitch').length, 1, 'the pull only plays once');
      assert.equal(line2SeaOpen(adapter.read.world()), true);
      assert.equal(adapter.read.pending(), 0, 'the noop acknowledges the predicted press');
      adapter.dispose();
      chop('b');
      assert.ok(act('b', 'rail.forgeTake') > 0);
      const held = [acct('b').carry, acct('b').rails];
      assert.equal(act('b', 'rail.deposit', { station: 'Q5', n: 1, kind: 0 }), 0, 'open sea cannot skip active Q4');
      assert.equal(act('b', 'rail.deposit', { station: 'Q5', n: 1, kind: 2 }), 0, 'Q5 refuses rails too');
      assert.deepEqual([acct('b').carry, acct('b').rails], held);
      assert.deepEqual([qjob(w(), 4).stock, qjob(w(), 4).railStock, qjob(w(), 4).start], [0, 0, -1]);
      const reload = room();
      reload.sync.loadSnapshot(JSON.parse(JSON.stringify(r.sync.snapshot())));
      reload.api.touchAll();
      reload.join('returning');
      reload.pump();
      agree(reload, 'returning');
      assert.equal(rail(reload.mirrors.get('returning')!.confirmed()).sea, true, 'reload keeps the early pull');
      assert.equal(qjob(reload.api.world(), 3).completion, 0, 'reload did not complete Q4');
    }
    if (spec.feed === 'train') {
      // Clear the remaining hand-carried units before shouldering the unique boiler.
      for (const pid of ['a', 'b'])
        for (const kind of [0, 2]) {
          const n = kind ? acct(pid).rails : acct(pid).carry;
          if (n) act(pid, 'rail.drop', { kind, n, x: 91900, y: 1815, z: 540 });
        }
      assert.equal(act('a', 'rail.boilerTake', { revision: boiler(w()).revision }), 1);
      assert.equal(act('a', 'rail.boilerFit', { revision: boiler(w()).revision }), 1);
      advance(600);
    }
    advance(40);
    if (spec.shelf) {
      // Q4's rails ride the depot from the forge rack to the shelf; taking them is predicted like any take.
      advance(120);
      assert.ok(rail(w()).depotRails > 0, 'the cart brought rails to the shelf');
      const shown = shownOf(mirror.confirmed());
      const before = acct('a').rails;
      const take = railPredict(shown, 'a', { op: 'rail.depotRailTake', epoch: 1, request: (req.get('a') ?? 0) + 1 }, 0);
      assert.ok(take.n > 0);
      assert.equal(act('a', 'rail.depotRailTake'), take.n, 'the server moves what the press showed');
      assert.equal(acct('a').rails, before + take.n);
      assert.equal(act('a', 'rail.deposit', { station: spec.id, n: acct('a').rails, kind: 2 }), before + take.n);
    }
    if (spec.depot) {
      while (qjob(w(), k).start < 0 && qjob(w(), k).stock < spec.bill[0]) {
        advance(20);
        if (rail(w()).depot) {
          act('b', 'rail.depotTake');
          act('b', 'rail.deposit', { station: spec.id, n: acct('b').carry, kind: 0 });
        } else logs('a', spec.id, Math.min(8, spec.bill[0] - qjob(w(), k).stock));
      }
    } else logs('a', spec.id, spec.bill[0]);
    if (qjob(w(), k).start < 0) rails('a', spec.id, spec.bill[1] - qjob(w(), k).railStock);
    advance(2000);
    assert.equal(qjob(w(), k).completion, 1, `Q${k + 1} complete`);
    if (k === 1) assert.equal(act('a', 'rail.hook'), 1);
    if (k === 4) {
      // Both take the glider within one round trip: the friend's take wins, a's predicted take settles as noop with
      // no correction, so a's arrival keeps its card and the reward plays once.
      const glide = racer('glide-predict', { x: 1016, y: 102.4, z: -4.5 });
      assert.equal(glide.adapter.claimGlide(), true, 'the take predicts on the press');
      assert.equal(rail(glide.mirror.confirmed()).glide, false, 'confirmed mirror waits');
      assert.equal(act('b', 'rail.glide'), 1, 'a friend took it first');
      assert.equal(act('a', 'rail.glide'), 0, 'the pending take settles as noop');
      assert.equal(glide.corrections.length, 0, 'a shared flag that holds gives no correction effect');
      assert.equal(glide.effects.filter((e) => e.op === 'rail.glide').length, 1, 'the take only plays once');
      assert.equal(rail(glide.adapter.read.world()).glide, true);
      assert.equal(glide.adapter.read.pending(), 0, 'the noop acknowledges the predicted take');
      glide.adapter.dispose();
    }
  }
  r.pump();
  agree(r, 'a');
  r.join('c');
  r.pump();
  agree(r, 'c');
  const joined = r.mirrors.get('c')!.confirmed();
  assert.equal(rail(joined).lever, true);
  assert.equal(rail(joined).sea, true, 'a late joiner gets the sea switch');
  assert.equal(rail(joined).pack, true, 'a late joiner gets the pack');
  assert.equal(rail(joined).glide, true, 'a late joiner sees the glider taken');
  assert.equal(carryMax(joined), 16);
  const counts = railCounts(joined, r.sync.world.tick); // a client's world is read at the server's tick
  assert.equal(counts.rails.total, counts.rails.poured, 'no rail minted');
  assert.equal(counts.total, RAILWAY_SUPPLY + 30 + counts.produced);
});

test('boiler and train packets patch the mirror; boiler blocks predicted material and call waits', () => {
  const seed = railwayAtTrains('boiler'),
    r = room();
  while (r.sync.world.tick < seed.t) r.sync.stepWorld(100);
  r.api.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())));
  r.api.touchAll();
  r.join('a');
  r.pump();
  agree(r, 'a');
  const a = r.api.account('a')!;
  const result = r.api.act(
    'a',
    { op: 'rail.boilerTake', epoch: a.epoch, request: a.request + 1, revision: r.api.boiler().revision },
    anywhere,
  );
  assert.equal(result.status, 'accepted');
  r.pump();
  agree(r, 'a');
  const shown = shownOf(r.mirrors.get('a')!.confirmed());
  assert.equal(
    railPredict(shown, 'a', { op: 'rail.depotTake', epoch: a.epoch, request: a.request + 2 }, r.sync.world.tick).n,
    0,
  );
  assert.equal(
    railPredict(shown, 'a', { op: 'rail.forgeTake', epoch: a.epoch, request: a.request + 2 }, r.sync.world.tick).n,
    0,
  );
  assert.equal(RAIL_PREDICTED.has('rail.call'), false);
  assert.equal(
    r.api.act(
      'a',
      { op: 'rail.boilerFit', epoch: a.epoch, request: a.request + 2, revision: r.api.boiler().revision },
      anywhere,
    ).status,
    'accepted',
  );
  r.sync.stepWorld(12000);
  r.pump();
  agree(r, 'a');
  assert.equal(boiler(r.mirrors.get('a')!.confirmed()).state, 'fitted');
  assert.equal(train(r.mirrors.get('a')!.confirmed(), 1).logs, 32);
});

test("every train and line row reaches the mirror through the replicated components (v27's four trains)", () => {
  const seed = railwayAtTrains('q6-done'),
    r = room();
  while (r.sync.world.tick < seed.t) r.sync.stepWorld(100);
  r.api.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())));
  r.api.touchAll();
  r.join('a');
  r.pump();
  agree(r, 'a');
  const a = r.api.account('a')!;
  // A lever ask (the line's row) and a rider's ask (the train's own) both reach the mirror.
  const call = (request: number, e: object) =>
    r.api.act('a', { op: 'rail.call', epoch: a.epoch, request, ...e }, anywhere).status;
  assert.equal(call(a.request + 1, { id: 3, dir: -1 }), 'accepted');
  const dir = train(r.api.world(), 1).track ? -1 : 1;
  assert.equal(call(a.request + 2, { id: 4, dir, train: 1 }), 'accepted');
  for (let k = 0; k < 12; k++) {
    r.sync.stepWorld(1000);
    r.pump();
    agree(r, 'a');
    const server = r.api.world(),
      mirror = r.mirrors.get('a')!.confirmed();
    // v27's four, and the greybox route's three fleet rows (in the shed until the stack line is laid; three from v34).
    assert.equal(trains(mirror).length, 7);
    assert.deepEqual(trains(mirror), trains(server));
    assert.deepEqual(lines(mirror), lines(server));
  }
  assert.equal(check(r.api.world()), null);
});
test('Q6 prediction keeps train rails aboard until funding is confirmed', () => {
  const w = railwayAtTrains('trains-on');
  seedAdvance(w, 100);
  assert.equal(train(w.w, 1).rails, 32);
  seedAct(w, 'a', 'rail.pack');
  seedLogs(w, 'a', 'Q6', 32);
  seedRails(w, 'b', 'Q6', 16);
  seedAdvance(w, 80);
  assert.ok(seedAct(w, 'b', 'rail.forgeTake') > 0);
  assert.equal(account(w.w, 'b')!.rails, 16);
  const shown = shownOf(w.w),
    beforeRack = forge(shown).rack,
    beforeTrains = structuredClone(trains(shown));
  const a = account(w.w, 'b')!;
  const e = { op: 'rail.deposit', epoch: a.epoch, request: a.request + 1, station: 'Q6', kind: 2, n: 16 };
  assert.equal(railPredict(shown, 'b', e, w.t).n, 16);
  assert.equal(qjob(shown, 5).start, -1);
  assert.deepEqual(trains(shown), beforeTrains);
  assert.equal(forge(shown).rack, beforeRack);
  assert.equal(railCounts(shown).rails.total, railCounts(shown).rails.poured);
  assert.equal(seedAct(w, 'b', 'rail.deposit', { station: 'Q6', kind: 2, n: 16 }), 16);
  assert.equal(train(w.w, 1).rails, 0);
  assert.equal(train(w.w, 1).logs, 32, 'logs already minted stay aboard');
  seedAdvance(w, 500);
  assert.equal(railCounts(w.w).rails.total, railCounts(w.w).rails.poured);
});

test('a footing take predicted, then lost to a friend, comes back as a correction; mechanism ops wait', () => {
  const seed = railwayAtWorks('works-lit'),
    r = room();
  while (r.sync.world.tick < seed.t) r.sync.stepWorld(100);
  r.api.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())));
  r.api.touchAll();
  r.join('a');
  r.pump();
  agree(r, 'a');
  const mirror = r.mirrors.get('a')!;
  const adapter = createRailwayAdapter({
    mirror,
    movement: () => ({
      ...railMovement({ get: (k) => specOf(k)!.def }),
      beamSoloSpeed: 2,
      beamHelpSpeed: 5,
      jumpImpulse: 6,
      jumpTurn: 1,
      jumpSteer: 25,
      jumpApexSpeed: 1,
    }),
    pid: 'a',
    pose: () => ({ x: 1088, y: 24, z: 50 }),
    now: () => 1000,
  });
  let hear: ((message: unknown, from: string) => void) | undefined;
  const sent: Record<string, unknown>[] = [],
    corrections: RailwayCorrection[] = [];
  adapter.onCorrected((c) => corrections.push(c));
  adapter.attach({
    selfId: 'a',
    send: (m) => void sent.push((m as { e: Record<string, unknown> }).e),
    onMessage: (fn) => {
      hear = fn;
      return () => {};
    },
    onConnection: () => () => {},
  });
  const server = (pid: string, e: Record<string, unknown>) => {
    const a = r.api.account(pid)!;
    return r.api.act(pid, { epoch: a.epoch, request: a.request + 1, ...e } as RailAction, anywhere);
  };
  hear!(
    { t: 'r:session', to: 'a', epoch: r.api.account('a')!.epoch, next: r.api.account('a')!.request + 1 },
    SERVER_ID,
  );
  r.pump();
  // A friend takes all but one footing (each put down beside the rack).
  for (let k = 0; k < WORKS.rackCap - 1; k++) {
    assert.equal(server('b', { op: 'rail.footTake', rack: 0 }).status, 'accepted');
    assert.equal(server('b', { op: 'rail.drop', x: 108800, y: 2400, z: 5000, n: 1, kind: 3 }).status, 'accepted');
  }
  r.pump();
  assert.equal(works(adapter.read.world()).rack, 1);
  assert.equal(adapter.shoulderFooting(0), true, 'predicted on the press');
  assert.equal(account(adapter.read.world(), 'a')!.foot, 1);
  assert.equal(works(adapter.read.world()).rack, 0);
  assert.equal(server('b', { op: 'rail.footTake', rack: 0 }).status, 'accepted', 'the friend got there first');
  const e = sent.at(-1)!;
  assert.equal(e.op, 'rail.footTake');
  assert.equal(r.api.act('a', e as RailAction, anywhere).status, 'noop');
  r.replication.ack('a', e.epoch as number, e.request as number);
  r.pump();
  assert.equal(adapter.read.pending(), 0);
  assert.equal(account(adapter.read.world(), 'a')!.foot, 0, 'the footing goes back');
  assert.deepEqual(
    corrections.map((c) => [c.event.op, c.lost]),
    [['rail.footTake', 1]],
  );
  // A footing on your back blocks every other material op; the mechanism ops wait for the server.
  for (const op of ['rail.breaker', 'rail.strike', 'rail.turn']) assert.equal(RAIL_PREDICTED.has(op), false, op);
  adapter.dispose();
  agree(r, 'a');
});
test('the kiln lit, the cradle fitted and the wagon rolling out are never predicted', () => {
  const w = railwayAtWorks('works-open');
  const a = (pid: string) => account(w.w, pid)!;
  while (a('a').carry < WORKS.kilnLogs) {
    const k = trees(w.w).findIndex((t) => t.left > 0);
    seedAct(w, 'a', 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
  }
  assert.equal(seedAct(w, 'a', 'rail.kiln'), WORKS.kilnLogs);
  for (const id of [3, 4]) while (rock(w.w, id).left > 0) seedAct(w, 'b', 'rail.mine', { id });
  let shown = shownOf(w.w);
  const kiln = { op: 'rail.kiln', epoch: a('b').epoch, request: a('b').request + 1 };
  assert.equal(railPredict(shown, 'b', kiln, w.t).n, WORKS.kilnStone);
  assert.deepEqual([works(shown).logs, works(shown).stone, works(shown).lit], [16, 16, -1], 'full, lit by the server');
  for (const e of [{ op: 'rail.strike', id: 0 }, { op: 'rail.turn', to: 1, revision: 0 }, { op: 'rail.breaker' }])
    assert.equal(railPredict(shown, 'a', { ...e, epoch: a('a').epoch, request: a('a').request + 1 }, w.t).n, 0);
  // The cradle takes its eight rails and no footings (works-late-game step 2a); the table turns only once it is fitted.
  const s = railwayAtWorks('stall-done');
  assert.equal(seedAct(s, 'a', 'rail.turn', { to: 1, revision: 0 }), 0, 'no turn before the fit');
  while (forge(s.w).rack < 8) seedAdvance(s, 1);
  seedAct(s, 'b', 'rail.forgeTake');
  shown = shownOf(s.w);
  const b = account(s.w, 'b')!;
  assert.equal(railPredict(shown, 'b', { op: 'rail.cradle', epoch: b.epoch, request: b.request + 1 }, s.t).n, 8);
  assert.deepEqual([shed(shown).cradleRails, shed(shown).fitted, shed(shown).ready], [8, -1, -1]);
  assert.equal(seedAct(s, 'b', 'rail.cradle'), 8);
  assert.equal(shed(s.w).fitted, s.t);
  assert.equal(shed(s.w).ready, -1, 'fitted, the table still facing the stall');
  assert.equal(seedAct(s, 'a', 'rail.turn', { to: 1, revision: 0 }), 1);
  assert.equal(shed(s.w).ready, s.t + WORKS.rollTicks);
});

// Ring Island's steel works (ring-island-build2, R4): the yard take and the feed are predicted like the kiln's; the
// works lit by the feed that fills the bill is the server's, and the install is never predicted.
test('the steel works: its yard take and feed are predicted, its lighting and the install are not', () => {
  const w = buildSeedWorld('steel-kit');
  const a = () => account(w.w, 'a')!;
  const shown0 = shownOf(w.w);
  const take = { op: 'rail.steelTake', kind: 1, epoch: a().epoch, request: a().request + 1 };
  const got = railPredict(shown0, 'a', take, w.t);
  assert.ok(got.n > 0, 'rails off the yard on the press');
  assert.equal(steel(shown0).yardRails, STEEL.rails - got.n);
  assert.deepEqual([got.effect!.carried, got.effect!.level], [account(shown0, 'a')!.rails, STEEL.rails - got.n]);
  // Feed everything but the last back, then predict the feed that fills the bill.
  for (let guard = 0; ; guard++) {
    assert.ok(guard < 16);
    const kind = steel(w.w).yardLogs ? 0 : 1;
    seedAct(w, 'a', 'rail.steelTake', { kind });
    if (steel(w.w).yardLogs + steel(w.w).yardRails === 0) break;
    seedAct(w, 'a', 'rail.steel');
  }
  const shown = shownOf(w.w);
  const feed = { op: 'rail.steel', epoch: a().epoch, request: a().request + 1 };
  assert.ok(railPredict(shown, 'a', feed, w.t).n > 0);
  assert.deepEqual(
    [steel(shown).logs, steel(shown).rails, steel(shown).lit],
    [STEEL.logs, STEEL.rails, -1],
    'full, lit by the server',
  );
  assert.ok(seedAct(w, 'a', 'rail.steel') > 0);
  assert.equal(steel(w.w).lit, w.t, 'lit on the server');
  const install = { op: 'rail.install', line: 1, part: 1, revision: 0, epoch: a().epoch, request: a().request + 1 };
  assert.equal(RAIL_PREDICTED.has('rail.install'), false);
  assert.equal(railPredict(shownOf(w.w), 'a', install, w.t).n, 0);
});

test('a steel kit take a friend beat you to comes back as onCorrected', () => {
  const seed = buildSeedWorld('steel-kit'),
    r = room();
  while (r.sync.world.tick < seed.t) r.sync.stepWorld(100);
  r.api.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())));
  r.api.touchAll();
  r.join('a');
  r.pump();
  agree(r, 'a');
  const adapter = createRailwayAdapter({
    mirror: r.mirrors.get('a')!,
    movement: () => ({
      ...railMovement({ get: (k) => specOf(k)!.def }),
      beamSoloSpeed: 2,
      beamHelpSpeed: 5,
      jumpImpulse: 6,
      jumpTurn: 1,
      jumpSteer: 25,
      jumpApexSpeed: 1,
    }),
    pid: 'a',
    pose: () => ({ x: 4455, y: 9, z: 0 }),
    now: () => 1000,
  });
  let hear: ((message: unknown, from: string) => void) | undefined;
  const sent: Record<string, unknown>[] = [],
    corrections: RailwayCorrection[] = [];
  adapter.onCorrected((c) => corrections.push(c));
  adapter.attach({
    selfId: 'a',
    send: (m) => void sent.push((m as { e: Record<string, unknown> }).e),
    onMessage: (fn) => {
      hear = fn;
      return () => {};
    },
    onConnection: () => () => {},
  });
  const server = (pid: string, e: Record<string, unknown>) => {
    const acc = r.api.account(pid)!;
    return r.api.act(pid, { epoch: acc.epoch, request: acc.request + 1, ...e } as RailAction, anywhere);
  };
  hear!(
    { t: 'r:session', to: 'a', epoch: r.api.account('a')!.epoch, next: r.api.account('a')!.request + 1 },
    SERVER_ID,
  );
  r.pump();
  assert.equal(steel(r.api.world()).yardLogs, STEEL.logs);
  // A friend takes the rails and puts them down beside the yard (the mirror is current once a change reaches it).
  assert.equal(server('b', { op: 'rail.steelTake', kind: 1 }).status, 'accepted');
  const rails = account(r.api.world(), 'b')!.rails;
  assert.equal(server('b', { op: 'rail.drop', x: 0, y: 900, z: 0, n: rails, kind: 2 }).status, 'accepted');
  r.pump();
  assert.equal(adapter.steelTake(0), true, 'predicted on the press');
  assert.ok(account(adapter.read.world(), 'a')!.carry > 0);
  assert.equal(server('b', { op: 'rail.steelTake', kind: 0 }).status, 'accepted', 'the friend got there first');
  assert.equal(steel(r.api.world()).yardLogs, 0);
  const e = sent.at(-1)!;
  assert.equal(e.op, 'rail.steelTake');
  assert.equal(r.api.act('a', e as RailAction, anywhere).status, 'noop');
  r.replication.ack('a', e.epoch as number, e.request as number);
  r.pump();
  assert.equal(adapter.read.pending(), 0);
  assert.equal(account(adapter.read.world(), 'a')!.carry, 0, 'the logs go back');
  assert.deepEqual(
    corrections.map((c) => [c.event.op, c.lost > 0]),
    [['rail.steelTake', true]],
  );
  adapter.dispose();
  agree(r, 'a');
});
