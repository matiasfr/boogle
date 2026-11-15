// The accepted input sequence behind the v31-v45 train pacing regressions. Unlike a dev jump-in, this is allowed
// to strike the rivet while the traveller is still hauling. v46's jump-ins now wait for haulSettled, which changes
// the fleet's phase at the rivet; keep this workload explicit so those measured bounds are not silently loosened.
import assert from 'node:assert/strict';
import { railwayAtRing } from '../../src/sim/railway-seed-ring.ts';
import { act, type Seed } from '../../src/sim/railway-seed-route.ts';
import { advanceWorks } from '../../src/sim/railway-seed-works.ts';
import { aperture, trains } from '../../src/sim/railway-rows.ts';
import { WORKS } from '../../src/sim/railway-works-layout.ts';
import { TRAIN_PHASE } from '../../src/sim/railway-train.ts';

export function ringRivetSequence(): Seed {
  const s = railwayAtRing('deck-laid');
  const until = (ok: () => boolean, max: number) => {
    for (let guard = 0; !ok(); guard++) {
      assert.ok(guard < max, 'the rivet sequence advances through accepted ops');
      advanceWorks(s, 1);
    }
  };
  const carry = () => {
    assert.equal(act(s, 'a', 'rail.footTake', { rack: 2 }), 1);
    assert.equal(act(s, 'a', 'rail.footSet', { site: 3 }), 1);
  };
  while (aperture(s.w).set < WORKS.ring) {
    until(() => aperture(s.w).rack > 0, 30000);
    carry();
  }
  until(() => aperture(s.w).rack === WORKS.counterweight, 12000);
  until(() => trains(s.w).some((r) => r.wagon && !(r.phase === TRAIN_PHASE.STAND && r.at === 4)), 2000);
  assert.equal(act(s, 'a', 'rail.brace', { revision: 1 }), 1);
  while (aperture(s.w).cw < WORKS.counterweight) carry();
  assert.equal(act(s, 'a', 'rail.strike', { id: 2 }), 1);
  advanceWorks(s, 100);
  return s;
}
