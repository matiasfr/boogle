import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addField, mergeFields } from '../src/netplay/presence-fields.ts';
import type { Field } from '../src/netplay/presence-fields.ts';

test('reused presence emits null for cleared fields without losing valid falsy values or key order', () => {
  let active = true;
  const fields: Field[] = [
    ['a', () => (active ? 30 : null)],
    ['b', () => (active ? true : undefined)],
    [
      'c',
      () => {
        if (active) return 'ready';
        throw new Error('broken feature');
      },
    ],
    ['d', () => 0],
  ];
  const packet = { t: 1 };
  assert.deepEqual(mergeFields(packet, fields), { t: 1, a: 30, b: true, c: 'ready', d: 0 });
  const keys = Object.keys(packet);
  active = false;
  packet.t = 2;
  assert.deepEqual(
    mergeFields(packet, fields),
    { t: 2, a: null, b: null, c: null, d: 0 },
    'a stopped field must send an explicit null to clear the remote value',
  );
  assert.deepEqual(Object.keys(packet), keys);
});

test('fields never take core keys or an earlier field', () => {
  const fields: Field[] = [];
  const core = ['v', 'p'];
  assert.equal(
    addField(fields, 'p', () => 'feature', core),
    false,
  );
  assert.equal(
    addField(fields, 'x', () => 'first', core),
    true,
  );
  assert.equal(
    addField(fields, 'x', () => 'second', core),
    false,
  );
  assert.deepEqual(mergeFields({ v: 1, p: [1, 2, 3] }, fields), { v: 1, p: [1, 2, 3], x: 'first' });
});
