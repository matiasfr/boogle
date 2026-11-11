// Line two's accounts: forge bills and pour, Q1-Q5 funding and laying, the depot and its rails shelf, the pack, gates
// and hook readiness (line two's systems on E, driven on a World through test/helpers/rail.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import { railGrowthMask } from '../src/sim/railway-supply.ts';
import { DEPOT_OUT, Forge, Pile, QJob, QJobRun, Rail, createRailwayWorld } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import {
  account,
  apply,
  beam,
  cart,
  createRailway,
  forge,
  hash,
  invariant,
  job,
  layTicks,
  qjob,
  qjobRun,
  rail,
  railCarryMax,
  railResume,
  railSession,
  railSupplyPulse,
  railTick,
  railwayAtQ4,
  railwayAtQ5,
  restore as restored,
  rocks,
  trees,
  type Seed,
} from './helpers/rail.ts';
import {
  line2Active,
  line2CartStatus,
  line2Completed,
  line2GateDown,
  line2GateOpen,
  line2SeaOpen,
  railCounts,
} from '../src/sim/railway-queries-line2.ts';
import type { RailAction } from '../src/sim/railway.ts';
import { LINE2_FORGE, LINE2_STATIONS, LINE2_PACK, line2Routes } from '../src/sim/railway-line2-layout.ts';
import { CART, CART_PHASE, cartCycleTicks } from '../src/sim/railway-cart.ts';
import { RAILWAY_T1 } from '../src/sim/railway-layout.ts';
import type { World as Rows } from '../src/ecs/index.ts';

type World = Seed;
/** A line-two job's row with its run row: the stored fields, read fresh (rows are replaced when a rule writes). */
const qj = (w: Rows, k: number) => ({ ...qjob(w, k), ...qjobRun(w, k) });
function act(w: World, pid: string, op: string, fields: Partial<RailAction> = {}) {
  const a = account(w.w, pid)!;
  const e = { op, epoch: a.epoch, request: a.request + 1, ...fields };
  const r = apply(w.w, pid, e, w.t);
  assert.equal(invariant(w.w), null, op);
  return r.accepted;
}
function advance(w: World, ticks: number) {
  for (let i = 0; i < ticks; i++) railTick(w.w, ++w.t);
  assert.equal(invariant(w.w), null);
}
/** Tick until the depot cart has unloaded at the rack (bounded by two whole trips) and `also` holds. */
function untilUnload(w: World, k: number, also: () => boolean = () => true) {
  for (let t = 1; t <= 2 * cartCycleTicks(k); t++) {
    railTick(w.w, ++w.t);
    if (cart(w.w).phase === CART_PHASE.DROP && also()) {
      assert.equal(invariant(w.w), null);
      return t;
    }
  }
  assert.fail('the cart never unloaded');
}
function chop(w: World, pid: string) {
  const back = () => account(w.w, pid)!; // read anew: a rule replaces the row
  while (back().carry + back().stone + back().rails < 8) {
    const k = trees(w.w).findIndex((t) => t.left > 0);
    assert.ok(k >= 0);
    act(w, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
    if (back().carry >= 8) break;
  }
}
function logs(w: World, pid: string, station: string, n: number) {
  while (n > 0) {
    if (!account(w.w, pid)!.carry) chop(w, pid);
    const moved = act(w, pid, 'rail.deposit', { station, n: Math.min(n, account(w.w, pid)!.carry), kind: 0 });
    assert.ok(moved > 0, `${station} took logs`);
    n -= moved;
  }
}
function rails(w: World, pid: string, station: string, n: number) {
  while (n > 0) {
    if (!account(w.w, pid)!.rails) {
      if (!forge(w.w).rack) advance(w, LINE2_FORGE.pourTicks * 8);
      assert.ok(act(w, pid, 'rail.forgeTake') > 0);
    }
    const moved = act(w, pid, 'rail.deposit', { station, n: Math.min(n, account(w.w, pid)!.rails), kind: 2 });
    assert.ok(moved > 0, `${station} took rails`);
    n -= moved;
  }
}
function finishLine1(w: World) {
  // Complete the three line-one jobs directly through accepted ops.
  const stations = ['T1', 'T2', 'T3'];
  logs(w, 'a', 'T1', 24);
  advance(w, 300);
  for (let i = 0; i < 8;) {
    const k = rocks(w.w).findIndex((r) => r.left > 0);
    const n = act(w, 'b', 'rail.mine', { id: k });
    assert.equal(act(w, 'b', 'rail.deposit', { station: 'T2', kind: 1, n }), n);
    i += n;
  }
  logs(w, 'a', 'T2', 32);
  advance(w, 300);
  logs(w, 'a', 'T3', 40);
  for (let i = 0; i < 12; i++) act(w, 'a', 'rail.beamChop');
  act(w, 'a', 'rail.beamTake', { revision: beam(w.w).revision });
  assert.equal(act(w, 'a', 'rail.beamDeposit', { revision: beam(w.w).revision, station: 'T3' }), 1);
  advance(w, 600);
  assert.equal(job(w.w, 2).completion, 1, stations.join());
}
function pathOpen(): World {
  const s = createRailway();
  for (const pid of ['a', 'b']) railSession(s, pid, 1);
  apply(s, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  const w = { w: s, t: 40 };
  finishLine1(w);
  return w;
}
function restoreIn(w: World) {
  w.w = restored(w.w);
}
function finishQ(w: World, k: number) {
  assert.ok(qj(w.w, k).start >= 0);
  advance(w, layTicks(w.w, k));
  assert.equal(qj(w.w, k).completion, 1);
}

test('forge refuses logs before the path, lights at exactly 56 and pours conserved rails to its rack', () => {
  const s = createRailway();
  railSession(s, 'a', 1);
  apply(s, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  const early = { w: s, t: 40 };
  chop(early, 'a');
  assert.equal(act(early, 'a', 'rail.deposit', { station: 'F', n: 4 }), 0, 'no forge before T3');
  const w = pathOpen();
  logs(w, 'a', 'F', 24);
  restoreIn(w);
  assert.equal(forge(w.w).lit, -1);
  logs(w, 'b', 'F', 31);
  assert.equal(forge(w.w).lit, -1);
  chop(w, 'a');
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'F', n: 8 }), 1, 'clipped at the bill');
  assert.equal(forge(w.w).lit, w.t);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'F', n: 1 }), 0);
  advance(w, LINE2_FORGE.pourTicks * 3);
  assert.equal(forge(w.w).rack, 3);
  advance(w, LINE2_FORGE.pourTicks * 100);
  assert.equal(forge(w.w).rack, LINE2_FORGE.rackMax, 'pours only to the rack');
  restoreIn(w);
  assert.equal(railCounts(w.w).rails.total, railCounts(w.w).rails.poured);
  assert.equal(railCounts(w.w).total, 3910 + railCounts(w.w).produced);
});

