// Second independent re-check of claude/greybox-leg2-rules at af7e31315 (the stand-in's lost rails owed again). Each
// test here fails on that tip and names the defect it shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAIL_LEGS } from '../src/sim/railway-route.ts';
import { RAILS } from '../src/sim/railway-line2-layout.ts';
import { railGrowthMask } from '../src/sim/railway-supply.ts';
import { forge, rail } from '../src/sim/railway-rows.ts';
import { legId, legOpen, legRow } from '../src/sim/railway-queries-route.ts';
import { legStandInLost, railLegKitHolders, railLegKitRelease } from '../src/sim/railway-sys-route-kit.ts';
import { Account, Leg, Steel } from '../src/sim/railway-components.ts';
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
const INCLINE = RAIL_LEGS.findIndex((l) => l.id === 'incline');
const copy = (stage: Parameters<typeof buildSeedWorld>[0]): Seed => {
  const s = buildSeedWorld(stage);
  return { w: restore(s.w), t: s.t };
};
const acc = (s: Seed, pid: string) => s.w.get(Account, s.w.lookup(Account, pid)!)!;
const steel = (s: Seed) => s.w.get(Steel, s.w.single(Steel))!;
/** The bay cut open with the steel works lit, as in a room that played the catalog in order (as the first re-check's
 * helper): lit by accepted ops only. */
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
/** Everyone in `pids` does everything a player can to feed the bay cut's first frame with rails (rack, forge rack,
 * works yard, any pile on the ground), with supply pulses recovering whatever lies abandoned. True once it lays. */
function feedRails(s: Seed, pids: readonly string[]) {
  let marker = 2000;
  for (let guard = 0; guard < 200; guard++) {
    if (legRow(s.w, BAY).start >= 0 || legRow(s.w, BAY).laid > 0) return true;
    for (const pid of pids) {
      act(s, pid, 'rail.depotRailTake');
      act(s, pid, 'rail.forgeTake');
      act(s, pid, 'rail.steelTake', { kind: 1 });
      act(s, pid, 'rail.depotTake');
      act(s, pid, 'rail.legStock', { leg: BAY });
    }
    if (guard % 50 === 49) {
      const ids = pilesWithIds(s.w).map((p) => p.id);
      railSupplyPulse(s.w, { marker: (marker += 200), grow: railGrowthMask([]), recover: ids });
    }
    advance(s, 1);
  }
  return false;
}
/** `pid` puts down everything it carries of rails near the West landing's rack; the new piles' ids. */
function putDownRails(s: Seed, pid: string, n: number) {
  const before = new Set(pilesWithIds(s.w).map((p) => p.id));
  for (let left = n, j = 0; left > 0; j++) {
    const put = act(s, pid, 'rail.drop', { x: 80100 + 100 * j, y: 490, z: -100, n: left, kind: RAILS });
    assert.ok(put > 0, 'put down');
    left -= put;
  }
  return pilesWithIds(s.w)
    .filter((p) => p.kind === RAILS && !before.has(p.id))
    .map((p) => p.id);
}

// P1. The fix owes again a leaver's *counted* rails (legKitRelease) and rails the pulse recovers from piles
// (legKitRecovered). But a unit put down and taken up again from its pile (rail.take) is no longer counted held, and
// the pile is gone, so if its carrier then leaves for good neither path sees it: the host's leaver check does not list
// them (railLegKitHolders), no pile is left to recover, and the stand-in's loaded count stays at the bill. The very
// recovery the first review relied on ("a unit put down there is taken up again from its pile") makes the loss
// invisible. Section 1 stays short for good once the works are lit (rail.forgeTake gives none, the yard is empty).
test('rails put down at the West landing, taken up again and carried off by a leaver can still be made up', () => {
  const s = bayOpenWorksLit();
  const n = act(s, 'a', 'rail.depotRailTake');
  assert.ok(n > 0, 'a lifts rails off the rack');
  const ids = putDownRails(s, 'a', n);
  for (const id of ids) act(s, 'a', 'rail.take', { id, kind: RAILS });
  assert.equal(acc(s, 'a').rails, n, 'a carries them again');
  // Builder's fix (a): taken up again while the stand-in stands, they count held again (capped at what it lost), so
  // the host lists a and the leaver's release owes them again; the backstop is the floor if it did not.
  assert.equal(acc(s, 'a').legRails, n, 'counted held again');
  assert.equal(
    railLegKitHolders(s.w).some((h) => h.pid === 'a'),
    true,
    'the host can release a',
  );
  // a leaves for good; past the grace the host releases a's held units; b plays on. Forge pours, pulses run.
  railLegKitRelease(s.w, 'a', acc(s, 'a').epoch);
  const ok = feedRails(s, ['b']);
  assert.equal(invariant(s.w), null);
  assert.ok(
    ok,
    `section 1 short ${RAIL_LEGS[BAY]!.sections[0]!.rails - legRow(s.w, BAY).rails} rails for good: ` +
      `lost ${legStandInLost(s.w, BAY)}, loaded ${legRow(s.w, BAY).loadedRails}, West landing rack ` +
      `${rail(s.w).depotRails}, forge rack ${forge(s.w).rack}, works yard ${steel(s).yardRails}`,
  );
});

