import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RUN_ID_RE, cleanLabel, makeRunId, parseDeviceLink, shortCode } from '../src/debug/device/id.ts';
import { LIMITS, LIMIT_KEYS } from '../src/debug/device/limits.ts';

test('a run id is dv- and 26 characters, and is a playdata session id', () => {
  const id = makeRunId();
  assert.match(id, RUN_ID_RE);
  assert.equal(id.length, 29);
  assert.match(id, /^[a-z0-9-]{8,40}$/); // server/src/playdata.ts SESSION_RE
  assert.equal(shortCode(id), id.slice(-6));
});

test('a thousand ids are distinct and use the whole alphabet', () => {
  const ids = new Set(Array.from({ length: 1000 }, () => makeRunId()));
  assert.equal(ids.size, 1000);
  const seen = new Set([...ids].join('').replace(/dv-/g, ''));
  assert.ok(seen.size >= 34, `only ${seen.size} symbols`);
});

test('bytes at or above 252 are skipped (no modulo bias)', () => {
  let calls = 0;
  const id = makeRunId((b) => {
    b.fill(255);
    if (++calls > 1) b.fill(36 * 2 + 5); // 77 % 36 = 5 -> 'f'
  });
  assert.equal(id, 'dv-' + 'f'.repeat(26));
  assert.equal(calls, 2);
});

test('the pattern refuses damaged ids', () => {
  for (const bad of [
    '',
    'dv-',
    'dv-abc',
    'DV-' + 'a'.repeat(26),
    'dv-' + 'a'.repeat(27),
    'dv-' + 'A'.repeat(26),
    'xx-' + 'a'.repeat(26),
    'dv-' + 'a'.repeat(25) + '/',
  ])
    assert.doesNotMatch(bad, RUN_ID_RE, bad);
});

test('the address: none, new, a run, damaged', () => {
  const id = makeRunId();
  assert.deepEqual(parseDeviceLink(''), { kind: 'none' });
  assert.deepEqual(parseDeviceLink('?room=x'), { kind: 'none' });
  assert.deepEqual(parseDeviceLink('?device=new'), { kind: 'new', suite: 'quick', label: '' });
  assert.deepEqual(parseDeviceLink(`?device=${id}&suite=quick&label=iPhone%2015`), {
    kind: 'run',
    id,
    suite: 'quick',
    label: 'iphone-15',
    self: false,
  });
  assert.equal(parseDeviceLink(`?device=${id}&mint=page`).kind, 'run');
  assert.deepEqual(parseDeviceLink(`?device=${id}&mint=page`), {
    kind: 'run',
    id,
    suite: 'quick',
    label: '',
    self: true,
  });
  assert.deepEqual(parseDeviceLink('?device=dv-short'), { kind: 'damaged' });
  assert.deepEqual(parseDeviceLink('?device='), { kind: 'damaged' });
  assert.deepEqual(parseDeviceLink(`?device=${id}&suite=nope`), { kind: 'damaged' });
});

test('a label is the owners text cut to 40 characters of a-z0-9-', () => {
  assert.equal(cleanLabel('iPhone 15 Pro!'), 'iphone-15-pro');
  assert.equal(cleanLabel('  ../../etc/passwd  '), 'etc-passwd');
  assert.equal(cleanLabel(null), '');
  assert.equal(cleanLabel('x'.repeat(60)).length, 40);
  assert.equal(cleanLabel('a'.repeat(39) + ' b'), 'a'.repeat(39));
});

test('every limit has a distinct field name the playdata endpoint keeps', () => {
  const keys = LIMITS.map((n) => LIMIT_KEYS[n]);
  assert.equal(new Set(keys).size, keys.length);
  for (const k of keys) assert.match(k, /^[a-z0-9_]{1,24}$/i); // FIELD_RE in server/src/playdata.ts
  assert.ok(keys.length <= 24); // MAX_FIELDS
});