test('Q1-Q3 fund atomically from logs and rails; depot, hook and lever follow accepted completions only', () => {
  const w = pathOpen();
  logs(w, 'a', 'F', 56);
  assert.equal(line2Active(w.w), 0);
  chop(w, 'b');
  assert.equal(act(w, 'b', 'rail.deposit', { station: 'Q1', n: 2 }), 0, 'machine still on the turntable');
  advance(w, LINE2_FORGE.turnTicks);
  assert.equal(act(w, 'b', 'rail.deposit', { station: 'Q2', n: 2 }), 0, 'only the active frame takes');
  logs(w, 'b', 'Q1', 16);
  assert.equal(qj(w.w, 0).start, -1, 'logs alone never fund');
  rails(w, 'a', 'Q1', 6);
  assert.ok(qj(w.w, 0).start >= 0);
  assert.equal(cart(w.w).phase, CART_PHASE.REST, 'no depot cart before Q1 completes');
  assert.equal(rail(w.w).depotProduced, 0);
  restoreIn(w);
  // Lever and hook do nothing before their stretches, even when the request reaches the authority.
  assert.equal(act(w, 'a', 'rail.lever'), 0);
  assert.equal(act(w, 'a', 'rail.hook'), 0);
  finishQ(w, 0);
  assert.equal(line2Active(w.w), 1);
  const leftover = account(w.w, 'a')!.carry;
  if (leftover) assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q2', n: leftover }), leftover);
  const r = account(w.w, 'a')!.rails;
  if (r) assert.equal(act(w, 'a', 'rail.drop', { x: 94900, y: 2000, z: 3000, n: r, kind: 2 }), r);
  untilUnload(w, 1);
  assert.equal(rail(w.w).depot, 24 - leftover, 'one load brings what the frame still needs');
  assert.equal(act(w, 'a', 'rail.depotTake'), 8);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q2', n: 8 }), 8);
  logs(w, 'a', 'Q2', 16 - leftover);
  const produced = rail(w.w).depotProduced;
  advance(w, cartCycleTicks(1) * 2);
  assert.equal(rail(w.w).depotProduced, produced, 'the depot mints nothing past what the frame still needs');
  rails(w, 'b', 'Q2', 12);
  restoreIn(w);
  finishQ(w, 1);
  assert.deepEqual(line2Routes(line2Completed(w.w)), { hook: true, quarry: false });
  assert.equal(act(w, 'a', 'rail.lever'), 0, 'drive uncoupled before Q3');
  assert.equal(act(w, 'a', 'rail.hook'), 1);
  assert.equal(act(w, 'b', 'rail.hook'), 0, 'one shared device');
  logs(w, 'a', 'Q3', 16);
  rails(w, 'b', 'Q3', 12);
  finishQ(w, 2);
  restoreIn(w);
  assert.equal(line2GateOpen(w.w), false, 'Q3 alone does not open the gate');
  assert.equal(act(w, 'a', 'rail.lever'), 1);
  assert.equal(act(w, 'b', 'rail.lever'), 0);
  assert.equal(line2GateOpen(w.w), true);
  assert.equal(line2Active(w.w), 3, 'Q4 behind the gate is next');
  const c = railCounts(w.w);
  assert.equal(c.rails.stations, 30);
  assert.equal(c.total, 3910 + c.produced);
  restoreIn(w);
});

