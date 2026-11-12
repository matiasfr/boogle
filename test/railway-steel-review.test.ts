// Independent review of ring2/rules (R1, R2): scenarios the branch's own tests do not run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STEEL } from '../src/sim/railway-ring-layout.ts';
import { Leg } from '../src/sim/railway-components.ts';
import {
  aboard,
  account,
  act,
  advance,
  cart,
  invariant,
  pilesWithIds,
  rail,
  railwayAtRing,
  restore,
  shed,
  steel,
  steelNeed,
  trains,
  type Seed,
} from './helpers/rail.ts';

const seed = (s: Seed): Seed => ({ w: restore(s.w), t: s.t });
function feedAll(s: Seed, pid: string) {
  for (const kind of [0, 1])
    for (let k = 0; k < 8; k++) {
      act(s, pid, 'rail.steelTake', { kind });
      if (!act(s, pid, 'rail.steel')) break;
    }
}
/** The weaker form of R1's dropped "yard <= sent": everything line 2 has out by cart or train, the yard included, was
 * made for it at the Village (a stretch's kit or the works'). */
function sent(s: Seed, what: string) {
  const r = rail(s.w),
    st = steel(s.w),
    c = cart(s.w);
  assert.ok(r.depot + c.logs + aboard(s.w, 'logs') + st.yardLogs <= r.depotProduced + st.outLogs, `${what}: logs`);
  // The greybox route's kit rails (Leg.loadedRails, off the forge rack at the Village) ride and rack beside them, as the
  // load check counts them (railway-check-steel.ts, 'steel sent rails').
  let legRails = 0;
  s.w.each([Leg], (_id, l) => (legRails += l.loadedRails));
  assert.ok(
    r.depotRails + c.rails + aboard(s.w, 'rails') + st.yardRails <= r.shelfOut + st.outRails + legRails,
    `${what}: rails`,
  );
}

test('review: a save and load every 7 ticks through the kit out, the casts and the steel home changes nothing', () => {
  const a = seed(railwayAtRing('ring-joined')),
    b = seed(railwayAtRing('ring-joined'));
  let fed = false,
    midSteel = 0,
    midKit = 0;
  for (let t = 0; t < 40000 && shed(a.w).steel < STEEL.total; t++) {
    for (const s of [a, b]) {
      advance(s, 1);
      if (!fed && steel(s.w).yardLogs + steel(s.w).yardRails === STEEL.logs + STEEL.rails) feedAll(s, 'a');
    }
    fed ||= steel(a.w).lit >= 0;
    if (t % 7 === 0) {
      midSteel += Number(aboard(b.w, 'steel') > 0);
      midKit += Number(aboard(b.w, 'logs') + aboard(b.w, 'rails') > 0);
      b.w = restore(b.w);
    }
    sent(a, `tick ${a.t}`);
    assert.equal(a.w.hash(), b.w.hash(), `tick ${a.t}`);
  }
  assert.equal(shed(a.w).steel, STEEL.total);
  assert.equal(invariant(b.w), null);
  assert.ok(midSteel > 5 && midKit > 5, `restored with steel aboard ${midSteel} times, kit aboard ${midKit}`);
});

test('review: a bill fed from backs while its kit rides leaves no kit riding the trains for good', () => {
  const s = seed(railwayAtRing('ring-joined'));
  assert.equal(aboard(s.w, 'logs'), STEEL.logs, 'the kit is aboard at the seed');
  // Eight ordinary logs off a pile into the bill before the train arrives ("any logs and rails count").
  for (let k = 0; k < 40 && steel(s.w).logs < STEEL.logs; k++) {
    const p = pilesWithIds(s.w).find((q) => q.kind === 0);
    assert.ok(p, 'a pile of logs');
    act(s, 'a', 'rail.take', { id: p.id, kind: 0 });
    act(s, 'a', 'rail.steel');
  }
  assert.equal(steel(s.w).logs, STEEL.logs, 'the logs fed by hand');
  assert.equal(account(s.w, 'a')!.carry >= 0, true);
  for (let t = 0; t < 6000 && steel(s.w).lit < 0; t++) {
    advance(s, 1);
    if (steel(s.w).yardRails) feedAll(s, 'a');
  }
  assert.ok(steel(s.w).lit >= 0, 'lit');
  for (let t = 0; t < 40000 && shed(s.w).steel < STEEL.total; t++) advance(s, 1);
  assert.equal(shed(s.w).steel, STEEL.total, 'all twelve home');
  assert.equal(invariant(s.w), null);
  assert.deepEqual(steelNeed(s.w), { logs: 0, rails: 0 });
  assert.deepEqual(
    // The works' kit: a greybox leg's kit (Train.legKit) rides until its railhead opens and is not the works'.
    trains(s.w).map((r) => (r.legKit ? 0 : r.logs + r.rails)),
    trains(s.w).map(() => 0),
    'kit still aboard with the works finished: nowhere takes it',
  );
});
