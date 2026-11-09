// Replication R1a: the railway is Server kind. A random action stream from several players, with rule ticks and supply
// pulses, runs on the server's rules; every client mirror (and a late joiner) rebuilt from the replication packets
// equals the server's state at the same tick, including the timed fields it derives instead of receiving.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway, type Actor } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror, RAIL_SCHEMAS } from '../src/world/railway-replicate.ts';
import { Account, Job, Rail, Tree, railwayInvariant } from '../src/sim/railway-world.ts';
import { RULE_STEPS } from '../src/world/room-clock.ts';
import {
  railCounts,
  railPhase,
  railPanelCount,
  railActiveStation,
  railJobs,
  type RailAction,
} from '../src/sim/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { LINE1_STATIONS, LINE1_INITIAL } from '../src/sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { railCarryMax } from '../src/sim/railway-line2.ts';
import { cloneRailway, railPredict, railwayOf } from '../src/world/railway-predict.ts';
import {
  act as seedAct,
  advance as seedAdvance,
  logs as seedLogs,
  rails as seedRails,
  railwayAtQ4,
  railwayAtQ5,
} from './helpers/railway-q2.ts';
import { worldOf } from './railway-live.ts';
import { cartCycleTicks } from '../src/sim/railway-cart.ts';
import { RAILWAY_SUPPLY } from '../src/sim/railway-layout.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.ts';
import { createRailwayAdapter, type RailwayAccepted, type RailwayCorrection } from '../src/adapters/railway.ts';
import { SERVER_ID } from '../src/net/ids.ts';

const anywhere: Actor = { reach: () => true, height: () => true, cadence: () => true };

for (const k of [3, 4]) {
  test(`Q${k + 1} predicts a stocked gate pull without funding or returning cart/shelf rails early`, () => {
    const w = k === 3 ? railwayAtQ4() : railwayAtQ5('q4-done');
    const spec = LINE2_STATIONS[k]!;
    for (let t = 0; w.s.line2!.cart.rails === 0 && t < 3 * cartCycleTicks(k); t++) seedAdvance(w, 1);
    assert.ok(w.s.line2!.cart.rails > 0, 'rails aboard when the bill fills by hand');
    seedLogs(w, 'a', spec.id, spec.bill[0]);
    seedRails(w, 'b', spec.id, spec.bill[1]);
    const shown = cloneRailway(railwayOf(worldOf(w.s)));
    const before = structuredClone(shown.line2!);
    const a = w.s.accounts.find((a) => a.pid === 'a')!;
    const op = k === 3 ? 'rail.lever' : 'rail.seaSwitch';
    assert.equal(railPredict(shown, 'a', { op, epoch: a.epoch, request: a.request + 1 }, w.t).n, 1);
    const l = shown.line2!,
      j = l.jobs[k]!;
    assert.equal(k === 3 ? l.lever : l.sea, true);
    assert.equal(j.start, -1, 'funding waits for confirmation');
    assert.equal(j.stock, spec.bill[0]);
    assert.equal(j.railStock, spec.bill[1]);
    assert.equal(j.allocation + j.railAllocation, 0);
    assert.deepEqual(l.cart, before.cart);
    assert.equal(l.depotRails, before.depotRails);
    assert.equal(l.shelfOut, before.shelfOut);
    assert.equal(l.forge.rack, before.forge.rack);
    assert.equal(railCounts(shown).rails!.total, railCounts(shown).rails!.poured);
    assert.equal(seedAct(w, 'a', op), 1);
    assert.equal(w.s.line2!.jobs[k]!.start, w.t);
    assert.equal(w.s.line2!.cart.rails, 0, 'only the accepted pull returns surplus cargo');
  });
}