test('rails share the back and loose piles; final-rail race funds once; abandoned rails return to the forge', () => {
  const w = pathOpen();
  logs(w, 'a', 'F', 56);
  advance(w, LINE2_FORGE.pourTicks * 30);
  logs(w, 'b', 'Q1', 16);
  for (const pid of ['a', 'b']) {
    const n = account(w.w, pid)!.carry;
    if (n)
      assert.equal(act(w, pid, 'rail.drop', { x: 92000 + (pid === 'a' ? 0 : 300), y: 1830, z: 1000, n, kind: 0 }), n);
  }
  assert.equal(act(w, 'a', 'rail.forgeTake'), 8);
  act(w, 'b', 'rail.chop', {
    id: RAILWAY_SOURCES[trees(w.w).findIndex((t) => t.left >= 5)]![0],
    yaw: 0,
    collapsed: false,
  });
  const before = account(w.w, 'b')!.carry;
  assert.ok(before > 0);
  assert.equal(act(w, 'b', 'rail.forgeTake'), 8 - before, 'one back for all materials');
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q1', n: 5, kind: 2 }), 5);
  assert.equal(act(w, 'b', 'rail.deposit', { station: 'Q1', n: 8 - before, kind: 2 }), 1, 'final rail clipped');
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q1', n: 1, kind: 2 }), 0);
  assert.equal(act(w, 'a', 'rail.drop', { x: 92600, y: 1830, z: 1000, n: 3, kind: 2 }), 3);
  let pile: { id: number; n: number } | undefined;
  w.w.each([Pile], (id, p) => {
    if (!pile && p.kind === 2) pile = { id, n: p.n };
  });
  assert.equal(pile!.n, 3);
  assert.ok(qj(w.w, 0).start >= 0);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'T3', n: 1, kind: 2 }), 0, 'rails never become logs');
  restoreIn(w);
  // The loose rails age out and return to the forge rack, never to the log rack.
  const logRack = rail(w.w).rack,
    forgeRack = forge(w.w).rack;
  railSupplyPulse(w.w, { marker: 1, grow: railGrowthMask([]), recover: [] });
  railSupplyPulse(w.w, { marker: 40, grow: railGrowthMask([]), recover: [pile!.id] });
  assert.equal(rail(w.w).rack, logRack);
  assert.equal(forge(w.w).rack, forgeRack + 3);
  assert.equal(invariant(w.w), null);
  // Offline catch-up finishes only the funded stretch.
  const rest = layTicks(w.w, 0) - qj(w.w, 0).elapsed;
  assert.equal(railResume(w.w, 100000, 7, w.t), rest);
  assert.equal(qj(w.w, 0).completion, 1);
  assert.equal(qj(w.w, 1).start, -1);
});

test('malformed line-two documents fail atomically', () => {
  const w = pathOpen();
  logs(w, 'a', 'F', 56);
  advance(w, 40);
  const good = w.w.snapshot();
  const was = hash(w.w);
  type Snap = typeof good;
  const col = (j: Snap, c: { kind: string; names: readonly string[] }, field: string) =>
    j.c[c.kind]![1 + c.names.indexOf(field)]!;
  const cases: [string, (j: Snap) => void][] = [
    ['lever before Q3', (j) => (col(j, Rail, 'lever')[0] = 1)],
    ['hook before Q2', (j) => (col(j, Rail, 'hook')[0] = 1)],
    ['glide before Q5', (j) => (col(j, Rail, 'glide')[0] = 1)],
    ['minted rail', (j) => (col(j, Forge, 'rack')[0] = forge(w.w).rack + 1)],
    ['unlit pour', (j) => (col(j, Forge, 'lit')[0] = -1)],
    [
      'funded without rails',
      (j) => {
        col(j, QJob, 'start')[0] = w.t;
        col(j, QJobRun, 'lastTick')[0] = w.t;
      },
    ],
    ['a fraction', (j) => (col(j, Forge, 'rack')[0] = 0.5)],
    ['an unknown component', (j) => (j.c.extra = [[]])],
    ['early depot', (j) => (col(j, Rail, 'depot')[0] = 8)],
    ['depot output over bill', (j) => (col(j, Rail, 'out1')[0] = 25)],
    ['shelf before its stretch', (j) => (col(j, Rail, 'depotRails')[0] = 2)],
    ['shelf output before its stretch', (j) => (col(j, Rail, 'shelfOut')[0] = 2)],
  ];
  for (const [name, change] of cases) {
    const j = JSON.parse(JSON.stringify(good)) as Snap;
    change(j);
    assert.throws(() => w.w.load(j, railwayCheck), Error, name);
    assert.equal(hash(w.w), was, name);
  }
  assert.equal(LINE2_STATIONS.length, 6);
});

