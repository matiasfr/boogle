// Third independent re-check of claude/greybox-leg2-rules at ef3f23c13 (the stand-in's liveness backstop). The code
// held; this pins the case the property test (railway-leg2-standin.test.ts) does not reach. Its supply pulses jump the
// marker 1 to 25 minutes and offer half the piles for recovery, so put-down rails are back on the forge rack within a
// pulse or two and legKitRecovered makes them up: with legStandInBackstop switched off, 40 of its seeds still lay
// every rail (only the logs fail). Here the host's real cadence: one pulse a minute, the marker one on, and no pile
// recovered (someone stands near it, or it is not 21 minutes old). Fails with the backstop switched off.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAIL_LEGS } from '../src/sim/railway-route.ts';
import { RAILS } from '../src/sim/railway-line2-layout.ts';
import { LOOSE_PILE_MAX, railGrowthMask } from '../src/sim/railway-supply.ts';
import { forge } from '../src/sim/railway-rows.ts';
import { legOpen, legRow } from '../src/sim/railway-queries-route.ts';
import { Account, Steel } from '../src/sim/railway-components.ts';
import { act, advance, buildSeedWorld, invariant, railSupplyPulse, restore, type Seed } from './helpers/rail.ts';

const BAY = RAIL_LEGS.findIndex((l) => l.id === 'bay-cut');
const acc = (s: Seed, pid: string) => s.w.get(Account, s.w.lookup(Account, pid)!)!;
function bayOpenWorksLit(): Seed {
  const b = buildSeedWorld('bay-open');
  const s = { w: restore(b.w), t: b.t };
  for (let guard = 0; s.w.get(Steel, s.w.single(Steel))!.lit < 0; guard++) {
    assert.ok(guard < 400, 'the works lit');
    act(s, 'b', 'rail.steelTake', { kind: 0 });
    act(s, 'b', 'rail.steelTake', { kind: 1 });
    act(s, 'b', 'rail.steel');
    advance(s, 30);
  }
  advance(s, 600);
  assert.ok(legOpen(s.w, BAY) && legRow(s.w, BAY).laid === 0, 'the bay cut open');
  return s;
}

test("rails put down 120 m off and never recovered are made up within a minute or two (the host's real cadence)", () => {
  const s = bayOpenWorksLit();
  let marker = 5000;
  const minute = () => railSupplyPulse(s.w, { marker: ++marker, grow: railGrowthMask([]), recover: [] });
  minute();
  // a lifts a back of rails off the West landing's rack and puts them down at the Village, where they stay.
  const n = act(s, 'a', 'rail.depotRailTake', { leg: BAY });
  assert.ok(n > 0, 'a lifts rails');
  // A pile holds 8 and a back with the yoke 16: put down in piles of 8, every rail of them.
  for (let left = n; left > 0;) {
    const down = act(s, 'a', 'rail.drop', { x: 93000, y: 490, z: 300, n: left, kind: RAILS });
    assert.equal(down, Math.min(left, LOOSE_PILE_MAX), 'put down far off');
    left -= down;
  }
  assert.equal(acc(s, 'a').rails, 0);
  const bill = RAIL_LEGS[BAY]!.sections[0]!;
  const t0 = s.t;
  // b feeds section 1 from the rack only (the works are lit: rail.forgeTake gives none), a pulse a minute.
  while (legRow(s.w, BAY).start < 0 && legRow(s.w, BAY).laid === 0 && legRow(s.w, BAY).rails < bill.rails) {
    assert.ok(
      s.t - t0 <= 3 * 600,
      `section 1 short ${bill.rails - legRow(s.w, BAY).rails} rails three minutes on (forge rack ${forge(s.w).rack})`,
    );
    act(s, 'b', 'rail.depotRailTake', { leg: BAY });
    act(s, 'b', 'rail.legStock', { leg: BAY });
    advance(s, 10);
    if ((s.t - t0) % 600 < 10) minute();
  }
  assert.equal(invariant(s.w), null);
});
