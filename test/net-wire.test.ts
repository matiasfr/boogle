// The server room's wire helpers and the shared ids (src/net/ws-wire.ts, src/net/ids.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decode, encode, roomUrl } from '../src/net/ws-wire.ts';
import { okId, peerHostId } from '../src/net/ids.ts';

test('decode accepts only JSON objects with a string t', () => {
  assert.deepEqual(decode(encode({ t: 'p', s: 1 })), { t: 'p', s: 1 });
  for (const bad of ['3', 'null', '[1,2]', '{"s":1}', '{"t":2}', 'not json']) assert.equal(decode(bad), null, bad);
});

test('roomUrl maps http to ws and https to wss', () => {
  assert.equal(
    roomUrl('http://localhost:9000', 'beach', { self: 'abc', pid: 'p1', key: 'k1', b: 'dev' }),
    'ws://localhost:9000/room/beach?self=abc&pid=p1&key=k1&b=dev',
  );
  assert.equal(
    roomUrl('https://boogle.fly.dev/', 'a-b', { self: 'x1', pid: 'p2', key: 'k2', b: 'b7' }),
    'wss://boogle.fly.dev/room/a-b?self=x1&pid=p2&key=k2&b=b7',
  );
});

test('peer host ids and selfIds', () => {
  assert.equal(peerHostId('beach'), 'boogle-beach-host');
  assert.equal(peerHostId('a-b'), 'boogle-a_2db-host');
  assert.equal(okId('server'), true, 'the server reserves "server" itself: okId alone lets it through');
  assert.equal(okId('Bad!'), false);
});
