// Complete tuning values, validation and deterministic round-trips.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTune,
  okTune,
  setTune,
  serializeTune,
  loadTune,
  hashTune,
  isProtoRoom,
  TUNABLES,
} from '../src/sim/tune.ts';

test('the revision is part of the hash: returning to defaults is not the initial state', () => {
  const t = createTune();
  assert.deepEqual(serializeTune(t), { revision: 0, values: t.v });
  const initial = hashTune(t);
  const key = TUNABLES[0].key;
  setTune(t, key, TUNABLES[0].def + 1);
  setTune(t, key, TUNABLES[0].def);
  assert.notEqual(hashTune(t), initial, 'returning to defaults preserves the accepted revision');
});

test('keys and bounds', () => {
  for (const { key, min, max, def } of TUNABLES) {
    assert.ok(okTune(key, def) && okTune(key, min) && okTune(key, max), key);
    assert.ok(!okTune(key, min - 1) && !okTune(key, max + 1) && !okTune(key, def + 0.5) && !okTune(key, String(def)));
  }
  assert.ok(!okTune('nope', 1));
  assert.ok(!okTune('__proto__', 1));
});

test('round-trip keeps the hash; bad or incomplete saves throw', () => {
  const t = createTune();
  setTune(t, 'railFeedMs', 80);
  setTune(t, 'railLaySpeed', 60);
  const u = createTune();
  loadTune(u, JSON.parse(JSON.stringify(serializeTune(t))));
  assert.deepEqual(u.v, t.v);
  assert.equal(hashTune(u), hashTune(t));
  const edited = createTune();
  loadTune(edited, { ...serializeTune(t), values: { ...t.v, railLaySpeed: 61 } });
  assert.notEqual(hashTune(edited), hashTune(t));
  const missing: Record<string, number> = { ...t.v };
  delete missing.railFeedMs;
  assert.throws(() => loadTune(u, { ...serializeTune(t), values: missing }), /tune:/);
  assert.throws(() => loadTune(u, { ...serializeTune(t), values: { ...t.v, yield: 5 } }), /tune:/);
  assert.throws(() => loadTune(u, { what: 3 }));
  assert.throws(() => loadTune(u, []));
  assert.throws(() => loadTune(u, { ...serializeTune(t), revision: -1 }));
});

test('only proto- rooms tune', () => {
  assert.ok(isProtoRoom('v02-proto-haul') && isProtoRoom('proto-haul'));
  assert.ok(!isProtoRoom('v02-beach') && !isProtoRoom('v02-myproto-x') && !isProtoRoom(undefined));
});
