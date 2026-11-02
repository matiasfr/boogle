import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addField, mergeFields, hostField } from '../src/netplay/presence-fields.ts';
import type { Field, Presence } from '../src/netplay/presence-fields.ts';

// The room's presence(patch) rule (src/net/ws-room.ts): merge onto what we sent before, null deletes the key.
function applyPatch(mine: Presence, patch: Presence) {
  const next = { ...mine };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete next[k];
    else next[k] = v;
  }
  return next;
}

test('a getter that returns null or undefined, or throws, sends key: null so the room deletes it', () => {
  const pr = mergeFields({ t: 1 }, [
    ['a', () => null],
    ['b', () => undefined],
    [
      'c',
      () => {
        throw new Error('broken feature');
      },
    ],
    ['d', () => 0],
  ]);
  assert.deepEqual(pr, { t: 1, a: null, b: null, c: null, d: 0 });
  for (const k of ['a', 'b', 'c']) assert.ok(k in pr, `${k} is present (as null)`);
});

test('a field that stops is gone from the published presence, not repeated forever', () => {
  let kd: number | null = 30;
  const fields: Field[] = [['kd', () => kd]];
  let mine = applyPatch({}, mergeFields({ t: 1 }, fields));
  assert.equal(mine.kd, 30);
  kd = null;
  mine = applyPatch(mine, mergeFields({ t: 2 }, fields));
  assert.ok(!('kd' in mine));
  assert.equal(mine.t, 2);
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

test("a reused presence object keeps its keys in order and takes each send's values", () => {
  let kd: number | null = 30;
  const fields: Field[] = [
    ['a', () => 1],
    ['kd', () => kd],
  ];
  const pr = { t: 0 };
  pr.t = 1;
  let mine = applyPatch({}, mergeFields(pr, fields));
  assert.deepEqual(Object.keys(pr), ['t', 'a', 'kd']);
  kd = null;
  pr.t = 2;
  mine = applyPatch(mine, mergeFields(pr, fields));
  assert.deepEqual(Object.keys(pr), ['t', 'a', 'kd']);
  assert.deepEqual(mine, { t: 2, a: 1 });
});

test('a host field publishes only while host, and hears only real values', () => {
  let host = false;
  const heard: unknown[] = [];
  const h = hostField(
    () => ({ p: [1, 2] }),
    (v, time, peer) => heard.push([v, time, peer]),
    () => host,
  );
  assert.equal(h.get(), null);
  host = true;
  assert.deepEqual(h.get(), { p: [1, 2] });
  h.hear(null, 10, 'a');
  h.hear(undefined, 11, 'a');
  h.hear({ p: [3, 4] }, 12, 'b');
  assert.deepEqual(heard, [[{ p: [3, 4] }, 12, 'b']]);
});

test('a demoted host clears its host field on the next send', () => {
  let host = true;
  const h = hostField(
    () => ({ p: [5, 6] }),
    () => {},
    () => host,
  );
  let mine = applyPatch({}, mergeFields({ t: 1 }, [['g', h.get]]));
  assert.deepEqual(mine.g, { p: [5, 6] });
  host = false;
  mine = applyPatch(mine, mergeFields({ t: 2 }, [['g', h.get]]));
  assert.ok(!('g' in mine));
});
