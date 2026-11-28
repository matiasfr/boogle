import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flat } from '../src/render/flat.ts';

Object.defineProperty(globalThis, 'location', { value: new URL('http://localhost'), configurable: true });
const { treeMaterial } = await import('../src/place/look.ts');

test('the crown owns its wind graph and timber and shared materials stay still', () => {
  const green = '#3f8a3a';
  assert.ok(treeMaterial(green, 'green').positionNode);
  assert.equal(treeMaterial(green, 'timber').positionNode, null);
  assert.equal(flat(green).positionNode, null);
});
