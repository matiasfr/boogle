import test from 'node:test';
import assert from 'node:assert/strict';
import { LEG_TUNE, RAIL_GATES, RAIL_LEGS } from '../src/sim/railway-route.ts';
import { legsLaid, legRow, routeRow, STOCKED_LEGS } from '../src/sim/railway-queries-route.ts';
import { stopsOf } from '../src/sim/railway-queries.ts';
import { RAIL_HALTS, RAIL_LINES, trainPassesBy } from '../src/sim/railway-lines.ts';
import { fleetOf, TRAIN_PHASE, reqHas, trainRequestable } from '../src/sim/railway-train.ts';
import { LINE_SLOTS } from '../src/sim/railway-trains.ts';
import { rail, train } from '../src/sim/railway-rows.ts';
import { Route } from '../src/sim/railway-components.ts';
import { laySection } from '../src/sim/railway-seed-legs.ts';
import { legRailheadHold } from '../src/sim/railway-sys-route-kit.ts';
import { act, advance, buildSeedWorld, invariant, unaudited } from './helpers/rail.ts';
import { routeRulesShard } from './helpers/railway-route-rules.ts';

routeRulesShard(4);
test('cave trains relay six Wall kits through the prefix of open halts', () => {
  const k = 5,
    wall = RAIL_LEGS[k]!,
    line = wall.line,
    slots = LINE_SLOTS[line]!;
  const id = RAIL_GATES.findIndex((g) => g.id === 'deep-span'),
    op = { id };
  const s = unaudited(buildSeedWorld('canopy-reached'));
  assert.equal(act(s, 'a', 'rail.gate', op), 0);
  const port = unaudited(buildSeedWorld('cave-mid'));
  laySection(port, 4);
  laySection(port, 4);
  assert.ok(!STOCKED_LEGS.includes(k));
  const aboard = () => slots.reduce((sum, j) => sum + train(port.w, j).logs, 0);
  for (let wait = 0; aboard() === 0; wait++) {
    assert.ok(wait < 8000);
    advance(port, 1);
  }
  assert.equal(aboard(), 20);
  assert.deepEqual([legRow(port.w, k).rackLogs, legRow(port.w, k).rackRails], [0, 0]);
  for (let wait = 0; legRow(port.w, k).rackLogs === 0; wait++) {
    assert.ok(wait < 8000);
    advance(port, 1);
  }
  assert.deepEqual([legRow(port.w, k).rackLogs, legRow(port.w, k).rackRails], [20, 20]);
  for (let laid = 0; laid <= 6; laid++) {
    const { w } = port,
      r = legRow(w, k),
      stops = stopsOf(w, line);
    assert.equal(r.laid, laid);
    assert.deepEqual(
      stops,
      RAIL_LINES[line]!.halts.slice(0, 4 + laid).map((h) => h.s),
    );
    assert.equal(fleetOf(line, legsLaid(w), stops), [2, 2, 3, 3, 4, 4, 5][laid]);
    for (let head = 1; head <= Math.min(5, laid); head++)
      for (const dir of [-1, 1])
        assert.equal(trainPassesBy(line, head + 3, dir, stops.length), [1, 2, 4].includes(head) && laid >= head + 2);
    for (const [kind, loaded, depot, held] of [
      ['logs', 'loadedLogs', 'depot', 'heldLogs'],
      ['rails', 'loadedRails', 'depotRails', 'heldRails'],
    ] as const)
      assert.equal(
        r[loaded],
        20 * laid + r[kind] + r[held] + rail(w)[depot] + slots.reduce((n, j) => n + train(w, j)[kind], 0),
      );
    assert.equal(invariant(w), null);
    if (laid === 6) break;
    if (laid < 5) assert.equal(act(port, 'a', 'rail.gate', op), 0);
    else {
      const withoutSeeds = unaudited(port);
      const room = withoutSeeds.w.mut(Route, withoutSeeds.w.single(Route))!;
      room.grants &= ~(1 << RAIL_GATES[id]!.needs);
      // The earlier Canopy barrier used the same seeds. Keep the negative fixture's grant/gate bits consistent.
      room.gates &= ~(1 << RAIL_GATES.findIndex((g) => g.id === 'canopy'));
      assert.equal(act(withoutSeeds, 'a', 'rail.gate', op), 0);
      for (let i = 0; legRow(w, k).rackLogs === 0; i++) {
        assert.ok(i < 8000);
        advance(port, 1);
      }
      assert.ok(act(port, 'a', 'rail.depotTake', { leg: k }) > 0);
      assert.equal(act(port, 'a', 'rail.legStock', { leg: k }), 0);
      assert.equal(act(port, 'a', 'rail.gate', op), 1);
      assert.ok(act(port, 'a', 'rail.legStock', { leg: k }) > 0);
    }
    laySection(port, k);
  }
  assert.ok(routeRow(port.w).gates & (1 << id));
});

