import test from 'node:test';
import assert from 'node:assert/strict';
import { Train } from '../src/sim/railway-components.ts';
import { RAIL_LINES, RAIL_TRAINS, trainPassesBy } from '../src/sim/railway-lines.ts';
import { LOGS, roomOf, stopsOf } from '../src/sim/railway-queries.ts';
import { legRow, routeRow } from '../src/sim/railway-queries-route.ts';
import { RAIL_GATES, RAIL_GRANTS, RAIL_LEGS, ROW_LINE } from '../src/sim/railway-route.ts';
import { account, train } from '../src/sim/railway-rows.ts';
import { laySection } from '../src/sim/railway-seed-legs.ts';
import { railLegKitRelease } from '../src/sim/railway-sys-route-kit.ts';
import { LINE_SLOTS, servingSlots } from '../src/sim/railway-trains.ts';
import { act, advance, buildSeedWorld, invariant, restore, unaudited, type Seed } from './helpers/rail.ts';

const cave = ROW_LINE.cave,
  k = RAIL_LEGS.findIndex((l) => l.id === 'cave'),
  leg = RAIL_LEGS[k]!;
const plug = RAIL_GATES.findIndex((g) => g.id === 'plug'),
  pick = RAIL_GATES[plug]!.needs;
const cloth = RAIL_GRANTS.findIndex((g) => g.id === 'cloth');
const open = buildSeedWorld('cave-open'),
  mid = buildSeedWorld('cave-mid'),
  port = buildSeedWorld('port-reached');

function ledger(s: Seed) {
  const r = legRow(s.w, k),
    rack = legRow(s.w, 5);
  for (const [kind, held, depot, loaded] of [
    ['logs', 'heldLogs', 'rackLogs', 'loadedLogs'],
    ['rails', 'heldRails', 'rackRails', 'loadedRails'],
  ] as const) {
    const laid = leg.sections.slice(0, r.laid).reduce((n, sec) => n + sec[kind], 0);
    const aboard = LINE_SLOTS[cave]!.reduce((n, j) => n + train(s.w, j)[kind], 0);
    // At Port Quay the same trains and rack begin carrying the next leg's first kit.
    assert.equal(r[loaded] + legRow(s.w, 5)[loaded], laid + r[kind] + aboard + r[depot] + rack[depot] + r[held], kind);
  }
  assert.equal(invariant(s.w), null);
}
test('the plug needs the pick and the bay cut laid, and the stocked first frame waits for the plug', () => {
  assert.equal(RAIL_GRANTS[pick]!.id, 'pick');
  for (const [stage, held] of [
    ['gorge-reached', false],
    ['bay-mid', true],
  ] as const) {
    const s = buildSeedWorld(stage);
    assert.equal(!!(routeRow(s.w).grants & (1 << pick)), held);
    assert.equal(act(s, 'a', 'rail.gate', { id: plug }), 0);
  }
  const s = unaudited(buildSeedWorld('bay-reached'));
  advance(s, 350);
  assert.deepEqual(
    [legRow(s.w, k).rackLogs, legRow(s.w, k).rackRails, legRow(s.w, k).loadedLogs, legRow(s.w, k).loadedRails],
    [20, 20, 20, 20],
  );
  const expected = Math.min(20, roomOf(s.w, account(s.w, 'a')!, LOGS));
  const taken = act(s, 'a', 'rail.depotTake', { leg: k });
  assert.equal(taken, expected);
  assert.equal(taken, account(s.w, 'a')!.legLogs);
  assert.ok(taken > 0);
  assert.equal(act(s, 'a', 'rail.legStock', { leg: k }), 0);
  ledger(s);
  assert.equal(act(s, 'a', 'rail.gate', { id: plug }), 1);
  assert.equal(act(s, 'a', 'rail.legStock', { leg: k }), taken);
  ledger(s);
});

test('the room can feed across the fork, finish the cave first, then release the Wall', () => {
  const s = unaudited(buildSeedWorld('canopy-open'));
  assert.equal(act(s, 'b', 'rail.gate', { id: plug }), 1);
  const rack = (leg: number) => legRow(s.w, leg).rackLogs;
  assert.deepEqual([rack(3), rack(k)], [20, 20]);
  const n = act(s, 'a', 'rail.depotTake', { leg: 3 });
  assert.ok(n > 0);
  assert.deepEqual([rack(3), rack(k), account(s.w,'a')!.liftLeg], [20-n,20,3]);
  assert.equal(act(s, 'a', 'rail.legStock', {leg:k}), n);
  assert.deepEqual([legRow(s.w,3).heldLogs, rack(k), legRow(s.w,k).logs], [0,20,n]);
  while (legRow(s.w,k).laid < leg.sections.length) laySection(s,k);
  assert.equal(legRow(s.w,5).loadedLogs, 0);
  assert.equal(act(s,'b','rail.legStock',{leg:5}),0);
  while (legRow(s.w,3).laid < RAIL_LEGS[3]!.sections.length) laySection(s,3);
  laySection(s,5);
  assert.equal(invariant(s.w),null);
});

