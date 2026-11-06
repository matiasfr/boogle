import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkpointPair } from '../dev/look/checkpoint-pair.ts';
import type { SaveState } from '../dev/look/observe.ts';
import { expectedRestore } from '../dev/look/restore-pair.ts';

const key = 'boogle-place-coop-v2:proto-place';
function peer(authority: boolean, people: number, player: number) {
  const save: SaveState = {
    beat: 'pier-ending',
    t: player * 10,
    pose: { x: player, y: 25, z: 0, yaw: 0, pitch: 0 },
    route: { step: 30, delivered: player * 20, mode: 'coop' },
    storage: {
      [key]: JSON.stringify({ shared: { job: { people, score: { metres: 700 } } }, personal: { player } }),
      'boogle.pid': String(player),
    },
  };
  return { authority, save };
}

test('paired checkpoints restore one authoritative population while retaining each personal save and pose', () => {
  const peers = [peer(false, 48, 1), peer(true, 64, 2)];
  const original = JSON.stringify(peers);
  const pair = checkpointPair(peers, 'proto-place');
  pair.forEach((save, i) => {
    assert.deepEqual(expectedRestore({ ...save, room: 'proto-place', query: 'coop=1' })?.progress, {
      track: 700,
      town: 64,
    });
    assert.deepEqual(JSON.parse(save.storage[key]!).personal, { player: i + 1 });
    assert.deepEqual(save.pose, peers[i]!.save.pose);
    assert.deepEqual(save.route, peers[i]!.save.route);
    assert.equal(save.storage['boogle.pid'], String(i + 1));
  });
  assert.equal(JSON.stringify(peers), original, 'raw observations remain untouched');
});

test('refuse ambiguous authority or mismatched barriers instead of publishing a mixed fixture', () => {
  assert.throws(() => checkpointPair([peer(true, 64, 1), peer(true, 48, 2)], 'proto-place'), /one authority/);
  const peers = [peer(true, 64, 1), peer(false, 48, 2)];
  peers[1]!.save.route!.step++;
  assert.throws(() => checkpointPair(peers, 'proto-place'), /same route barrier/);
  peers[1]!.save.route!.step--;
  peers[0]!.save.storage[key] = JSON.stringify({ shared: { job: { score: { metres: 700 } } } });
  assert.throws(() => checkpointPair(peers, 'proto-place'), /no population/);
});
