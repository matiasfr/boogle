import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heldId, inv, onLetGo, take, emptyHand } from '../src/player/inventory.ts';

const letGo: string[] = [];
onLetGo((id) => letGo.push(id));

test('take refuses an id that is not in the catalog', () => {
  const version = inv.version;
  assert.equal(take('driftwood'), false, 'a removed item never reaches a hand the name tag would name');
  assert.equal(inv.version, version);
  assert.equal(heldId(), null);
});

test('one thing in your hand: a new one pushes the old one out', () => {
  assert.equal(take('frisbee'), true);
  assert.deepEqual(letGo, [], 'nothing to let go of from empty hands');
  assert.equal(take('seeds'), true);
  assert.deepEqual(letGo, ['frisbee']);
  assert.equal(heldId(), 'seeds');
  assert.equal(emptyHand(), 'seeds');
  assert.equal(heldId(), null);
  assert.deepEqual(letGo, ['frisbee'], 'using it is not letting go');
});
