// The West landing's stand-in, as a property (the second re-check of greybox leg 2, (c); docs/plans/greybox-leg2.md):
// from `bay-open` in a room with the steel works lit (as a room that played the catalog in order has it), seeded random
// sequences of take, put down (near the rack or far off), take up again, feed, leave (for good, or rejoining within the
// grace), host restart and supply pulse. Then whoever is in the room feeds section 1 with what they can reach. It always
// lays within LIVE_BOUND ticks, the load check holds at every step, and the stand-in's loaded rails never go negative.
// STANDIN_SEEDS sets the seed count: 8 by default, so the file fits CI's budget (about 23 s of base build and 1 s a
// seed locally, CI about 3.5 times slower); STANDIN_SEEDS=300 for a long local run. The pulse is the host's cadence
// (one a minute, a pile recovered only once due): with the backstop switched off it fails within the first 8 seeds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/sim/rng.ts';
import { RAIL_LEGS, legRack } from '../src/sim/railway-route.ts';
import { RAILS } from '../src/sim/railway-line2-layout.ts';
import { RECOVERY_MINUTES, railGrowthMask } from '../src/sim/railway-supply.ts';
import { legOpen, legRow } from '../src/sim/railway-queries-route.ts';
import { railLegKitHolders, railLegKitRelease } from '../src/sim/railway-sys-route-kit.ts';
import { railSession } from '../src/sim/railway-sys-core.ts';
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
const RACK = legRack(RAIL_LEGS[BAY]!, 0);
/** The longest a leaver keeps their units counted held before the host's release, in this model (ticks). */
const GRACE = 1200;
/** A supply pulse a minute (600 ticks) while the room plays, as the host sends one (host-supply.ts). */
const MINUTE = 600;
/** Section 1 lays within this many ticks of the room settling to feed it: the grace, the backstop's minute, and the
 * feeding, with room to spare. */
const LIVE_BOUND = GRACE + 2 * MINUTE + 1200;
const SEEDS = Number(process.env.STANDIN_SEEDS ?? 8);
const STEPS = 160;

