// src/player/reach.ts: a box up on a ledge is in reach from the ledge and from beside it at its height, not from the ground
// under it (owner, 10 November 2026: the mossy scarf opened from the ground under the lookout).
import '../dev/sim/hooks.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { secretsBindings, secretsSource } from './helpers/secrets-golden.ts';
import { sourceModule } from '../dev/level/source.ts';
import { inReach } from '../src/player/reach.ts';
import { PLAYER_R } from '../src/constants.ts';
import { padById } from '../src/place/tech-layout.ts';

const REACH = 3.4;
// The lookout's box on its top; the ground round its block is 17.03 to 17.12 (measured 18 November 2026; the lookout
// secret's `from` once said 17.46).
const top = padById('lookout').top,
  ground = 17.05,
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

// G27 (Grant, 14 November 2026: one jump and Open took the scarf from the ground; docs/plans/grant-c8-batch.md): a box
// up on a ledge (a SECRETS row with a `y`) is given the height it's opened from, and your feet may be at most 0.3 m under
// that, with no slope allowance. One jump from the ground peaks about 1.68 m up (7.6 m/s, gravity 18, the apex float).
const APEX = 1.68;
test('a raised box, at the top of one jump from the ground beside its block: not offered', () => {
  for (const d of [0.9, 1.5, 2.5, 3.3])
    assert.ok(!inReach(standing(box.x + d, ground + APEX, box.z), box, REACH, top), `${d} m out`);
  // 3.3 m out the ground rule allows 0.6 + 0.3 × 3.3 = 1.59 m under the box; a jump's top is 1.27 m under it.
  assert.ok(inReach(standing(box.x + 3.3, ground + APEX, box.z), box, REACH), 'the ground rule would offer it');
});
test('a raised box, from its ledge or just under it: offered; any lower: not, however far out', () => {
  assert.ok(inReach(standing(box.x + 1.5, top, box.z), box, REACH, top), 'on the pad');
  assert.ok(inReach(standing(box.x + 3.3, top, box.z), box, REACH, top), 'the reach across is as generous as ever');
  assert.ok(inReach(standing(box.x + 1.5, top - 0.25, box.z), box, REACH, top), 'a step under the ledge');
  assert.ok(!inReach(standing(box.x + 3.3, top - 0.4, box.z), box, REACH, top), 'no slope allowance');
  assert.ok(inReach(standing(box.x + 1, top + 1.6, box.z), box, REACH, top), 'mid-jump from the pad');
  assert.ok(!inReach(standing(box.x + 1, top + 3, box.z), box, REACH, top), 'far over it');
});
test('a tower box on its plinth, a metre over the slab it is opened from: offered from the slab, not from under it', () => {
  const slab = 24,
    plinthed = { x: 0, y: slab + 1, z: 0 };
  for (const d of [1.1, 1.5, 3.3]) assert.ok(inReach(standing(d, slab, 0), plinthed, REACH, slab), `${d} m out`);
  assert.ok(!inReach(standing(1.5, slab - 0.5, 0), plinthed, REACH, slab), 'half a metre under the slab');
});
test('the view gives each raised box its ledge: its pad, or for the tower two the slab under the plinth', async () => {
  const c = await secretsBindings();
  type Built = { ledges(): Record<string, number> };
  const { createSecretsView } = sourceModule<{ createSecretsView(owner: unknown, store: unknown): Promise<Built> }>(
    secretsSource(),
    c.bindings,
  );
  const view = await createSecretsView(c.createOwnedView(), c.store);
  assert.deepEqual(view.ledges(), {
    lookout: 20,
    alcove: 12,
    firstpull: 24,
    nook: 63,
    loft: 28.4,
    balcony: 24.4,
    stack: 15,
  });
});