function toQ2(): World {
  const w = pathOpen();
  logs(w, 'a', 'F', 56);
  advance(w, LINE2_FORGE.turnTicks);
  logs(w, 'b', 'Q1', 16);
  rails(w, 'a', 'Q1', 6);
  finishQ(w, 0);
  return w;
}

test('taking depot logs and dropping them elsewhere never makes the depot exceed its stretch bill', () => {
  const w = toQ2();
  for (const pid of ['a', 'b']) {
    for (const kind of [0, 2] as const) {
      const n = kind ? account(w.w, pid)!.rails : account(w.w, pid)!.carry;
      if (n) act(w, pid, 'rail.drop', { x: 95000 + kind * 100, y: 2000, z: 3000, n, kind });
    }
  }
  const before = railCounts(w.w).produced - rail(w.w)[DEPOT_OUT[1]]; // the cart's first load is minted already
  // Rounds of take-and-drop, one cart trip apart: a hoarder cannot make the cart mint past Q2's 24-log bill.
  for (let round = 0; round < 4; round++) {
    advance(w, cartCycleTicks(1));
    const n = act(w, 'a', 'rail.depotTake');
    if (n) assert.equal(act(w, 'a', 'rail.drop', { x: 96000 + round * 10, y: 2000, z: 3000, n }), n);
  }
  assert.equal(rail(w.w)[DEPOT_OUT[1]], 24);
  assert.equal(railCounts(w.w).produced - before, 24);
  assert.equal(rail(w.w).depot, 0);
  restoreIn(w);
  assert.equal(railCounts(w.w).total, 3910 + railCounts(w.w).produced);
});

test('a peer resuming mid-Q2 after a restart matches one that never went offline', () => {
  const live = toQ2();
  logs(live, 'a', 'Q2', 24);
  rails(live, 'b', 'Q2', 12);
  assert.ok(qj(live.w, 1).start >= 0);
  advance(live, 20);
  // The host restarts from the saved document; the stretch catches up once for the time it was down.
  const world = createRailwayWorld({ audit: true });
  world.load(JSON.parse(JSON.stringify(live.w.snapshot())), railwayCheck);
  const restarted = world;
  assert.equal(hash(restarted), hash(live.w));
  const gap = 40;
  // A restarted room's clock resumes from its saved tick: downtime arrives only as the bounded resume.
  assert.equal(railResume(restarted, gap, 11, live.t), gap);
  assert.equal(railResume(restarted, gap, 11, live.t), 0, 'a repeated marker never resumes twice');
  // The peer that stayed online ticked through the same span (the forge pours only while ticking).
  advance(live, gap);
  const a = qj(restarted, 1),
    b = qj(live.w, 1);
  for (const key of ['elapsed', 'used', 'allocation', 'railUsed', 'railAllocation', 'completion'] as const)
    assert.equal(a[key], b[key], key);
  assert.equal(invariant(restarted), null);
  // Finishing offline completes Q2 once and never funds Q3.
  const rest = layTicks(restarted, 1) - a.elapsed;
  assert.equal(railResume(restarted, 100000, 12, live.t + 1), rest);
  assert.equal(qj(restarted, 1).completion, 1);
  assert.equal(qj(restarted, 2).start, -1);
  assert.equal(invariant(restarted), null);
});

