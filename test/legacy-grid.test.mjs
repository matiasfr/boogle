import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_N, LEGACY_SHIFT, isLegacyCell, fromLegacy, migrateTerrainDeltas } from '../src/world/legacy-grid.js';

test('old cells move by the fixed offset and keep their values', () => {
  const n = 409;
  const old = [5 * LEGACY_N + 7, -120, 64 * LEGACY_N + 64, 35];
  const moved = migrateTerrainDeltas(old, n);
  assert.deepEqual(moved, [
    (5 + LEGACY_SHIFT) * n + 7 + LEGACY_SHIFT,
    -120,
    (64 + LEGACY_SHIFT) * n + 64 + LEGACY_SHIFT,
    35,
  ]);
});

test('out-of-range or junk indices are dropped', () => {
  assert.deepEqual(migrateTerrainDeltas([-1, 5, LEGACY_N * LEGACY_N, 5, 1.5, 5], 409), []);
});

test('a migrated cell is never mistaken for an old one', () => {
  assert.ok(isLegacyCell(0, 128));
  const [i, j] = fromLegacy(128, 128);
  assert.equal(isLegacyCell(i, j), false);
  assert.equal(isLegacyCell(...fromLegacy(0, 0)), false);
});
