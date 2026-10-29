import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProtoState, parseFlags, ALL } from '../src/sim/proto.js';

test('URL flags parse', () => {
  assert.deepEqual(parseFlags(''), { mask: ALL });
  assert.equal(parseFlags('?proto=0').mask, 0);
  const p = createProtoState(parseFlags('?off=feel,gulls,nonsense'));
  assert.equal(p.on('feel'), false);
  assert.equal(p.on('gulls'), false);
  assert.equal(p.on('fish'), true);
});

test('proto state round-trips and the hash follows the bitmask', () => {
  const a = createProtoState(parseFlags('?off=fish'));
  const b = createProtoState();
  assert.notEqual(a.hash(), b.hash());
  b.load(JSON.parse(JSON.stringify(a.serialize())));
  assert.equal(b.hash(), a.hash());
  assert.equal(b.on('fish'), false);
});
