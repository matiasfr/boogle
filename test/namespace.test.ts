// The world namespace (src/world/namespace.ts): every room id it makes fits the server's rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_NS, worldRoomId } from '../src/world/namespace.ts';

test('world room ids are namespaced and stay inside [a-z0-9-]{1,32}', () => {
  assert.equal(worldRoomId('beach'), `${WORLD_NS}-beach`);
  assert.match(WORLD_NS, /^[a-z0-9]+$/, 'PeerJS ids allow no dots');
  for (const room of ['a', 'beach', 'x'.repeat(32), 'my-room-with-a-very-long-name-ok'])
    assert.match(worldRoomId(room), /^[a-z0-9-]{1,32}$/, room);
  const a = 'abcdefghijklmnopqrstuvwxyzab-one',
    b = 'abcdefghijklmnopqrstuvwxyzab-two';
  assert.notEqual(worldRoomId(a), worldRoomId(b), 'long names that share a start still get their own world');
});