function room() {
  const sync = createSync();
  sync.setSelfId('server');
  const base = installRules(sync, homeLand());
  const replication = createReplicator();
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
  const server = r.api.railway;
  const mirrored = m.at(tick);
  // Every replicated component of the server's world, row for row.
  const w = r.api.world();
  for (const c of RAIL_SCHEMAS) {
    const ids = w.ids(c);
    assert.equal([...m.mirror.entries(c.kind)].length, ids.length, `${cid} ${c.kind} count`);
    for (const id of ids) {
      const row = w.get(c, id) as Record<string, unknown>;
      const fields = Object.fromEntries(c.names.map((f) => [f, row[f]]));
      assert.deepEqual(m.mirror.get(c.kind, id), fields, `${cid} ${c.kind} ${id}`);
      assert.deepEqual(m.world().get(c, id), row, `${cid} ${c.kind} ${id} in the mirror's world`);
    }
  }
  assert.deepEqual(railCounts(mirrored), railCounts(server), `${cid} counts`);
  assert.equal(railPhase(mirrored, tick), railPhase(server, tick), `${cid} phase`);
  assert.equal(railPanelCount(mirrored), railPanelCount(server), `${cid} panels`);
  assert.equal(railActiveStation(mirrored), railActiveStation(server));
  const jobs = (s: typeof server) => [...railJobs(s), ...s.line2!.jobs].map((j) => [j.elapsed, j.used, j.allocation]);
  assert.deepEqual(jobs(mirrored), jobs(server), `${cid} timed job fields at tick ${tick}`);
  assert.deepEqual(
    mirrored.piles,
    server.piles.map((p) => ({ ...p })),
    `${cid} piles`,
  );
  const accounts = (list: typeof server.accounts) =>
    list.map((a) => ({ ...a, stone: a.stone ?? 0, rails: a.rails ?? 0 })).sort((a, b) => (a.pid < b.pid ? -1 : 1));
  assert.deepEqual(accounts(mirrored.accounts), accounts(server.accounts), `${cid} accounts`);
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
    const s = r.api.railway;
    const roll = rng();
    const active = LINE1_STATIONS[railActiveStation(s)]!.id;
    const q = LINE2_STATIONS.find((_x, i) => !s.line2!.jobs[i]!.completion)?.id ?? 'Q1';
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
                    ? { op: 'rail.take', id: s.piles[int(s.piles.length + 1)]?.id ?? 1, kind: int(3) }
                    : roll < 0.92
                      ? { op: 'rail.forgeTake' }
                      : roll < 0.95
                        ? { op: 'rail.depotTake' }
                        : roll < 0.97
                          ? { op: 'rail.rackTake', kind: int(2) }
                          : { op: ['rail.axe', 'rail.beamChop', 'rail.lever', 'rail.hook', 'rail.jump'][int(5)]! };
    if (act(pid, fields).status === 'accepted') accepted++;
    // Rule ticks (and the steps between them) at random; a supply pulse now and then.
    if (rng() < 0.3) r.sync.stepWorld(int(4) * 50 + 17);
    if (k % 700 === 699) r.api.supply({ marker: 1 + Math.floor(k / 700), grow: '0'.repeat(97), recover: [] });
    if (rng() < 0.5) r.pump();
    if (k === 3000) r.join('late');
    if (k % 97 === 0) {
      r.pump();
      for (const cid of r.mirrors.keys()) agree(r, cid);
      assert.equal(railwayInvariant(r.api.railway), null);
      assert.equal(railCounts(r.api.railway).total, initial + railCounts(r.api.railway).produced);
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
  const counts = railCounts(r.api.railway);
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
  const s = () => r.api.railway;
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
  assert.ok(s().start >= 0, 'funded');
  r.pump();
  const before = r.bytes();
  for (let k = 0; k < 30; k++) {
    r.sync.stepWorld(1000 / 60);
    r.pump();
  }
  assert.equal(r.bytes(), before, 'thirty steps of laying cost no bytes');
  agree(r, 'a');
  assert.ok(s().elapsed > 0 && r.mirrors.get('a')!.at(r.sync.world.tick).elapsed === s().elapsed);
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
  assert.equal(RAIL_SCHEMAS.length, 11); // the depot cart joined (B3)
});

