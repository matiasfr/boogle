import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RUN_ID_RE, cleanLabel, makeRunId, parseDeviceLink, shortCode } from '../src/debug/device/id.ts';
import { LIMITS, LIMIT_KEYS } from '../src/debug/device/limits.ts';

test('a run id is dv- and 26 random characters, and is a playdata session id', () => {
  const id = makeRunId();
  assert.match(id, RUN_ID_RE);
  assert.match(id, /^[a-z0-9-]{8,40}$/); // server/src/playdata.ts SESSION_RE
  assert.notEqual(makeRunId(), id);
  assert.equal(shortCode(id), id.slice(-6));
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

test('the address: none, new, a run, damaged', () => {
  const id = makeRunId();
  assert.deepEqual(parseDeviceLink('?room=x'), { kind: 'none' });
  assert.deepEqual(parseDeviceLink('?device=new'), { kind: 'new', suite: 'quick', label: '' });
  assert.deepEqual(parseDeviceLink(`?device=${id}&label=iPhone%2015&mint=page`), {
    kind: 'run',
    id,
    suite: 'quick',
    label: 'iphone-15',
    self: true,
  });
  for (const bad of ['dv-short', '', 'DV-' + 'a'.repeat(26), `${id}x`])
    assert.deepEqual(parseDeviceLink(`?device=${bad}`), { kind: 'damaged' }, bad);
  assert.deepEqual(parseDeviceLink(`?device=${id}&suite=nope`), { kind: 'damaged' });
});

test('a label is the owners text cut to 40 characters of a-z0-9-', () => {
  assert.equal(cleanLabel('  ../../etc/passwd  '), 'etc-passwd');
  assert.equal(cleanLabel(null), '');
  assert.equal(cleanLabel('a'.repeat(39) + ' b'), 'a'.repeat(39));
});

test('every limit has a distinct field name the playdata endpoint keeps', () => {
  const keys = LIMITS.map((n) => LIMIT_KEYS[n]);
  assert.equal(new Set(keys).size, keys.length);
  for (const k of keys) assert.match(k, /^[a-z0-9_]{1,24}$/i); // FIELD_RE in server/src/playdata.ts
  assert.ok(keys.length <= 24); // MAX_FIELDS
});
