import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mio0, toBigEndian } from '../src/guest/rom.ts';

const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

test('mio0 expands literals and back-references', () => {
  // "ABCABCABC": three literals, then 6 bytes copied from 3 back.
  const block = new Uint8Array(0x20);
  block.set(ascii('MIO0'));
  block.set([0, 0, 0, 9, 0, 0, 0, 0x14, 0, 0, 0, 0x16], 4); // size, compressed at, literals at
  block.set([0xe0, 0, 0, 0], 0x10); // literal, literal, literal, copy
  block.set([0x30, 0x02], 0x14); // length 3 + 3, distance 2 + 1
  block.set(ascii('ABC'), 0x16);
  const at = 4;
  const rom = new Uint8Array(at + block.length);
  rom.set(block, at);
  assert.equal(String.fromCharCode(...mio0(rom, at)), 'ABCABCABC');
});

test('toBigEndian reads .z64, .v64 and .n64 byte orders alike', () => {
  const z64 = new Uint8Array([0x80, 0x37, 0x12, 0x40, 1, 2, 3, 4]);
  const v64 = new Uint8Array([0x37, 0x80, 0x40, 0x12, 2, 1, 4, 3]);
  const n64 = new Uint8Array([0x40, 0x12, 0x37, 0x80, 4, 3, 2, 1]);
  for (const rom of [z64, v64, n64]) assert.deepEqual([...toBigEndian(rom)], [...z64]);
});
