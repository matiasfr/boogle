// M11's differential check (docs/plans/ecs-migration-railway.md, M11): what the server host and the tools read now,
// rows and queries on the world, equals what they read before, the `Railway` read model built from the same world.
// On the host: counts(), phase(), panels(), line2() and the away credit's cap (railMaxDuration), and the rows
// dev/peer-test/ws-railway.ts and dev/loop/run.ts read (the cart, the trains, line 2's ask, the stops, the accounts, the
// carry cap). On a client's confirmed mirror at the server's tick: what dev/peer-test/ws-page.ts's probes report
// (phase, active station, counts, accounts, sources, line two's completions, the piles in order). Along a seeded
// stream of actions, ticks, supply pulses and away credits from each stage. Temporary: M12b deletes it with the model.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../../src/ecs/index.ts';
import { createSync } from '../../src/world/sync.ts';
import { installRules } from '../../src/world/rules/index.ts';
import { install as installRailway, type Actor } from '../../src/world/railway-server.ts';
import { createReplicator } from '../../src/world/replicate-server.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';
import { railwayOf } from '../../src/world/railway-predict.ts';
import { mulberry32 } from '../../src/sim/rng.ts';
import * as old from '../../src/sim/railway.ts';
import * as oldLine2 from '../../src/sim/railway-line2.ts';
import * as q from '../../src/sim/railway-queries.ts';
import * as q1 from '../../src/sim/railway-queries-line1.ts';
import * as q2 from '../../src/sim/railway-queries-line2.ts';
import * as qt from '../../src/sim/railway-queries-trains.ts';
import * as rows from '../../src/sim/railway-rows.ts';
import { buildSeedWorld, type SeedStage } from '../../src/sim/railway-seeds.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { railResume } from '../../src/sim/railway-sys-away.ts';
import { Pile, Rail, createRailwayWorld } from '../../src/sim/railway-components.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../../src/sim/railway-layout.ts';
import { LINE1_STATIONS } from '../../src/sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../../src/sim/railway-line2-layout.ts';
import { LINE2, RAIL_HALTS, RAIL_LINES, RAIL_TRAINS } from '../../src/sim/railway-lines.ts';
import type { RailAction } from '../../src/sim/railway.ts';
import { homeLand } from './land.ts';

export type Stage = SeedStage | 'fresh';
const anywhere: Actor = { reach: () => true, height: () => true, cadence: () => true };
const PLAYERS = ['a', 'b', 'm11'];

function room(stage: Stage) {
  const sync = createSync();
  sync.setSelfId('server');
  const replication = createReplicator();
  const api = installRailway(sync, installRules(sync, homeLand()), replication);
  api.touchAll();
  const mirror = createRailwayMirror();
  replication.addClient('c');
  let flushed = -1;
  const pump = () => {
    if (sync.roomStep() === flushed) sync.stepWorld(1000 / 60 + 1);
    const step = (flushed = sync.roomStep());
    replication.commit(step);
    replication.flush(step, (_cid, _p, json) => assert.ok(mirror.mirror.apply(JSON.parse(json), 0)));
  };
  if (stage !== 'fresh') {
    // As the seed builder and the jump-ins load one: the room's clock past the seed's, then the world.
    const seed = buildSeedWorld(stage);
    while (sync.world.tick <= seed.t) sync.stepWorld(100);
    api.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())), railwayCheck);
    api.touchAll();
  }
  return { sync, api, mirror, pump };
}
type Room = ReturnType<typeof room>;

