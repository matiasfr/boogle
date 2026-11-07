// Replication R1a: the railway is Server kind. A random action stream from several players, with rule ticks and supply
// pulses, runs on the server's rules; every client mirror (and a late joiner) rebuilt from the replication packets
// equals the server's state at the same tick, including the timed fields it derives instead of receiving.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway, type Actor } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror, railProjections, RAIL_SCHEMAS } from '../src/world/railway-replicate.ts';
import { RULE_STEPS } from '../src/world/room-clock.ts';
import {
  railCounts,
  railPhase,
  railPanelCount,
  railActiveStation,
  railJobs,
  railwayInvariant,
  type RailAction,
} from '../src/sim/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { LINE1_STATIONS, LINE1_INITIAL } from '../src/sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { RAILWAY_SUPPLY } from '../src/sim/railway-layout.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.ts';

const anywhere: Actor = { reach: () => true, height: () => true, cadence: () => true };

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
  for (const p of railProjections(() => server)) {
    const ids = [...p.ids()];
    assert.equal([...m.mirror.entries(p.schema.kind)].length, ids.length, `${cid} ${p.schema.kind} count`);
    for (const id of ids)
      assert.deepEqual(m.mirror.get(p.schema.kind, id), p.project(id), `${cid} ${p.schema.kind} ${id}`);
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
  const s = r.api.railway;
  // Fund T1 directly, then let it lay.
  r.api.session('alice', 1);
  s.awake = 0;
  for (let k = 0; k <= T1.wakeTicks; k++) r.sync.stepWorld(100);
  Object.assign(s.accounts[0]!, { carry: 0 });
  s.stock = T1.bill - 1;
  s.sources[0]! -= T1.bill;
  s.accounts[0]!.carry = 1;
  r.api.touchAll();
  r.pump();
  assert.equal(
    r.api.act('alice', { op: 'rail.deposit', station: 'T1', n: 1, epoch: 1, request: 1 }, anywhere).accepted,
    1,
  );
  assert.ok(s.start >= 0, 'funded');
  r.pump();
  const before = r.bytes();
  for (let k = 0; k < 30; k++) {
    r.sync.stepWorld(1000 / 60);
    r.pump();
  }
  assert.equal(r.bytes(), before, 'thirty steps of laying cost no bytes');
  agree(r, 'a');
  assert.ok(s.elapsed > 0 && r.mirrors.get('a')!.at(r.sync.world.tick).elapsed === s.elapsed);
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
  assert.equal(RAIL_SCHEMAS.length, 10);
});

test('a scripted run through line one and line two to the open quarry gate replicates exactly', () => {
  const r = room();
  r.join('a');
  const s = r.api.railway;
  const req = new Map<string, number>();
  const act = (pid: string, op: string, fields: Partial<RailAction> = {}) => {
    const n = (req.get(pid) ?? 0) + 1;
    req.set(pid, n);
    const result = r.api.act(pid, { op, ...fields, epoch: 1, request: n } as RailAction, anywhere);
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
  const account = (pid: string) => s.accounts.find((a) => a.pid === pid)!;
  const chop = (pid: string) => {
    const a = account(pid);
    while (a.carry + (a.stone ?? 0) + (a.rails ?? 0) < 8) {
      const k = s.sources.findIndex((n) => n > 0);
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
        if (!s.line2!.forge.rack) advance(40);
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
    const k = s.line!.rocks.findIndex((n) => n > 0);
    const n = act('b', 'rail.mine', { id: k });
    assert.equal(act('b', 'rail.deposit', { station: 'T2', kind: 1, n }), n);
    i += n;
  }
  logs('a', 'T2', 32);
  advance(300);
  logs('a', 'T3', 40);
  act('a', 'rail.axe');
  for (let i = 0; i < 12; i++) act('a', 'rail.beamChop');
  act('a', 'rail.beamTake', { revision: s.line!.beam.revision });
  assert.equal(act('a', 'rail.beamDeposit', { revision: s.line!.beam.revision, station: 'T3' }), 1);
  advance(600);
  assert.equal(s.line!.jobs[1].completion, 1);
  logs('a', 'F', 24);
  logs('b', 'F', 32);
  assert.ok(s.line2!.forge.lit >= 0, 'the forge is lit');
  for (let k = 0; k < LINE2_STATIONS.length; k++) {
    const spec = LINE2_STATIONS[k]!;
    advance(40);
    if (spec.depot) {
      while (s.line2!.jobs[k]!.stock < spec.bill[0]) {
        advance(20);
        if (s.line2!.depot) {
          act('b', 'rail.depotTake');
          act('b', 'rail.deposit', { station: spec.id, n: account('b').carry, kind: 0 });
        } else logs('a', spec.id, Math.min(8, spec.bill[0] - s.line2!.jobs[k]!.stock));
      }
    } else logs('a', spec.id, spec.bill[0]);
    rails('a', spec.id, spec.bill[1]);
    advance(2000);
    assert.equal(s.line2!.jobs[k]!.completion, 1, `Q${k + 1} complete`);
    if (k === 1) assert.equal(act('a', 'rail.hook'), 1);
  }
  assert.equal(act('a', 'rail.lever'), 1);
  r.pump();
  agree(r, 'a');
  const mirrored = r.mirrors.get('a')!.at(r.sync.world.tick);
  assert.equal(mirrored.line2!.lever, true);
  assert.equal(railCounts(mirrored).total, RAILWAY_SUPPLY + 30 + railCounts(mirrored).produced);
});
