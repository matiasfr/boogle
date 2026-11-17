import test from 'node:test';
import assert from 'node:assert/strict';
import { ROTUNDA_HOME } from '../src/place/home-station.ts';
import { bayOccupants } from '../src/place/rotunda.ts';

test('Home waiting engines leave in bay order as the existing fleet joins', () => {
  for (const [beat, serving, bays] of [
    ['arrival before stage 1', 1, [3, -2, -1, 1, 2]],
    ['stage 1 before the Pier', 1, [3, -2, -1, 1, 2]],
    ['Pier, including arrival after Q6', 2, [-2, -1, 1, 2]],
    ['Railhead, before steel raises the store', 3, [-1, 1, 2]],
    ['first greybox section, fleet fully joined', 6, []],
  ] as const) {
    const occupants = bayOccupants(ROTUNDA_HOME, { serving });
    assert.deepEqual(occupants, bays, beat);
    assert.ok(!occupants.includes(0), 'the working bay is not a waiting engine');
  }
  // A blocked join is still waiting: the greybox's three join through the existing train rules.
  assert.deepEqual(bayOccupants(ROTUNDA_HOME, { serving: 4 }), [1, 2]);
  assert.deepEqual(bayOccupants(ROTUNDA_HOME, { serving: 5 }), [2]);
  assert.deepEqual(bayOccupants({ ...ROTUNDA_HOME, id: 'port' }, { serving: 1 }), []);
});