test('the away credit fills the forge rack and the depot cart once, never past the rack or the stretch bill', () => {
  const w = toQ2();
  const k = line2Active(w.w);
  assert.equal(k, 1, 'Q2 takes materials: the depot runs');
  // The cart set out with Q2's first load as Q1 was laid: it lands in the credit, then the trips' loads.
  const before = {
    rack: forge(w.w).rack,
    poured: forge(w.w).poured,
    depot: rail(w.w).depot + cart(w.w).logs,
    out: rail(w.w)[DEPOT_OUT[k]!],
  };
  const produced = railCounts(w.w).produced;
  const stock = qj(w.w, k).stock;
  // One cart trip of production: one load, and the rack as far as that many pours reach.
  const yard = cartCycleTicks(k);
  assert.equal(railResume(w.w, 0, 20, w.t, yard), 0, 'no funded job to advance');
  const pours = Math.min(LINE2_FORGE.rackMax - before.rack, Math.floor(yard / LINE2_FORGE.pourTicks));
  assert.equal(forge(w.w).rack, before.rack + pours);
  assert.equal(forge(w.w).poured, before.poured + pours, 'every poured rail is counted');
  const bill = LINE2_STATIONS[k]!.bill[0];
  const need = Math.min(bill - stock - before.depot, bill - before.out);
  assert.equal(rail(w.w).depot, before.depot + Math.min(need, CART.load));
  assert.equal(cart(w.w).logs, 0, 'the load under way landed');
  assert.equal(
    railCounts(w.w).produced,
    produced + (rail(w.w).depot - before.depot),
    'depot logs are counted production',
  );
  assert.equal(invariant(w.w), null);
  // The same marker never credits twice; a long absence fills the yards to their limits, no further.
  const was = hash(w.w);
  assert.equal(railResume(w.w, 0, 20, w.t, 1000000), 0);
  assert.equal(hash(w.w), was, 'a repeated marker credits nothing');
  railResume(w.w, 0, 21, w.t, 1000000);
  assert.equal(forge(w.w).rack, LINE2_FORGE.rackMax, 'the rack caps the forge');
  assert.equal(
    Math.min(bill - stock - rail(w.w).depot, bill - rail(w.w)[DEPOT_OUT[k]!]),
    0,
    'the depot fills what the stretch needs',
  );
  assert.ok(rail(w.w)[DEPOT_OUT[k]!] <= bill, 'and no more');
  assert.equal(invariant(w.w), null);
  restoreIn(w);
});

/** Chop until pid's back holds n (or its back is full). */
function chopTo(w: World, pid: string, n: number) {
  const load = () => {
    const a = account(w.w, pid)!;
    return a.carry + a.stone + a.rails;
  };
  for (let guard = 0; load() < n && guard < 40; guard++) {
    const k = trees(w.w).findIndex((t) => t.left > 0);
    if (!act(w, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false })) break;
  }
  return load();
}
const railsHeld = (w: World) => {
  const c = railCounts(w.w).rails;
  assert.equal(c.total, c.poured, 'every rail is one the forge poured');
  return c;
};

test('the pack: no chest before the forge bill, one pack for two openers, every back 16 through load and late join', () => {
  const w = pathOpen();
  assert.equal(act(w, 'a', 'rail.pack'), 0, 'no chest before the forge has a log');
  logs(w, 'a', 'F', 16);
  assert.equal(act(w, 'a', 'rail.pack'), 0, 'no chest before the 24-log bill');
  // A save claiming the pack before the bill does not load.
  const early = JSON.parse(JSON.stringify(w.w.snapshot())) as ReturnType<Rows['snapshot']>;
  early.c[Rail.kind]![1 + Rail.names.indexOf('pack')]![0] = 1;
  assert.throws(() => w.w.load(early, railwayCheck), /pack before the forge bill/);
  logs(w, 'a', 'F', 8);
  assert.equal(forge(w.w).used, LINE2_FORGE.bills[0]);
  assert.equal(railCarryMax(w.w), RAILWAY_T1.carry);
  assert.equal(chopTo(w, 'b', 99), RAILWAY_T1.carry, 'eight on a back before the pack');
  assert.equal(act(w, 'a', 'rail.pack'), 1);
  assert.equal(act(w, 'b', 'rail.pack'), 0, 'one pack for two openers');
  assert.equal(railCarryMax(w.w), LINE2_PACK.carry);
  assert.equal(chopTo(w, 'b', 99), LINE2_PACK.carry, 'and sixteen with it, for the one who did not open it');
  assert.equal(chopTo(w, 'b', 99), LINE2_PACK.carry, 'never more');
  // Sixteen on a back survives a save and load, and a player who joins later carries sixteen too.
  restoreIn(w);
  assert.equal(rail(w.w).pack, true);
  assert.equal(account(w.w, 'b')!.carry, 16);
  railSession(w.w, 'c', 1);
  assert.equal(chopTo(w, 'c', 99), LINE2_PACK.carry, 'a late joiner carries sixteen');
  assert.equal(act(w, 'b', 'rail.deposit', { station: 'F', n: 16 }), 16, 'a whole back unloads at once');
  assert.equal(railCounts(w.w).total, 3910 + railCounts(w.w).produced);
});

