// Requested regression: an invite must retain its sender's authority entry, not just the visible room name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isProductionRailway, pageQuery, roomInviteQuery } from '../src/proto/flags.ts';

test('explicit Place co-op invites retain the legacy entry, variant and co-op mode', () => {
  for (const search of ['?proto=place&coop=1', '?proto=place&v=village&coop=1', '?proto=place&coop=0&room=custom']) {
    const original = pageQuery(search);
    const invite = roomInviteQuery(original.get('room')!, `${search}&fresh=1&dev=1&shot=play`);
    const received = pageQuery(invite);
    assert.equal(isProductionRailway(search), false);
    assert.equal(isProductionRailway(invite), false);
    for (const key of ['proto', 'v', 'coop', 'room']) assert.equal(received.get(key), original.get(key), key);
    for (const key of ['fresh', 'dev', 'shot']) assert.equal(new URLSearchParams(invite).has(key), false, key);
  }
});

test('production invites remain production even though their effective prototype is Place', () => {
  for (const search of ['', '?room=custom', '?v=village&coop=1']) {
    const original = pageQuery(search);
    const invite = roomInviteQuery(original.get('room')!, search);
    assert.equal(new URLSearchParams(invite).has('proto'), false);
    assert.equal(isProductionRailway(invite), true);
    assert.equal(pageQuery(invite).get('room'), original.get('room'));
  }
});

test('other explicit prototypes retain their launch selection', () => {
  const prototype = roomInviteQuery('test-room', '?proto=crossing&v=crawl&coop=1');
  assert.equal(pageQuery(prototype).get('proto'), 'crossing');
  assert.equal(pageQuery(prototype).get('v'), 'crawl');
  assert.equal(pageQuery(prototype).get('coop'), '1');
  assert.equal(isProductionRailway(prototype), false);
});

test('the bare address and headless tools open the current game; retired classic selectors do not', () => {
  for (const search of ['', '?classic=1', '?island=low', '?room=island-low']) {
    assert.equal(isProductionRailway(search), true, search);
    assert.equal(pageQuery(search).get('proto'), 'place', search);
  }
  assert.equal(pageQuery('?classic=1').get('room'), 'boogle');
  assert.equal(pageQuery().get('room'), 'boogle'); // Node has no location
});
