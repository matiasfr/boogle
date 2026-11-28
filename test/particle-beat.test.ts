import assert from 'node:assert/strict';
import { test } from 'node:test';
import { particleBeat } from '../src/render/particle-pool.ts';

test('ambient births thin at low detail, sleep at zero and never catch up in bursts', () => {
  let scale = 1;
  const due = particleBeat(1, () => scale);
  assert.equal(due(0), false);
  assert.equal(due(0.25), true);
  assert.equal(due(0.5), false);
  scale = 2;
  assert.equal(due(0.5), true);
  assert.equal(due(1), false);
  assert.equal(due(1), true);
  scale = 0;
  assert.equal(due(60), false);
  scale = 1;
  assert.equal(due(60), true);
  assert.equal(due(0.01), false);
});
