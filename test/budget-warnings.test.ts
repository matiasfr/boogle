// Timing targets warn and never fail (owner, 10 November: performance numbers guide, they never fail a build or cut
// scope). test/ecs-budget.test.ts and test/replicate-budget.test.ts report through budgetWarning: one printed line with
// each metric over its limit, its best time, the limit, the runs and the load scale; nothing when all are within. Under
// the warning sits a hard limit far above today's numbers (owner, 11 November: "Add a limit far above today's
// numbers"): hardLimitFailure names each metric over it, and the tests assert it is empty.
import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetWarning, hardLimitFailure } from './helpers/budget.ts';

test('a timing metric over its limit prints one warning with the numbers and does not throw', () => {
  const printed: string[] = [];
  const line = budgetWarning(
    'replication budget',
    { normalMs: 9.5, cloneMs: 1 },
    { normalMs: 2, cloneMs: 10 },
    1.5,
    5,
    (l) => printed.push(l),
  );
  assert.equal(printed.length, 1);
  assert.equal(line, printed[0]);
  assert.match(line!, /^warning: replication budget over its timing target \(reported, not a failure\): /);
  assert.match(line!, /normalMs 9\.500 ms \(limit 2\.0, best of 5, load x1\.5\)/);
  assert.doesNotMatch(line!, /cloneMs/);
});

test('within every limit prints nothing', () => {
  const printed: string[] = [];
  assert.equal(
    budgetWarning('ecs budget', { a: 1 }, { a: 2 }, 1, 1, (l) => printed.push(l)),
    null,
  );
  assert.deepEqual(printed, []);
});

test('over the warning limit but under the hard limit only warns', () => {
  const best = { normalMs: 3 };
  assert.ok(budgetWarning('replication budget', best, { normalMs: 2 }, 1, 5, () => {}));
  assert.equal(hardLimitFailure('replication budget', best, { normalMs: 4 }, 1, 5), '');
});

test('over the hard limit fails, with the limit stretched by the load scale', () => {
  const failure = hardLimitFailure(
    'replication budget',
    { normalMs: 9, cloneMs: 1 },
    { normalMs: 4, cloneMs: 20 },
    2,
    5,
  );
  assert.match(failure, /^replication budget over its hard limit /);
  assert.match(failure, /normalMs 9\.000 ms \(limit 8\.0, best of 5, load x2\.0\)/);
  assert.doesNotMatch(failure, /cloneMs/);
  // The same best under a load that stretches the limit past it passes.
  assert.equal(hardLimitFailure('replication budget', { normalMs: 9 }, { normalMs: 4 }, 2.5, 5), '');
  assert.throws(() => assert.equal(failure, '', failure), /over its hard limit/);
});
