// The world wipe's rule (dev/world-bump-gate.ts): any time, as long as nobody is on the server.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, playersOn, worldVersion } from '../dev/world-bump-gate.ts';

test('ships with nobody on, however many wipes went out today', () => {
  assert.equal(decide(0).ship, true);
});

test('holds while anyone is on the server, or while that cannot be read', () => {
  assert.match(decide(1).why, /1 player is on the server/);
  assert.match(decide(3).why, /3 players are on the server/);
  assert.equal(decide(1).ship, false);
  assert.equal(decide(null).ship, false);
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
