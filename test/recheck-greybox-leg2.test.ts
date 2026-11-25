// Independent re-check of claude/greybox-leg2-rules at dc939511b (the review fixes). Each test here fails on that tip and
// names the defect it shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAIL_LEGS } from '../src/sim/railway-route.ts';
import { RAILS } from '../src/sim/railway-line2-layout.ts';
import { railGrowthMask } from '../src/sim/railway-supply.ts';
import { forge } from '../src/sim/railway-rows.ts';
import { legOpen, legRow } from '../src/sim/railway-queries-route.ts';
import { railLegKitRelease } from '../src/sim/railway-sys-route-kit.ts';
import { Account, Steel } from '../src/sim/railway-components.ts';
import {
  act,
  advance,
  buildSeedWorld,
  invariant,
  pilesWithIds,
  railSupplyPulse,
  restore,
  type Seed,
} from './helpers/rail.ts';

const BAY = RAIL_LEGS.findIndex((l) => l.id === 'bay-cut');
const copy = (stage: Parameters<typeof buildSeedWorld>[0]): Seed => {
  const s = buildSeedWorld(stage);
  return { w: restore(s.w), t: s.t };
};
const acc = (s: Seed, pid: string) => s.w.get(Account, s.w.lookup(Account, pid)!)!;
const steel = (s: Seed) => s.w.get(Steel, s.w.single(Steel))!;
/** The bay cut open with the steel works lit, as in a room that played the catalog in order (steel-lit comes before the
 * greybox legs; the leg seeds build on ring-joined and skip it). Lit by accepted ops only: b takes the works' kit off
 * its yard and feeds it. */
function bayOpenWorksLit(): Seed {
  const s = copy('bay-open');
  for (let guard = 0; steel(s).lit < 0; guard++) {
    assert.ok(guard < 400, 'the works lit');
    act(s, 'b', 'rail.steelTake', { kind: 0 });
    act(s, 'b', 'rail.steelTake', { kind: 1 });
    act(s, 'b', 'rail.steel');
    advance(s, 30);
  }
  advance(s, 600);
  assert.equal(invariant(s.w), null);
  assert.ok(legOpen(s.w, BAY) && legRow(s.w, BAY).laid === 0 && legRow(s.w, BAY).start < 0, 'the bay cut open');
  return s;
}

/** Everyone still in the room does everything a player can to feed the bay cut's first frame with rails: take the
 * rack's, the forge rack's by hand (the fix's "made up by hand"), the steel works yard's; feed. True once section 1
 * starts laying. */
function feedRails(s: Seed, pids: readonly string[]) {
  for (let guard = 0; guard < 200; guard++) {
    if (legRow(s.w, BAY).start >= 0 || legRow(s.w, BAY).laid > 0) return true;
    for (const pid of pids) {
      act(s, pid, 'rail.depotRailTake', { leg: BAY });
      act(s, pid, 'rail.forgeTake');
      act(s, pid, 'rail.steelTake', { kind: 1 });
      act(s, pid, 'rail.depotTake', { leg: BAY });
      act(s, pid, 'rail.legStock', { leg: BAY });
    }
    advance(s, 1);
  }
  return false;
}

// legKitStock now mints the bay cut's first kit once (loadedRails never passes the bill), and says a leaver's units
// are "made up by hand (rails off the forge rack)". But rail.forgeTake gives nothing once the cradle is fitted
// (railway-sys-line2.ts, forgeTake), which it is long before leg 2, and the stand-in no longer tops up. With the steel
// works lit its yard is empty too: no rail reaches a back by hand, and a leaver who lifted rack rails leaves section 1
// short for good. Before the fix the release made them owed and the stand-in restocked them from the forge rack.
// (With the works unlit, as the bay-open seed has it, the works yard's rails are a detour: line 2 refills it.)
test("a leaver's rails lifted off the West landing's rack can still be made up: the bay cut's section 1 lays", () => {
  const s = bayOpenWorksLit();
  assert.ok(legOpen(s.w, BAY) && legRow(s.w, BAY).laid === 0);
  const n = act(s, 'a', 'rail.depotRailTake', { leg: BAY });
  assert.ok(n > 0, 'a lifts rails off the rack');
  // a leaves for good; past the grace the host releases a's held units.
  assert.equal(railLegKitRelease(s.w, 'a', acc(s, 'a').epoch), n);
  advance(s, 5);
  const ok = feedRails(s, ['b']);
  assert.equal(invariant(s.w), null);
  assert.ok(
    ok,
    `section 1 short ${RAIL_LEGS[BAY]!.sections[0]!.rails - legRow(s.w, BAY).rails} rails for good: ` +
      `forge rack ${forge(s.w).rack} (rail.forgeTake gives ${act(s, 'b', 'rail.forgeTake')}), ` +
      `West landing rack ${legRow(s.w, BAY).rackRails}, works yard ${steel(s).yardRails}, loaded ${legRow(s.w, BAY).loadedRails}`,
  );
});

// The same loss without a leaver: rails put down at the West landing and left (a room that empties overnight) are
// recovered to the forge rack by the supply pulse, where no player can take them and the stand-in no longer looks.
test('rails put down at the West landing and recovered to the forge rack still reach the bay cut', () => {
  const s = bayOpenWorksLit();
  const n = act(s, 'a', 'rail.depotRailTake', { leg: BAY });
  assert.ok(n > 0);
  for (let left = n, j = 0; left > 0; j++) {
    const put = act(s, 'a', 'rail.drop', { x: 80100 + 100 * j, y: 490, z: -100, n: left, kind: RAILS });
    assert.ok(put > 0, 'put down');
    left -= put;
  }
  const ids = pilesWithIds(s.w)
    .filter((p) => p.kind === RAILS)
    .map((p) => p.id);
  const rack0 = forge(s.w).rack;
  // Twenty-one accepted minutes with nobody near: the piles are abandoned and go back to the forge's rack.
  railSupplyPulse(s.w, { marker: 1000, grow: railGrowthMask([]), recover: ids });
  railSupplyPulse(s.w, { marker: 1200, grow: railGrowthMask([]), recover: ids });
  assert.ok(forge(s.w).rack >= rack0 + n, 'recovered to the forge rack');
  assert.equal(pilesWithIds(s.w).filter((p) => ids.includes(p.id)).length, 0, 'the piles are gone');
  const ok = feedRails(s, ['a', 'b']);
  assert.equal(invariant(s.w), null);
  assert.ok(
    ok,
    `section 1 short ${RAIL_LEGS[BAY]!.sections[0]!.rails - legRow(s.w, BAY).rails} rails for good; ` +
      `${forge(s.w).rack} on the forge rack nobody can take`,
  );
});