test('two lifted kits survive a save and releasing one back only changes its own leg', () => {
  const s = unaudited(buildSeedWorld('cave-first-open'));
  const canopyTake = act(s, 'a', 'rail.depotTake', { leg: 3 });
  const caveTake = act(s, 'b', 'rail.depotRailTake', { leg: k });
  assert.ok(canopyTake > 0 && caveTake > 0);
  const w = restore(s.w);
  assert.deepEqual([account(w, 'a')!.liftLeg, account(w, 'b')!.liftLeg], [3, k]);
  assert.deepEqual([legRow(w, 3).heldLogs, legRow(w, k).heldRails], [canopyTake, caveTake]);
  assert.equal(railLegKitRelease(w, 'a', account(w, 'a')!.epoch), canopyTake);
  assert.deepEqual([legRow(w, 3).heldLogs, legRow(w, k).heldRails], [0, caveTake]);
  assert.deepEqual([account(w, 'b')!.legRails, account(w, 'b')!.liftLeg], [caveTake, k]);
  assert.equal(invariant(w), null);
});

test('the cave fleet carries each kit forward, keeps Saltpan open and closes the sea head at the quay', () => {
  assert.deepEqual(
    RAIL_LINES[cave]!.halts.map((h) => h.name),
    [
      'West landing',
      'Cave head 1',
      'Saltpan Halt',
      'Port Quay',
      'Wall head 1',
      'Wall head 2',
      'Canopy Town',
      'Wall head 4',
      'Wall head 5',
      'High Gorge',
    ],
  );
  assert.deepEqual(LINE_SLOTS[cave], [12, 13, 14, 15, 16]);
  assert.ok(LINE_SLOTS[cave]!.every((slot) => RAIL_TRAINS[slot]!.shed));
  assert.equal(routeRow(open.w).grants & (1 << cloth), 1 << cloth);
  assert.equal(routeRow(open.w).gates & (1 << plug), 1 << plug);
  assert.deepEqual(
    [legRow(open.w, k).rackLogs, legRow(open.w, k).rackRails, legRow(open.w, k).logs, legRow(open.w, k).rails],
    [20, 20, 0, 0],
  );
  const s = unaudited(mid);
  assert.deepEqual(
    LINE_SLOTS[cave]!.map((j) => [train(s.w, j).logs, train(s.w, j).rails]),
    [
      [20, 20],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ],
  );
  for (let i = 0; legRow(s.w, k).rackLogs !== 20 || legRow(s.w, k).rackRails !== 20; i++) {
    assert.ok(i < 4000, 'second kit delivered to the sea head');
    advance(s, 1);
  }
  ledger(s);
  laySection(s, k);
  // A newly eligible shed train joins once its departure path clears.
  for (let i = 0; servingSlots((j) => train(s.w, j), cave).length < 2; i++) {
    assert.ok(i < 2000, 'second cave train joined at Saltpan');
    advance(s, 1);
  }
  for (const [laid, state] of [open, mid, s, port].entries()) {
    assert.equal(legRow(state.w, k).laid, laid);
    ledger(state);
    const stops = stopsOf(state.w, cave);
    assert.deepEqual(
      stops,
      RAIL_LINES[cave]!.halts.slice(0, [0, 2, 3, 4][laid]).map((h) => h.s),
    );
    assert.equal(servingSlots((j) => train(state.w, j), cave).length, [0, 1, 2, 2][laid]);
    for (const dir of [-1, 1]) {
      assert.equal(trainPassesBy(cave, 1, dir, stops.length), laid === 3);
      assert.equal(trainPassesBy(cave, 2, dir, stops.length), false);
    }
  }
  assert.deepEqual([legRow(port.w, k).loadedLogs, legRow(port.w, k).loadedRails], [60, 60]);
  const broken = unaudited(port);
  for (const row of [4, 5]) {
    broken.w.mut(Train, broken.w.lookup(Train, 12)!)!.boiler = row;
    assert.match(invariant(broken.w) ?? '', /boiler/);
  }
});