// P1, the two-player form: a puts the rack's rails down, b picks them up off the pile and leaves for good.
test('rails a friend picked up off a West landing pile and took away can still be made up', () => {
  const s = bayOpenWorksLit();
  const n = act(s, 'a', 'rail.depotRailTake');
  assert.ok(n > 0);
  const ids = putDownRails(s, 'a', n);
  for (const id of ids) act(s, 'b', 'rail.take', { id, kind: RAILS });
  assert.equal(acc(s, 'b').rails, n, 'b carries them');
  // Builder's fix (a): counted held again on b, so b's release owes them again.
  assert.equal(acc(s, 'b').legRails, n);
  // b leaves for good; past the grace the host releases b; a plays on.
  railLegKitRelease(s.w, 'b', acc(s, 'b').epoch);
  const ok = feedRails(s, ['a']);
  assert.equal(invariant(s.w), null);
  assert.ok(
    ok,
    `section 1 short ${RAIL_LEGS[BAY]!.sections[0]!.rails - legRow(s.w, BAY).rails} rails for good: ` +
      `lost ${legStandInLost(s.w, BAY)}, loaded ${legRow(s.w, BAY).loadedRails}`,
  );
});

// P2. legKitRelease takes the leaver's whole counted rails off the stand-in's loaded count, unclamped. Counted rails
// are whatever was lifted off the shared shelf (Rail.depotRails), and the shelf can hold the incline's leftovers when
// the bay cut opens (nothing clears it on the incline's last lay; legStandInLost's own comment allows for it): then the
// stand-in loaded only what section 1 still lacked, and a leaver who lifted more than that drives Leg.loadedRails
// negative. The load check's 'leg bounds' (railInt) refuses that world, so a checkpoint saved before the next legTick
// restocks (or while the forge rack is short) is a save that does not load. The world below is built by hand: the
// shelf's last 5 rails are booked to the incline instead of the stand-in, as an incline that ended with 5 spare (a
// leaver released there who came back and fed their own) leaves it.
test("a leaver's release never drives the stand-in's loaded rails below zero", () => {
  const s = bayOpenWorksLit();
  const L = 5;
  assert.equal(rail(s.w).depotRails, legRow(s.w, BAY).loadedRails, 'the shelf is the stand-in stock');
  s.w.mut(Leg, legId(s.w, BAY))!.loadedRails -= L;
  s.w.mut(Leg, legId(s.w, INCLINE))!.loadedRails += L;
  assert.equal(invariant(s.w), null, 'a world the incline can leave');
  // Two friends lift a back each (8 rails), more than the stand-in's 15 between them, and both leave for good.
  const n = act(s, 'a', 'rail.depotRailTake') + act(s, 'b', 'rail.depotRailTake');
  assert.ok(n > legRow(s.w, BAY).loadedRails, `${n} lifted, more than the stand-in's ${legRow(s.w, BAY).loadedRails}`);
  railLegKitRelease(s.w, 'a', acc(s, 'a').epoch);
  railLegKitRelease(s.w, 'b', acc(s, 'b').epoch);
  assert.ok(legRow(s.w, BAY).loadedRails >= 0, `loadedRails ${legRow(s.w, BAY).loadedRails}`);
  assert.equal(invariant(s.w), null);
});
