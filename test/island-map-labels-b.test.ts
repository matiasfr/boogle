// As test/island-map-labels.test.ts, for the Home island layout (`?home=b`): its own process, so the layout flag is
// read as b before the layout loads.
import test from 'node:test';
import assert from 'node:assert/strict';

test('every Home island layout display places its names clear of each other, the edge and the stops', async () => {
  process.env.BOOGLE_HOME = 'b';
  const { checkHaltLabels } = await import('./helpers/island-labels.ts');
  // The island's two edges share one display: five, then the stack line's three heads and High Gorge.
  assert.equal(await checkHaltLabels(), 9);
});