test('a scripted run through line one, the pack and line two to Q5 replicates exactly, live and to a late joiner', () => {
  const r = room();
  r.join('a');
  const s = () => r.api.railway; // rebuilt after each change
  const req = new Map<string, number>();
  const act = (pid: string, op: string, fields: Partial<RailAction> = {}) => {
    const n = (req.get(pid) ?? 0) + 1;
    req.set(pid, n);
    const result = r.api.act(pid, { op, ...fields, epoch: 1, request: n } as RailAction, anywhere);
    if (op === 'rail.seaSwitch') {
      if (result.accepted) r.replication.emit({ op, pid, request: n, accepted: result.accepted }, pid);
      if (pid === 'a') r.replication.ack('sea-predict', 1, n);
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
  const account = (pid: string) => s().accounts.find((a) => a.pid === pid)!;
  const chop = (pid: string) => {
    const load = () => account(pid).carry + (account(pid).stone ?? 0) + (account(pid).rails ?? 0);
    while (load() < 8) {
      const k = s().sources.findIndex((n) => n > 0);
      act(pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0.5, collapsed: true });
    }
  };
  const logs = (pid: string, station: string, n: number) => {
    while (n > 0) {
      if (!account(pid).carry) chop(pid);
      const moved = act(pid, 'rail.deposit', { station, n: Math.min(n, account(pid).carry), kind: 0 });
      assert.ok(moved > 0, `${station} took logs`);
      n -= moved;
    }
  };
  const rails = (pid: string, station: string, n: number) => {
    while (n > 0) {
      if (!account(pid).rails) {
        if (!s().line2!.forge.rack) advance(40);
        assert.ok(act(pid, 'rail.forgeTake') > 0);
      }
      const moved = act(pid, 'rail.deposit', { station, n: Math.min(n, account(pid).rails!), kind: 2 });
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
    const k = s().line!.rocks.findIndex((n) => n > 0);
    const n = act('b', 'rail.mine', { id: k });
    assert.equal(act('b', 'rail.deposit', { station: 'T2', kind: 1, n }), n);
    i += n;
  }
  logs('a', 'T2', 32);
  advance(300);
  logs('a', 'T3', 40);
  act('a', 'rail.axe');
  for (let i = 0; i < 12; i++) act('a', 'rail.beamChop');
  act('a', 'rail.beamTake', { revision: s().line!.beam.revision });
  assert.equal(act('a', 'rail.beamDeposit', { revision: s().line!.beam.revision, station: 'T3' }), 1);
  advance(600);
  assert.equal(s().line!.jobs[1].completion, 1);
  assert.equal(act('a', 'rail.pack'), 0, 'no pack chest before the forge bill');
  logs('a', 'F', 24);
  // The pack, predicted on a's own copy of its mirror with the server's very system: one open, every back 16.
  const mirror = r.mirrors.get('a')!;
  const predicted = cloneRailway(mirror.at(r.sync.world.tick));
  const press = railPredict(predicted, 'a', { op: 'rail.pack', epoch: 1, request: (req.get('a') ?? 0) + 1 }, 0);
  assert.equal(press.n, 1, 'the press is shown at once');
  assert.equal(predicted.line2!.pack, true);
  assert.equal(railCarryMax(predicted), 16);
  assert.equal(mirror.railway.line2!.pack, false, 'the confirmed mirror waits for the server');
  assert.equal(act('a', 'rail.pack'), 1);
  assert.equal(act('b', 'rail.pack'), 0, 'one pack for two openers');
  assert.equal(railCarryMax(mirror.at(r.sync.world.tick)), 16, 'the mirror carries 16 once confirmed');
  logs('b', 'F', 32);
  assert.ok(s().line2!.forge.lit >= 0, 'the forge is lit');
  for (let k = 0; k < LINE2_STATIONS.length; k++) {
    const spec = LINE2_STATIONS[k]!;
    if (spec.gate === 'quarry') {
      chop('b');
      const shown = cloneRailway(mirror.at(r.sync.world.tick));
      const deposit = {
        op: 'rail.deposit',
        station: spec.id,
        n: 1,
        kind: 0,
        epoch: 1,
        request: (req.get('b') ?? 0) + 1,
      };
      assert.equal(railPredict(shown, 'b', deposit, r.sync.world.tick).n, 1, 'gated deposit predicts');
      assert.equal(shown.line2!.jobs[k]!.stock, 1);
      assert.equal(shown.line2!.jobs[k]!.start, -1);
      assert.equal(act('b', 'rail.deposit', { station: spec.id, n: 1, kind: 0 }), 1, 'gated deposit confirms');
      assert.equal(act('a', 'rail.lever'), 1);
    }
    if (k === 3) {
      assert.equal(s().line2!.jobs[3]!.completion, 0, 'Q4 has not been built');
      r.join('sea-predict');
      const seaMirror = r.mirrors.get('sea-predict')!;
      const adapter = createRailwayAdapter({
        mirror: seaMirror,
        movement: () => ({
          beamSoloSpeed: 2,
          beamHelpSpeed: 5,
          jumpImpulse: 6,
          jumpTurn: 1,
          jumpSteer: 25,
          jumpApexSpeed: 1,
        }),
        pid: 'a',
        pose: () => ({ x: 1011.8, y: 102.4, z: -6 }),
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
      assert.equal(adapter.pullSeaSwitch(), true, 'sea switch predicts on the press');
      assert.equal(adapter.inspect().line2.sea, true);
      assert.equal(adapter.inspect().line2.seaOpen, true, 'the early press immediately predicts the open gate');
      assert.equal(seaMirror.railway.line2!.sea, false, 'confirmed mirror waits');
      assert.equal(act('b', 'rail.seaSwitch'), 1, 'a friend pulled it first');
      assert.equal(act('a', 'rail.seaSwitch'), 0, 'the pending press settles as noop');
      assert.equal(corrections.length, 0, 'a shared flag that holds gives no correction effect');
      assert.equal(effects.filter((e) => e.op === 'rail.seaSwitch').length, 1, 'the pull only plays once');
      assert.equal(adapter.inspect().line2.seaOpen, true);
      assert.equal(adapter.inspect().pending, 0, 'the noop acknowledges the predicted press');
      adapter.dispose();
      chop('b');
      assert.ok(act('b', 'rail.forgeTake') > 0);
      const held = [account('b').carry, account('b').rails];
      assert.equal(act('b', 'rail.deposit', { station: 'Q5', n: 1, kind: 0 }), 0, 'open sea cannot skip active Q4');
      assert.equal(act('b', 'rail.deposit', { station: 'Q5', n: 1, kind: 2 }), 0, 'Q5 refuses rails too');
      assert.deepEqual([account('b').carry, account('b').rails], held);
      assert.deepEqual(
        [s().line2!.jobs[4]!.stock, s().line2!.jobs[4]!.railStock, s().line2!.jobs[4]!.start],
        [0, 0, -1],
      );
      const reload = room();
      reload.sync.loadSnapshot(JSON.parse(JSON.stringify(r.sync.snapshot())));
      reload.api.touchAll();
      reload.join('returning');
      reload.pump();
      agree(reload, 'returning');
      assert.equal(reload.mirrors.get('returning')!.railway.line2!.sea, true, 'reload keeps the early pull');
      assert.equal(reload.api.railway.line2!.jobs[3]!.completion, 0, 'reload did not complete Q4');
    }
    advance(40);
    if (spec.shelf) {
      // Q4's rails ride the depot from the forge rack to the shelf; taking them is predicted like any take.
      advance(120);
      assert.ok(s().line2!.depotRails > 0, 'the cart brought rails to the shelf');
      const shown = cloneRailway(mirror.at(r.sync.world.tick));
      const before = account('a').rails ?? 0;
      const take = railPredict(shown, 'a', { op: 'rail.depotRailTake', epoch: 1, request: (req.get('a') ?? 0) + 1 }, 0);
      assert.ok(take.n > 0);
      assert.equal(act('a', 'rail.depotRailTake'), take.n, 'the server moves what the press showed');
      assert.equal(account('a').rails, before + take.n);
      assert.equal(act('a', 'rail.deposit', { station: spec.id, n: account('a').rails!, kind: 2 }), before + take.n);
    }
    if (spec.depot) {
      while (s().line2!.jobs[k]!.start < 0 && s().line2!.jobs[k]!.stock < spec.bill[0]) {
        advance(20);
        if (s().line2!.depot) {
          act('b', 'rail.depotTake');
          act('b', 'rail.deposit', { station: spec.id, n: account('b').carry, kind: 0 });
        } else logs('a', spec.id, Math.min(8, spec.bill[0] - s().line2!.jobs[k]!.stock));
      }
    } else logs('a', spec.id, spec.bill[0]);
    if (s().line2!.jobs[k]!.start < 0) rails('a', spec.id, spec.bill[1] - s().line2!.jobs[k]!.railStock);
    advance(2000);
    assert.equal(s().line2!.jobs[k]!.completion, 1, `Q${k + 1} complete`);
    if (k === 1) assert.equal(act('a', 'rail.hook'), 1);
  }
  r.pump();
  agree(r, 'a');
  r.join('c');
  r.pump();
  agree(r, 'c');
  const mirrored = r.mirrors.get('c')!.at(r.sync.world.tick);
  assert.equal(mirrored.line2!.lever, true);
  assert.equal(mirrored.line2!.sea, true, 'a late joiner gets the sea switch');
  assert.equal(mirrored.line2!.pack, true, 'a late joiner gets the pack');
  assert.equal(railCarryMax(mirrored), 16);
  assert.equal(railCounts(mirrored).rails!.total, railCounts(mirrored).rails!.poured, 'no rail minted');
  assert.equal(railCounts(mirrored).total, RAILWAY_SUPPLY + 30 + railCounts(mirrored).produced);
});
