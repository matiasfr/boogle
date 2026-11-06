// The world namespace (src/world/namespace.ts): every room id it makes fits the server's rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_NS, worldRoomId } from '../src/world/namespace.ts';
import {
  isPlayableRailwayRoom,
  isLineRailwayRoom,
  isRailwayRoom,
  railwayRoomId,
} from '../src/world/railway-namespace.ts';

test('panel builds cannot share transport lead or world saves with pre-panel v07 builds', () => {
  for (const room of ['default', 'proto-place-coop', 'private-friends', 'a'.repeat(32)]) {
    const current = worldRoomId(room);
    // v07 used the same room-name shortening rule. Its prefix is a frozen mixed-build fixture.
    const legacy = current.replace(/^[^-]+-/, 'v07-');
    assert.notEqual(current, legacy, `old room lead must not arbitrate machine seats in ${room}`);
    assert.ok(!current.startsWith('v07-'), 'custom/long names cannot bypass the isolation');
  }
});

test('world room ids are namespaced and stay inside [a-z0-9-]{1,32}', () => {
  assert.equal(worldRoomId('beach'), `${WORLD_NS}-beach`);
  assert.match(WORLD_NS, /^[a-z0-9]+$/, 'PeerJS ids allow no dots');
  for (const room of ['a', 'beach', 'x'.repeat(32), 'my-room-with-a-very-long-name-ok'])
    assert.match(worldRoomId(room), /^[a-z0-9-]{1,32}$/, room);
  const a = 'abcdefghijklmnopqrstuvwxyzab-one',
    b = 'abcdefghijklmnopqrstuvwxyzab-two';
  assert.notEqual(worldRoomId(a), worldRoomId(b), 'long names that share a start still get their own world');
});

test('playable T1 room names are disjoint from classic, legacy Place and isolated headless proofs', () => {
  for (const room of ['boogle', 'proto-place', 'x'.repeat(32)]) {
    const id = railwayRoomId(room);
    assert.match(id, /^[a-z0-9-]{1,32}$/);
    assert.ok(isPlayableRailwayRoom(id));
    assert.ok(isRailwayRoom(id));
    assert.notEqual(id, worldRoomId(room));
  }
  assert.equal(isPlayableRailwayRoom('t1v01-proto-production-core'), false);
  assert.notEqual(railwayRoomId('a'.repeat(31) + 'x'), railwayRoomId('a'.repeat(31) + 'y'));
});

test('line-one production follows the world break while legacy and isolated identities stay separate', () => {
  const current = railwayRoomId('boogle');
  assert.equal(current, `${WORLD_NS}-rail-boogle`);
  assert.equal(isLineRailwayRoom(current), true);
  assert.equal(isLineRailwayRoom('t1v02-boogle'), false);
  assert.equal(isPlayableRailwayRoom('t1v02-boogle'), true);
  assert.equal(isRailwayRoom('t1v01-proto-production-core'), true);
  assert.equal(isLineRailwayRoom('v00-rail-boogle'), false);
  assert.equal(isLineRailwayRoom(`${WORLD_NS}-rail-`), false);
});