test('Q4: behind the quarry gate; its cart brings logs and moves rails off the forge rack, never minting one', () => {
  const w = railwayAtQ4();
  assert.equal(line2Active(w.w), 3);
  assert.equal(line2GateOpen(w.w), false);
  chopTo(w, 'a', 4);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q4', n: 1 }), 1, 'the gate is up: the frame stocks logs');
  // The cart runs behind the gate: one load of logs (minted, counted) and one of rails (moved, not made).
  const poured = railsHeld(w).poured,
    rack = forge(w.w).rack;
  // Q2's first load was still on its way when Q2 and Q3 were filled by hand: it goes on to Q4's rack, the logs Q4
  // needs, and the next trip stops at the forge for the rails.
  const aboard = cart(w.w).logs;
  untilUnload(w, 3, () => rail(w.w).depotRails > 0);
  assert.equal(rail(w.w).depot, aboard, 'the load under way went on to the next rack');
  assert.equal(rail(w.w)[DEPOT_OUT[3]], 0, 'Q4 needed no logs minted');
  assert.equal(rail(w.w).depotRails, LINE2_STATIONS[3]!.bill[1], 'the cart holds all of the rails Q4 needs');
  const pours = railsHeld(w).poured - poured;
  assert.equal(forge(w.w).rack, rack + pours - LINE2_STATIONS[3]!.bill[1], 'the shelf rails left the forge rack');
  restoreIn(w);
  assert.equal(act(w, 'a', 'rail.lever'), 1);
  assert.equal(line2GateOpen(w.w), true);
  // Taking from the shelf: the back's room clips it.
  const room = RAILWAY_T1.carry - account(w.w, 'a')!.carry;
  assert.equal(act(w, 'a', 'rail.depotRailTake'), room);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q4', n: 3 }), 3, 'logs go in with the gate down');
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q4', n: room, kind: 2 }), room);
  assert.equal(act(w, 'b', 'rail.depotRailTake'), RAILWAY_T1.carry, 'a full back of rails, no more');
  advance(w, cartCycleTicks(3));
  assert.equal(rail(w.w).depotRails, LINE2_STATIONS[3]!.bill[1] - room - 8, 'rails on backs are not brought again');
  assert.equal(act(w, 'b', 'rail.deposit', { station: 'Q4', n: 8, kind: 2 }), 8);
  railsHeld(w);
  // Rails carried from the forge by hand fill the bill first, so the shelf's rest is left over when Q4 funds: it goes
  // back to the forge rack, in that one deposit. Meanwhile the cart owes the shelf nothing more.
  rails(w, 'b', 'Q4', 16 - qj(w.w, 3).railStock);
  assert.equal(qj(w.w, 3).railStock, 16);
  const shelfLeft = rail(w.w).depotRails;
  assert.ok(shelfLeft > 0, 'shelf rails are left over');
  advance(w, cartCycleTicks(3));
  assert.equal(rail(w.w).depotRails, shelfLeft, 'no more rails come to a stretch whose rails are in');
  const leftover = rail(w.w).depotRails,
    before = forge(w.w).rack;
  logs(w, 'a', 'Q4', 16 - qj(w.w, 3).stock);
  assert.ok(qj(w.w, 3).start >= 0, 'Q4 funded');
  assert.equal(rail(w.w).depotRails, 0, 'the shelf is empty once its stretch funds');
  assert.equal(forge(w.w).rack, before + leftover, 'and its rails are back on the forge rack');
  railsHeld(w);
  restoreIn(w);
  finishQ(w, 3);
  assert.equal(line2Completed(w.w), 4);
  assert.equal(line2Active(w.w), 4);
  assert.equal(act(w, 'a', 'rail.depotRailTake'), 0, 'an empty shelf gives nothing');
  const c = railsHeld(w);
  assert.equal(c.stations, 6 + 12 + 12 + 16);
  assert.equal(railCounts(w.w).total, 3910 + railCounts(w.w).produced);
  restoreIn(w);
});