/** Host: each accessor and each row a tool reads, against the read model of the same world. */
export function hostAgrees(r: Room, where: string) {
  const w = r.api.world();
  const s = railwayOf(w);
  const tick = r.sync.world.tick;
  assert.deepEqual(r.api.counts(), old.railCounts(s), `counts ${where}`);
  assert.equal(r.api.phase(), old.railPhase(s, tick), `phase ${where}`);
  assert.deepEqual(
    r.api.panels(),
    { committed: old.railPanelCount(s), stock: old.railPanelStock(s) },
    `panels ${where}`,
  );
  assert.deepEqual(
    r.api.line2(),
    { active: oldLine2.line2Active(s), completed: oldLine2.line2Completed(s), gateOpen: oldLine2.line2GateOpen(s) },
    `line2 ${where}`,
  );
  assert.equal(q1.railMaxDuration(w), old.railMaxDuration(s), `resume cap ${where}`);
  // dev/peer-test/ws-railway.ts
  assert.deepEqual({ ...rows.cart(w) }, s.line2!.cart, `cart ${where}`);
  for (let k = 0; k < RAIL_TRAINS.length; k++) assert.deepEqual({ ...rows.train(w, k) }, s.trains[k], `train ${k}`);
  assert.equal(rows.line(w, LINE2).req, s.lines[LINE2]!.req, `line 2's ask ${where}`);
  for (let k = 0; k < RAIL_LINES.length; k++)
    assert.deepEqual(qt.trainStops(w, k), oldLine2.trainStops(s, k), `stops ${k} ${where}`);
  // dev/loop/run.ts
  for (const pid of PLAYERS) assert.deepEqual(rows.account(w, pid), old.railAccount(s, pid), `account ${pid}`);
  assert.equal(q.railCarryMax(w), oldLine2.railCarryMax(s), `carry cap ${where}`);
  assert.equal(q2.line2Active(w), oldLine2.line2Active(s), `line2Active ${where}`);
}

