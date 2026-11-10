// src/player/reach.ts: a box up on a ledge is in reach from the ledge and from beside it at its height, not from the ground
// under it (owner, 10 November 2026: the mossy scarf opened from the ground under the lookout).
import test from 'node:test';
import assert from 'node:assert/strict';
import { inReach } from '../src/player/reach.ts';
import { PLAYER_R } from '../src/constants.ts';
import { padById } from '../src/proto/place/tech-layout.ts';

const REACH = 3.4;
// The lookout's box on its top; the ground round it is 17.46 (tech-layout.ts, the lookout secret's `from`).
const top = padById('lookout').top,
  ground = 17.46,
  box = { x: -134, y: top, z: -119 };
const standing = (x: number, feet: number, z: number) => ({ x, y: feet + PLAYER_R, z });

test('on the platform beside the box: offered', () => {
  assert.ok(inReach(standing(box.x + 1.5, top, box.z), box, REACH));
  assert.ok(inReach(standing(box.x + 3.3, top, box.z), box, REACH), 'the reach across is as generous as ever');
});
test('on the ground under the box, or beside the platform: not offered', () => {
  assert.ok(!inReach(standing(box.x, ground, box.z), box, REACH), 'directly below');
  assert.ok(!inReach(standing(box.x + 2.5, ground, box.z), box, REACH), 'at the platform edge');
  assert.ok(!inReach(standing(box.x + 3.3, ground, box.z), box, REACH), 'at the edge of reach');
});
test('on a ledge beside it at platform height: offered', () => {
  assert.ok(inReach(standing(box.x - 3, top + 0.1, box.z + 1), box, REACH));
});
test('mid-jump beside it: offered; far over it: not', () => {
  assert.ok(inReach(standing(box.x + 1, top + 1.6, box.z), box, REACH));
  assert.ok(!inReach(standing(box.x + 1, top + 3, box.z), box, REACH));
});
test('a box on sloping ground: still offered from a little downhill', () => {
  const low = { x: 0, y: 10, z: 0 };
  assert.ok(inReach(standing(3, 9.2, 0), low, REACH), '0.8 m down over 3 m');
  assert.ok(!inReach(standing(1, 8.5, 0), low, REACH), '1.5 m down a step away is under a ledge');
});
test('out of reach across: not offered at any height', () => {
  assert.ok(!inReach(standing(box.x + 3.5, top, box.z), box, REACH));
});