test('the early sea switch opens once and reloads while Q5 still refuses both materials until Q4', () => {
  const early = railwayAtQ4();
  assert.equal(line2Completed(early.w), 3);
  assert.equal(act(early, 'a', 'rail.seaSwitch'), 1);
  assert.equal(act(early, 'b', 'rail.seaSwitch'), 0, 'the first pull is the only accepted pull');
  assert.equal(line2SeaOpen(early.w), true);
  restoreIn(early);
  assert.equal(line2SeaOpen(early.w), true, 'the relaxed sea invariant accepts the early-open save');
  assert.equal(line2Active(early.w), 3);
  chop(early, 'a');
  assert.ok(act(early, 'b', 'rail.forgeTake') > 0);
  const before = [account(early.w, 'a')!.carry, account(early.w, 'b')!.rails];
  assert.equal(act(early, 'a', 'rail.deposit', { station: 'Q5', n: 8, kind: 0 }), 0);
  assert.equal(act(early, 'b', 'rail.deposit', { station: 'Q5', n: 8, kind: 2 }), 0);
  assert.deepEqual([account(early.w, 'a')!.carry, account(early.w, 'b')!.rails], before);
  const q5 = qj(early.w, 4);
  assert.deepEqual([q5.stock, q5.railStock, q5.start], [0, 0, -1]);
  assert.equal(act(early, 'a', 'rail.lever'), 1);
  logs(early, 'a', 'Q4', 16);
  rails(early, 'b', 'Q4', 16);
  finishQ(early, 3);
  assert.equal(line2Active(early.w), 4);
  chop(early, 'a');
  assert.equal(act(early, 'a', 'rail.deposit', { station: 'Q5', n: 1, kind: 0 }), 1, 'Q5 starts taking only after Q4');
});

test('Q5: behind the sea gate; one cart trip brings all 24 of its rails, never minted', () => {
  const w = railwayAtQ5('q4-done');
  assert.equal(line2Active(w.w), 4);
  assert.equal(line2SeaOpen(w.w), false);
  assert.equal(line2GateDown(w.w, 4), false);
  // The cart serves the frame even with the sea gate up, and one shipment carries the whole rail bill.
  untilUnload(w, 4, () => rail(w.w).depotRails === 24);
  assert.equal(rail(w.w).depot, 24);
  assert.ok(rail(w.w)[DEPOT_OUT[4]] <= 24);
  assert.equal(rail(w.w).shelfOut, 24);
  railsHeld(w);
  const move = (pid: string, op: string, fields: Partial<RailAction> = {}) => {
    const n = act(w, pid, op, fields);
    railsHeld(w);
    return n;
  };
  assert.equal(move('a', 'rail.depotTake'), 8);
  assert.equal(move('a', 'rail.deposit', { station: 'Q5', n: 8 }), 8, 'cart logs stock behind the gate');
  assert.equal(move('a', 'rail.seaSwitch'), 1);
  assert.equal(move('b', 'rail.seaSwitch'), 0);
  assert.equal(line2SeaOpen(w.w), true);
  assert.equal(line2GateDown(w.w, 4), true);
  assert.equal(move('a', 'rail.deposit', { station: 'Q5', n: 8 }), 0, 'the back is already empty');
  // Eight rails stocked by hand from the forge first, so the shelf's last eight are left over when Q5 funds.
  assert.equal(move('b', 'rail.forgeTake'), 8);
  assert.equal(move('b', 'rail.deposit', { station: 'Q5', kind: 2, n: 8 }), 8);
  for (const pid of ['a', 'b']) {
    assert.equal(move(pid, 'rail.depotRailTake'), 8);
    assert.equal(move(pid, 'rail.deposit', { station: 'Q5', kind: 2, n: 8 }), 8);
  }
  restoreIn(w);
  advance(w, cartCycleTicks(4));
  assert.equal(cart(w.w).phase, CART_PHASE.REST, 'no second trip: the rails are in and the logs are on the rack');
  assert.equal(rail(w.w).shelfOut, 24);
  assert.equal(rail(w.w).depotRails, 8);
  assert.equal(rail(w.w).depot, 16, 'no more logs than the bill');
  railsHeld(w);
  for (let i = 0; i < 2; i++) {
    const before = forge(w.w).rack;
    assert.equal(move('a', 'rail.depotTake'), 8);
    assert.equal(move('a', 'rail.deposit', { station: 'Q5', n: 8 }), 8);
    if (i === 1) assert.equal(forge(w.w).rack, before + 8, 'the shelf leftovers return to the forge');
  }
  const start = qj(w.w, 4).start;
  assert.ok(start >= 0);
  assert.equal(rail(w.w).depotRails, 0);
  assert.equal(rail(w.w).shelfOut, 0);
  assert.equal(move('a', 'rail.deposit', { station: 'Q5', n: 1 }), 0);
  assert.equal(qj(w.w, 4).start, start, 'funded once');
  restoreIn(w);
  finishQ(w, 4);
  assert.equal(line2Completed(w.w), 5);
  assert.equal(line2Active(w.w), 5);
  advance(w, cartCycleTicks(4));
  assert.equal(cart(w.w).phase, CART_PHASE.REST, 'the cart never serves Q6');
  assert.equal(railsHeld(w).stations, 6 + 12 + 12 + 16 + 24);
  restoreIn(w);
});

