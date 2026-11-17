import test from 'node:test';
import assert from 'node:assert/strict';
import { checkHomeSignals } from '../dev/level/home-signals.ts';
test('held Home signals preserve whole-train clearance and measured pins', () => {
  const result = checkHomeSignals();
  assert.equal(result.failures, 0, result.problems.join('\n'));
});
test('Home signal rows reject moving a held tail back into the turnout', () => {
  const result = checkHomeSignals(-0.1);
  assert.ok(result.problems.some((p) => p.includes('stub turnout') && p.includes('< minimum 0')));
});