test('a Kit 6 rider keeps their accepted homeward stop when Wall 5 finishes', () => {
  const wall = 5,
    line = RAIL_LEGS[wall]!.line,
    s = unaudited(buildSeedWorld('wall-mid'));
  while (legRow(s.w, wall).laid < 4) laySection(s, wall);
  const stops = stopsOf(s.w, line);
  for (let i = 0; rail(s.w).depot === 0; i++) {
    assert.ok(i < 8000, 'Wall 5 kit reaches the rack');
    advance(s, 1);
  }
  assert.ok(act(s, 'a', 'rail.depotTake') > 0);
  assert.ok(act(s, 'a', 'rail.legStock', { leg: wall }) > 0);
  for (let i = 0; i < 8000; i++) {
    const slot = LINE_SLOTS[line]!.find((j) => {
      const r = train(s.w, j);
      return r.phase === TRAIN_PHASE.STAND && r.at === stops.length - 1 && r.legKit && r.track === 1;
    });
    if (slot !== undefined) {
      const resumed = unaudited(s);
      const row = () => train(resumed.w, slot);
      const boarded = row().arrived;
      const ask = trainRequestable(row(), line, stops, resumed.t);
      assert.ok(ask && !ask.requested && ask.dir === -1);
      const id = RAIL_HALTS.findIndex((h) => h.line === line && h.stop === ask.stop);
      assert.equal(act(resumed, 'a', 'rail.call', { id, dir: ask.dir, train: slot }), 1);
      assert.equal(legRailheadHold(resumed.w, slot, resumed.t), 'on', 'release the freight hold for the rider');
      laySection(resumed, wall);
      if (row().arrived === boarded && row().at === stops.length - 1) {
        assert.ok(
          reqHas(row().req, ask.stop, ask.dir, stopsOf(resumed.w, line).length),
          'the fifth lay erased the accepted request while the rider was still at the fourth head',
        );
      }
      // The normal dwell can outlast the freight hold. Ask again in a separate run, one tick before the stub moves.
      for (const take of ['rail.depotTake', 'rail.depotRailTake'] as const) {
        while (act(s, 'a', take) > 0) assert.ok(act(s, 'a', 'rail.legStock', { leg: wall }) > 0);
      }
      const start = legRow(s.w, wall).start;
      assert.ok(start >= 0);
      advance(s, start + LEG_TUNE.layTicks - 1 - s.t);
      assert.equal(train(s.w, slot).at, stops.length - 1);
      assert.equal(act(s, 'a', 'rail.call', { id, dir: ask.dir, train: slot }), 1);
      advance(s, 1);
      assert.equal(legRow(s.w, wall).laid, 5);
      for (let i = 0; train(s.w, slot).phase !== TRAIN_PHASE.STAND || train(s.w, slot).at !== ask.stop; i++) {
        assert.ok(i < 8000, 'the same train serves the requested homeward halt');
        assert.ok(reqHas(train(s.w, slot).req, ask.stop, ask.dir, stopsOf(s.w, line).length));
        advance(s, 1);
      }
      assert.equal(train(s.w, slot).track, 1);
      return;
    }
    advance(s, 1);
  }
  assert.fail('Kit 6 never stood at the fourth head');
});
