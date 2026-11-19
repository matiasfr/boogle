// Independent review of claude/greybox-leg2-rules (docs/plans/greybox-leg2.md, steps 1 to 3). Each test here fails on
// the reviewed branch and names the defect it shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAIL_LEGS } from '../src/sim/railway-route.ts';
import { forge, rail } from '../src/sim/railway-rows.ts';
import { legOpen, legRow } from '../src/sim/railway-queries-route.ts';
import { act, advance, buildSeedWorld, invariant, restore, type Seed } from './helpers/rail.ts';

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
  assert.equal(rail(s.w).depot, sec.logs, 'section 1 stocked');
  const loaded0 = legRow(s.w, BAY).loadedLogs,
    produced0 = rail(s.w).depotProduced,
    forgeRails0 = forge(s.w).rack;
  // Two players lift off the rack, carrying the units toward the frame (counted held), then a few ticks pass.
  for (const pid of ['a', 'b']) {
    act(s, pid, 'rail.depotTake');
    act(s, pid, 'rail.depotRailTake');
  }
  assert.ok(legRow(s.w, BAY).heldLogs > 0, 'units counted held on the bay cut');
  advance(s, 3);
  assert.equal(invariant(s.w), null);
  // The rack, the backs' held units and the frame together never pass section 1's bill while nothing is lost: a lift
  // is not owed again (the incline's leaver test says the same for a train-fed rack).
  const over = {
    logs: rail(s.w).depot + legRow(s.w, BAY).heldLogs + legRow(s.w, BAY).logs - sec.logs,
    rails: rail(s.w).depotRails + legRow(s.w, BAY).heldRails + legRow(s.w, BAY).rails - sec.rails,
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
    const n = act(s, 'a', 'rail.depotTake');
    assert.ok(n > 0, `cycle ${k}: a takes logs off the rack`);
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