const acc = (s: Seed, pid: string) => s.w.get(Account, s.w.lookup(Account, pid)!)!;
const steel = (s: Seed) => s.w.get(Steel, s.w.single(Steel))!;
/** `bay-open` with the steel works lit by accepted ops (the re-checks' helper). */
function bayOpenWorksLit(): Seed {
  const b = buildSeedWorld('bay-open');
  const s = { w: restore(b.w), t: b.t };
  for (let guard = 0; steel(s).lit < 0; guard++) {
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
const BASE = bayOpenWorksLit();

type Player = { pid: string; here: boolean; left: number; forGood: boolean };
function run(seed: number) {
  const rand = mulberry32(seed),
    pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
  let s: Seed = { w: restore(BASE.w), t: BASE.t };
  let marker = 5000,
    lastPulse = s.t;
  const players: Player[] = ['a', 'b'].map((pid) => ({ pid, here: true, left: -1, forGood: false }));
  const check = (what: string) => {
    assert.ok(legRow(s.w, BAY).loadedRails >= 0, `${seed}: loadedRails ${legRow(s.w, BAY).loadedRails} ${what}`);
    const broken = invariant(s.w);
    assert.equal(broken, null, `${seed}: ${what}: ${broken}`);
  };
  // The host's real cadence (host-supply.ts; recheck3's P3): one pulse a minute, the marker one on, and a pile offered
  // for recovery only once it is due (21 minutes old after this pulse ages it). So put-down rails rarely come back the
  // old way inside a run, and the backstop is what makes them up.
  const pulse = () => {
    const recover = pilesWithIds(s.w)
      .filter((p) => p.age >= RECOVERY_MINUTES - 1)
      .map((p) => p.id);
    railSupplyPulse(s.w, { marker: ++marker, grow: railGrowthMask([]), recover });
    lastPulse = s.t;
  };
  /** The host's leaver check: past the grace, a gone player's counted units are released. */
  const host = () => {
    for (const p of players)
      if (!p.here && p.left >= 0 && s.t - p.left >= GRACE && railLegKitHolders(s.w).some((h) => h.pid === p.pid)) {
        railLegKitRelease(s.w, p.pid, acc(s, p.pid).epoch);
        p.left = -1;
      }
  };
  const drop = (pid: string, kind: number, near: boolean) => {
    const a = acc(s, pid),
      n = kind === RAILS ? a.rails : a.carry;
    if (n <= 0) return;
    const at = near
      ? { x: RACK.x + Math.floor(rand() * 1600) - 800, z: RACK.z + Math.floor(rand() * 1600) - 800 }
      : { x: 92900 + Math.floor(rand() * 800), z: 300 }; // the Village, 120 m off
    act(s, pid, 'rail.drop', { ...at, y: 490, n, kind });
  };
  for (let step = 0; step < STEPS && legRow(s.w, BAY).laid === 0; step++) {
    const here = players.filter((p) => p.here);
    const r = rand();
    if (here.length && r < 0.6) {
      const p = pick(here).pid;
      const what = rand();
      if (what < 0.25) act(s, p, rand() < 0.5 ? 'rail.depotTake' : 'rail.depotRailTake');
      else if (what < 0.5) drop(p, rand() < 0.5 ? 0 : RAILS, rand() < 0.5);
      else if (what < 0.7) {
        const piles = pilesWithIds(s.w).filter((q) => q.kind === 0 || q.kind === RAILS);
        if (piles.length) {
          const q = pick(piles);
          act(s, p, 'rail.take', { id: q.id, kind: q.kind });
        }
      } else if (what < 0.8 && rand() < 0.3) act(s, p, 'rail.legStock', { leg: BAY });
      else {
        // Leave: for good (a quarter of the time), or to come back within the grace.
        const pl = players.find((x) => x.pid === p)!;
        Object.assign(pl, { here: false, left: s.t, forGood: rand() < 0.25 });
      }
    } else if (r < 0.75) {
      // A rejoin within the grace: a new session, the same account.
      const back = players.filter((p) => !p.here && !p.forGood && p.left >= 0 && s.t - p.left < GRACE);
      if (back.length) {
        const p = pick(back);
        railSession(s.w, p.pid, acc(s, p.pid).epoch + 1);
        Object.assign(p, { here: true, left: -1 });
      }
    } else if (r < 0.8) {
      s = { w: restore(s.w), t: s.t }; // the host restarts from its checkpoint
    }
    advance(s, 1 + Math.floor(rand() * 40));
    if (s.t - lastPulse >= MINUTE) pulse();
    host();
    check(`step ${step}`);
  }
  // The room settles: those who left for good stay gone; the rest are back; a newcomer joins if nobody is.
  for (const p of players)
    if (!p.forGood && !p.here) {
      railSession(s.w, p.pid, acc(s, p.pid).epoch + 1);
      Object.assign(p, { here: true, left: -1 });
    }
  if (!players.some((p) => p.here)) {
    railSession(s.w, 'c', 1);
    players.push({ pid: 'c', here: true, left: -1, forGood: false });
  }
  const t0 = s.t;
  for (let k = 0; legRow(s.w, BAY).start < 0 && legRow(s.w, BAY).laid === 0; k++) {
    assert.ok(
      s.t - t0 <= LIVE_BOUND,
      `${seed}: section 1 not laid ${LIVE_BOUND} ticks on: fed ${legRow(s.w, BAY).logs}/${legRow(s.w, BAY).rails}, ` +
        `loaded ${legRow(s.w, BAY).loadedLogs}/${legRow(s.w, BAY).loadedRails}`,
    );
    for (const p of players.filter((x) => x.here)) {
      // What a player at the West landing reaches: the rack, and piles near it.
      act(s, p.pid, 'rail.depotTake');
      act(s, p.pid, 'rail.depotRailTake');
      for (const q of pilesWithIds(s.w))
        if ((q.kind === 0 || q.kind === RAILS) && (q.x - RACK.x) ** 2 + (q.z - RACK.z) ** 2 <= 3000 ** 2)
          act(s, p.pid, 'rail.take', { id: q.id, kind: q.kind });
      act(s, p.pid, 'rail.legStock', { leg: BAY });
    }
    advance(s, 5);
    if (s.t - lastPulse >= MINUTE) pulse();
    host();
    if (k % 20 === 0) check(`settled ${s.t - t0}`);
  }
  check('laid');
  return s.t - t0;
}

test(
  `the West landing's stand-in: ${SEEDS} seeded room histories, section 1 always lays within ${LIVE_BOUND} ticks`,
  { timeout: 3600000 },
  (t) => {
    let worst = 0;
    for (let seed = 1; seed <= SEEDS; seed++) worst = Math.max(worst, run(seed));
    t.diagnostic(
      `${SEEDS} seeds: the slowest section 1 laid ${worst} ticks after the room settled (bound ${LIVE_BOUND})`,
    );
  },
);
