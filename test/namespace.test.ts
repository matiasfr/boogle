// The world namespace (src/world/namespace.ts): every room id it makes fits the server's rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_NS, worldRoomId } from '../src/world/namespace.ts';
import { isRailwayRoom, RAILWAY_PLAY_NS, railwayRoomId } from '../src/world/railway-namespace.ts';

test('world room ids are namespaced and stay inside [a-z0-9-]{1,32}', () => {
  assert.equal(worldRoomId('beach'), `${WORLD_NS}-beach`);
  assert.match(WORLD_NS, /^[a-z0-9]+$/, 'PeerJS ids allow no dots');
  for (const room of ['a', 'beach', 'x'.repeat(32), 'my-room-with-a-very-long-name-ok'])
    assert.match(worldRoomId(room), /^[a-z0-9-]{1,32}$/, room);
  const a = 'abcdefghijklmnopqrstuvwxyzab-one',
    b = 'abcdefghijklmnopqrstuvwxyzab-two';
  assert.notEqual(worldRoomId(a), worldRoomId(b), 'long names that share a start still get their own world');
});

test('railway room names are disjoint from classic and legacy Place', () => {
  for (const room of ['boogle', 'proto-place', 'x'.repeat(32)]) {
    const id = railwayRoomId(room);
    assert.match(id, /^[a-z0-9-]{1,32}$/);
    assert.ok(isRailwayRoom(id));
    assert.notEqual(id, worldRoomId(room));
  }
  assert.equal(isRailwayRoom('t1v01-proto-production-core'), false, 'the isolated t1v01 rooms went at v14');
  assert.notEqual(railwayRoomId('a'.repeat(31) + 'x'), railwayRoomId('a'.repeat(31) + 'y'));
});

test('railway rooms follow the world break', () => {
  const current = railwayRoomId('boogle');
  assert.equal(current, `rail-${WORLD_NS}-boogle`);
  assert.equal(isRailwayRoom(current), true);
  assert.equal(isRailwayRoom('t1v02-boogle'), false);
  assert.equal(isRailwayRoom(`${RAILWAY_PLAY_NS}-`), false);
});

test('classic and railway encodings cannot overlap, including reserved-looking and shortened names', () => {
  const names = ['demo', 'rail-demo', `rail-${WORLD_NS}-demo`, 'rail-' + 'x'.repeat(60), 'x'.repeat(60)];
  for (const name of names) {
    const classic = worldRoomId(name);
    assert.equal(isRailwayRoom(classic), false, `classic ${name} must select the classic host`);
    for (const railwayName of names) assert.notEqual(classic, railwayRoomId(railwayName));
    assert.match(railwayRoomId(name), /^[a-z0-9-]{1,32}$/);
    assert.ok(isRailwayRoom(railwayRoomId(name)));
  }
  assert.notEqual(worldRoomId('rail-demo'), railwayRoomId('demo'));
});
