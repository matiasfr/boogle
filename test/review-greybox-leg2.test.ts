// Independent review of claude/greybox-leg2-rules (docs/plans/greybox-leg2.md, steps 1 to 3). Each test here fails on
// the reviewed branch and names the defect it shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LINE2, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { RAIL_LEGS } from '../src/sim/railway-route.ts';
import { forge, rail, trains } from '../src/sim/railway-rows.ts';
import { legOpen, legRow, legYard } from '../src/sim/railway-queries-route.ts';
import { act, advance, buildSeedWorld, invariant, pilesWithIds, restore, type Seed } from './helpers/rail.ts';
import { Leg } from '../src/sim/railway-components.ts';
import { checkRoute } from '../src/sim/railway-check-route.ts';

const INCLINE = RAIL_LEGS.findIndex((l) => l.id === 'incline');
const BAY = RAIL_LEGS.findIndex((l) => l.id === 'bay-cut');
const copy = (stage: Parameters<typeof buildSeedWorld>[0]): Seed => {
  const s = buildSeedWorld(stage);
  return { w: restore(s.w), t: s.t };
};

// legKitStock (railway-sys-route-kit.ts) tops the rack up to legRackNeed, which counts what is fed and racked but not
// what is held on backs (Leg.heldLogs, Leg.heldRails). A train-fed rack is bounded by legKitNeed, which counts held.
test("the West landing's stand-in stock does not restock units lifted off its rack and still held", () => {
  const s = copy('bay-open');
  const sec = RAIL_LEGS[BAY]!.sections[0]!;
  assert.ok(legOpen(s.w, BAY) && legRow(s.w, BAY).laid === 0, 'the bay cut is open with nothing laid');
  assert.equal(legRow(s.w, BAY).rackLogs, sec.logs, 'section 1 stocked');
  const loaded0 = legRow(s.w, BAY).loadedLogs,
    produced0 = rail(s.w).depotProduced,
    forgeRails0 = forge(s.w).rack;
  // Two players lift off the rack, carrying the units toward the frame (counted held), then a few ticks pass.
  for (const pid of ['a', 'b']) {
    act(s, pid, 'rail.depotTake', { leg: BAY });
    act(s, pid, 'rail.depotRailTake', { leg: BAY });
  }
  assert.ok(legRow(s.w, BAY).heldLogs > 0, 'units counted held on the bay cut');
  advance(s, 3);
  assert.equal(invariant(s.w), null);
  // The rack, the backs' held units and the frame together never pass section 1's bill while nothing is lost: a lift
  // is not owed again (the incline's leaver test says the same for a train-fed rack).
  const over = {
    logs: legRow(s.w, BAY).rackLogs + legRow(s.w, BAY).heldLogs + legRow(s.w, BAY).logs - sec.logs,
    rails: legRow(s.w, BAY).rackRails + legRow(s.w, BAY).heldRails + legRow(s.w, BAY).rails - sec.rails,
  };
  assert.deepEqual(
    over,
    { logs: 0, rails: 0 },
    `rack + held + fed over the bill: ${rail(s.w).depotProduced - produced0} logs minted, ` +
      `${legRow(s.w, BAY).loadedLogs - loaded0} loaded, ${forgeRails0 - forge(s.w).rack} rails off the forge rack`,
  );
});

test("a lift and a put-down at the West landing's rack does not mint logs without end", () => {
  const s = copy('bay-open');
  const produced0 = rail(s.w).depotProduced,
    bill = RAIL_LEGS[BAY]!.sections[0]!.logs;
  // Take what a back holds, put it down beside the rack, take again: the frame is never fed.
  for (let k = 0; k < 4; k++) {
    const n = act(s, 'a', 'rail.depotTake', { leg: BAY });
    // Builder's fix (the stand-in mints the section's kit once): put-down units are not restocked, so the rack runs out
    // after the first cycles and a later take finds nothing; only the first must take (the review's claim is below).
    if (k === 0) assert.ok(n > 0, `cycle ${k}: a takes logs off the rack`);
    // Put down in piles a metre apart (a pile holds fewer than a back may carry).
    for (let left = n, j = 0; left > 0; j++) {
      const put = act(s, 'a', 'rail.drop', { x: 80100 + 100 * (8 * k + j), y: 490, z: -100, n: left, kind: 0 });
      assert.ok(put > 0, `cycle ${k}: put down`);
      left -= put;
    }
    advance(s, 2);
  }
  assert.equal(invariant(s.w), null);
  assert.equal(legRow(s.w, BAY).laid, 0);
  const minted = rail(s.w).depotProduced - produced0;
  assert.ok(minted <= bill, `${minted} logs minted at the West landing for a section of ${bill}, nothing fed`);
});

