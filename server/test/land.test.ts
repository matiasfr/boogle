import test from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeLand } from '../src/host/land.ts';

test('the home land: its grid size and gifts layout', () => {
  const { land } = loadHomeLand();
  assert.ok(land.n > 100 && Array.isArray(land.layout.trees));
});