for (const k of [3, 4]) {
  test(`Q${k + 1}: stocked behind its gate survives load; only the pull funds once`, () => {
    const w = k === 3 ? railwayAtQ4() : railwayAtQ5('q4-done');
    const spec = LINE2_STATIONS[k]!;
    logs(w, 'a', spec.id, 1);
    rails(w, 'b', spec.id, 1);
    restoreIn(w); // A gated, partly stocked save is valid without a shape/version change.
    logs(w, 'a', spec.id, spec.bill[0] - 1);
    rails(w, 'b', spec.id, spec.bill[1] - 1);
    assert.equal(line2CartStatus(w.w), 'off', 'a full bill no longer says More coming');
    advance(w, 1000);
    restoreIn(w);
    const j = () => qj(w.w, k);
    assert.equal(j().stock, spec.bill[0]);
    assert.equal(j().railStock, spec.bill[1]);
    assert.equal(j().start, -1);
    assert.equal(j().elapsed, 0);
    assert.equal(j().allocation + j().railAllocation, 0);
    const pull = k === 3 ? 'rail.lever' : 'rail.seaSwitch';
    assert.equal(act(w, 'a', pull), 1);
    assert.equal(j().start, w.t);
    assert.equal(j().stock + j().railStock, 0);
    assert.equal(j().allocation, spec.bill[0]);
    assert.equal(j().railAllocation, spec.bill[1]);
    assert.equal(act(w, 'b', pull), 0);
    restoreIn(w);
    finishQ(w, k);
    railsHeld(w);
    assert.equal(railCounts(w.w).total, 3910 + railCounts(w.w).produced);
  });
}

test("the away credit runs Q5's cart too: rails move from the forge, logs stop at the bill", () => {
  const w = railwayAtQ5('q4-done');
  railResume(w.w, 0, 40, w.t, 1000000);
  assert.equal(rail(w.w).depot, 24);
  assert.equal(rail(w.w).depotRails, 24, 'away credit runs one shipment: the whole rail bill');
  assert.ok(rail(w.w)[DEPOT_OUT[4]] <= 24);
  railsHeld(w);
  const was = hash(w.w);
  railResume(w.w, 0, 40, w.t, 1000000);
  assert.equal(hash(w.w), was, 'once per marker');
  restoreIn(w);
});

test("the away credit runs Q4's cart too: shelf rails come off the poured rack, logs up to the bill", () => {
  const w = railwayAtQ4();
  const produced = railCounts(w.w).produced;
  railResume(w.w, 0, 30, w.t, 1000000);
  assert.equal(rail(w.w).depot, 24, "the load under way (Q2's) covers the logs the stretch needs");
  assert.equal(rail(w.w).depotRails, 16, 'and its rails, moved from the forge');
  assert.equal(railCounts(w.w).produced, produced, 'nothing minted: rails are moved, not made');
  railsHeld(w);
  const was = hash(w.w);
  railResume(w.w, 0, 30, w.t, 1000000);
  assert.equal(hash(w.w), was, 'once per marker');
  restoreIn(w);
  assert.equal(invariant(w.w), null);
});

test('the glider: sealed until Q5, one shared take after, kept through load; it opens no Works step early', () => {
  const w = railwayAtQ5('q5-finishing');
  assert.equal(act(w, 'a', 'rail.glide'), 0, 'sealed while Q5 is still laying');
  assert.equal(rail(w.w).glide, false);
  finishQ(w, 4);
  assert.equal(line2Completed(w.w), 5);
  assert.equal(act(w, 'a', 'rail.glide'), 1);
  assert.equal(act(w, 'b', 'rail.glide'), 0, 'one shared take: a second is a noop');
  assert.equal(rail(w.w).glide, true);
  restoreIn(w);
  assert.equal(rail(w.w).glide, true, 'kept through load');
  // Reaching places early is fine; funding or opening a Works step early is not (route-contract rec 1).
  for (const id of [0, 1]) assert.equal(act(w, 'a', 'rail.strike', { id }), 0, `seam ${id}`);
  assert.equal(act(w, 'a', 'rail.kiln'), 0);
  assert.equal(act(w, 'a', 'rail.footTake', { rack: 0 }), 0);
  // A document with the glider before Q5 is refused whole.
  const early = railwayAtQ5('q4-done');
  const was = hash(early.w);
  const snap = early.w.snapshot();
  snap.c[Rail.kind]![1 + Rail.names.indexOf('glide')]![0] = 1;
  assert.throws(() => early.w.load(snap, railwayCheck), /railway: glide before Q5/);
  assert.equal(hash(early.w), was);
});