// legKitRoom (railway-queries-route.ts) gives line 2's unload at High Gorge the rack's lack first (legRackNeed: fed and
// racked, not held), then the yard. With section 1's kit lifted off the Gorge rack and on its way to the frame, a line 2
// train arriving with section 2's kit puts it on the rack, which becomes head 1's rack at the lay: the ns relay skipped.
test("line 2's unload at High Gorge sends section 2's kit to the yard while section 1's is held on backs", () => {
  const s = copy('incline-open');
  const sec = RAIL_LEGS[INCLINE]!.sections[0]!;
  assert.equal(legRow(s.w, INCLINE).rackLogs, sec.logs, "section 1's kit on the Gorge rack");
  const aboard = () => trains(s.w).filter((t) => t.legKit && RAIL_TRAINS[t.slot]!.line === LINE2);
  assert.ok(aboard().length > 0, "line 2 carries section 2's kit");
  for (const pid of ['a', 'b']) {
    act(s, pid, 'rail.depotTake', { leg: INCLINE });
    act(s, pid, 'rail.depotRailTake', { leg: INCLINE });
  }
  assert.ok(legRow(s.w, INCLINE).heldLogs > 0, 'held on backs');
  for (let guard = 0; aboard().length > 0; guard++) {
    assert.ok(guard < 6000, "line 2 never unloaded section 2's kit");
    advance(s, 1);
  }
  assert.equal(invariant(s.w), null);
  assert.ok(
    legRow(s.w, INCLINE).rackLogs + legRow(s.w, INCLINE).heldLogs <= sec.logs,
    `rack ${legRow(s.w, INCLINE).rackLogs} + held ${legRow(s.w, INCLINE).heldLogs} past section 1's ${sec.logs}; ` +
      `yard ${legYard(s.w, INCLINE).logs}`,
  );
});

// Builder's follow-up: the put-down units stay in their piles, retaken by hand, so the section still completes with
// nothing minted again; the load check refuses a stand-in over its bill.
test('units put down at the West landing are taken up again and the first section lays; nothing more is minted', () => {
  const s = copy('bay-open');
  const produced0 = rail(s.w).depotProduced;
  const n = act(s, 'a', 'rail.depotTake', { leg: BAY });
  assert.ok(n > 0);
  for (let left = n, j = 0; left > 0; j++)
    left -= act(s, 'a', 'rail.drop', { x: 80100 + 100 * j, y: 490, z: -100, n: left, kind: 0 });
  advance(s, 5);
  assert.equal(rail(s.w).depotProduced, produced0, 'not restocked');
  for (const p of pilesWithIds(s.w)) if (p.kind === 0) act(s, 'a', 'rail.take', { id: p.id });
  for (let guard = 0; legRow(s.w, BAY).start < 0; guard++) {
    assert.ok(guard < 200, 'the first section fed');
    for (const pid of ['a', 'b']) {
      act(s, pid, 'rail.depotTake', { leg: BAY });
      act(s, pid, 'rail.depotRailTake', { leg: BAY });
      act(s, pid, 'rail.legStock', { leg: BAY });
    }
    advance(s, 1);
  }
  assert.equal(rail(s.w).depotProduced, produced0, 'nothing minted again');
  assert.equal(invariant(s.w), null);
  // The load check catches a stand-in whose loaded rails pass its bill.
  const over = copy('bay-open');
  Object.assign(over.w.mut(Leg, over.w.lookup(Leg, BAY)!)!, { loadedRails: RAIL_LEGS[BAY]!.sections[0]!.rails + 1 });
  assert.throws(() => checkRoute(over.w), /stand-in over its bill/);
});