/** What ws-page.ts's probes report from a mirror world at `tick`, and the same from the read model at that tick. */
export function probe(mw: World, tick: number) {
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
export function probeWas(s: old.Railway, tick: number) {
  return {
    phase: old.railPhase(s, tick),
    activeStation: old.railActiveStation(s),
    counts: old.railCounts(s),
    accounts: s.accounts.map((a) => ({ ...a })),
    sources: RAILWAY_SOURCES.map(([id], k) => ({ id, remaining: s.sources[k]! })),
    line2: s.line2?.jobs.map((j) => j.completion) ?? [],
    piles: s.piles.map((p) => [p.id, p.x, p.y, p.z, p.n, p.kind]),
  };
}
function mirrorAgrees(r: Room, where: string) {
  r.pump();
  const tick = r.sync.world.tick;
  const mw = r.mirror.world();
  if (mw.count(Rail) !== 1) return;
  // Before (ws-page.ts): `rail.at(tick)` then the read model's facts. Now: the mirror's world at that tick.
  assert.deepEqual(probe(mw, tick), probeWas(r.mirror.at(tick), tick), `mirror ${where}`);
}

function randomAction(w: World, rng: () => number): Omit<RailAction, 'epoch' | 'request'> {
  const int = (n: number) => Math.floor(rng() * n);
  const roll = rng();
  const active = LINE1_STATIONS[q.railActiveStation(w)]!.id;
  const qid = LINE2_STATIONS[Math.max(0, q2.line2Active(w))]!.id;
  const piles: number[] = [];
  w.each([Pile], (id) => piles.push(id));
  if (roll < 0.03) return { op: 'rail.wake' };
  if (roll < 0.3)
    return { op: 'rail.chop', id: RAILWAY_SOURCES[int(RAILWAY_SOURCES.length)]![0], yaw: 0, collapsed: rng() < 0.5 };
  if (roll < 0.38) return { op: 'rail.mine', id: int(5) };
  if (roll < 0.52) return { op: 'rail.deposit', station: active, n: 1 + int(8), kind: int(2) };
  if (roll < 0.62)
    return { op: 'rail.deposit', station: rng() < 0.3 ? 'F' : qid, n: 1 + int(8), kind: rng() < 0.5 ? 0 : 2 };
  if (roll < 0.68) return { op: 'rail.drop', x: T1.x + int(3) * 100, y: 3000, z: T1.z, n: 1 + int(8), kind: int(4) };
  if (roll < 0.74) return { op: 'rail.take', id: piles[int(piles.length + 1)] ?? 1, kind: int(4) };
  if (roll < 0.78) return { op: rng() < 0.5 ? 'rail.depotTake' : 'rail.depotRailTake' };
  if (roll < 0.82) return { op: 'rail.call', id: int(RAIL_HALTS.length), dir: rng() < 0.5 ? -1 : 1 };
  if (roll < 0.85) return { op: 'rail.footTake', rack: int(3) };
  if (roll < 0.88) return { op: 'rail.footSet', site: int(4) };
  if (roll < 0.9) return { op: 'rail.kiln' };
  if (roll < 0.92) return { op: 'rail.strike', id: int(3) };
  if (roll < 0.94) return { op: rng() < 0.5 ? 'rail.forgeTake' : 'rail.rackTake', kind: int(2) };
  const ops = ['rail.axe', 'rail.beamChop', 'rail.lever', 'rail.pack', 'rail.jump', 'rail.hook', 'rail.seaSwitch'];
  return { op: ops[int(ops.length)]! };
}

/** One test per stage: the stage as loaded, then a seeded stream of 160 steps, every read compared at each step. */
export function hostStages(stages: readonly Stage[]) {
  for (const stage of stages)
    test(`M11 at ${stage}: the host's reads and the tools' reads equal the read model's`, { timeout: 240000 }, () => {
      const r = room(stage);
      const rng = mulberry32(1100 + stage.length * 31);
      // Each player opens its next session (a seed's own players come back), and its requests count from 1.
      const request = new Map<string, number>(),
        epoch = new Map<string, number>();
      for (const pid of PLAYERS) {
        epoch.set(pid, (r.api.account(pid)?.epoch ?? 0) + 1);
        assert.ok(r.api.session(pid, epoch.get(pid)!), `${stage}: session ${pid}`);
        request.set(pid, 0);
      }
      hostAgrees(r, `${stage} loaded`);
      mirrorAgrees(r, `${stage} loaded`);
      let accepted = 0,
        marker = 1;
      for (let k = 0; k < 160; k++) {
        const where = `${stage} step ${k}`;
        const roll = rng();
        if (roll < 0.7) {
          const pid = PLAYERS[Math.floor(rng() * PLAYERS.length)]!;
          request.set(pid, request.get(pid)! + 1);
          const e = {
            ...randomAction(r.api.world(), rng),
            epoch: epoch.get(pid)!,
            request: request.get(pid)!,
          } as RailAction;
          if (r.api.act(pid, e, anywhere).status === 'accepted') accepted++;
        } else if (roll < 0.9) for (let t = 0, n = 1 + Math.floor(rng() * 40); t < n; t++) r.sync.stepWorld(100);
        else if (roll < 0.95) r.api.supply({ marker: marker++, grow: '', recover: [], beam: 0, boiler: 0 } as never);
        else r.api.resume(1 + Math.floor(rng() * 4000), marker++, Math.floor(rng() * 600));
        hostAgrees(r, where);
        if (k % 4 === 0) mirrorAgrees(r, where);
      }
      assert.ok(accepted > 10, `${stage}: the stream moved the world (${accepted} accepted)`);
    });
}

/** The away credit's cap after days away: the host's resume, against railResume capped by the read model's
 * railMaxDuration on a copy of the same world, give the same world. */
export function resumeAfterDays(stages: readonly Stage[]) {
  for (const stage of stages)
    test(`M11 at ${stage}: a room resumed after three days is capped as before`, { timeout: 240000 }, () => {
      const r = room(stage);
      const days = 3 * 24 * 36000; // ticks of 100 ms
      const marker = r.api.resumeMarker() + 1;
      const copy = createRailwayWorld();
      copy.load(JSON.parse(JSON.stringify(r.api.world().snapshot())));
      const tick = r.sync.world.tick;
      const want = railResume(copy, Math.min(days, old.railMaxDuration(railwayOf(copy))), marker, tick, days);
      assert.equal(r.api.resume(days, marker, days), want, `${stage}: job ticks advanced`);
      assert.equal(r.api.world().hash(), copy.hash(), `${stage}: the same world`);
      hostAgrees(r, `${stage} resumed`);
    });
}

/** ws-page.ts before a whole state: the fresh railway its probes fall back to equals the empty mirror's read model. */
export function freshProbe() {
  test('M11: before a whole state, the probes read a fresh railway, as the read model was', () => {
    const m = createRailwayMirror();
    assert.equal(m.world().count(Rail), 0);
    assert.deepEqual(probe(createRailwayWorld(), 0), probeWas(m.at(0), 0));
  });
}
