// The daily world wipe's rule (dev/world-bump-gate.ts): once a day, and only with nobody on the server.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DAY_MS, WINDOW_MS, decide, worldVersion } from '../dev/world-bump-gate.ts';

const NOW = Date.UTC(2026, 10, 28, 9);
const MIN = 60_000;

test('ships with no wipe today and nobody on', () => {
  assert.equal(decide(NOW, [], 0).ship, true);
  assert.equal(decide(NOW, [NOW - DAY_MS], 0).ship, true);
});

test('holds while anyone is on the server, or while that cannot be read', () => {
  assert.match(decide(NOW, [], 1).why, /1 player is on the server/);
  assert.match(decide(NOW, [], 3).why, /3 players are on the server/);
  assert.equal(decide(NOW, [], null).ship, false);
});

test('holds a second wipe on the same day', () => {
  const verdict = decide(NOW, [NOW - 5 * 60 * MIN], 0);
  assert.equal(verdict.ship, false);
  assert.match(verdict.why, /the next may ship after/);
});

test('bumps within an hour of the first are one wipe, and the run cannot be stretched', () => {
  assert.equal(decide(NOW, [NOW - 20 * MIN], 0).ship, true);
  // Three bumps 40 minutes apart: the run began 80 minutes ago, so the slot is spent.
  assert.equal(decide(NOW, [NOW - 80 * MIN, NOW - 40 * MIN], 0).ship, false);
  assert.equal(decide(NOW, [NOW - WINDOW_MS - MIN], 0).ship, false);
});

test('a bump dated after now is ignored', () => {
  assert.equal(decide(NOW, [NOW + 5 * MIN], 0).ship, true);
});

test('reads the version line and nothing else', () => {
  assert.equal(worldVersion("// v75 (2026-11-26): a note\nexport const WORLD_NS = 'v75';\n"), 'v75');
  assert.equal(worldVersion("const WORLD_NS = 'v75';"), null);
});
