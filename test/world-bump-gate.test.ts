// The daily world wipe's rule (dev/world-bump-gate.ts): once a day, and only with nobody on the server.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DAY_MS, WINDOW_MS, decide, playersOn, worldVersion } from '../dev/world-bump-gate.ts';

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

test('counts every room, and knows nothing without a token or a clean answer', async () => {
  const answer = (body: unknown, status = 200) =>
    (async () => Response.json(body, { status })) as unknown as typeof fetch;
  const server = 'http://server.invalid';
  assert.equal(await playersOn(server, 'token', answer({ rooms: [{ players: 0 }, { players: 2 }] })), 2);
  assert.equal(await playersOn(server, 'token', answer({ rooms: [] })), 0);
  // One room's count says nothing about the others, so there is no fallback to the public room status.
  assert.equal(await playersOn(server, null, answer({ players: 0 })), null);
  assert.equal(await playersOn(server, 'token', answer({ rooms: [{}] })), null);
  assert.equal(await playersOn(server, 'token', answer({}, 401)), null);
  const down = (async () => {
    throw new Error('no route');
  }) as unknown as typeof fetch;
  assert.equal(await playersOn(server, 'token', down), null);
});

test('reads the version line and nothing else', () => {
  assert.equal(worldVersion("// v75 (2026-11-26): a note\nexport const WORLD_NS = 'v75';\n"), 'v75');
  assert.equal(worldVersion("const WORLD_NS = 'v75';"), null);
});
