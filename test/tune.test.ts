// Complete tuning identity, validation and deterministic round-trips.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTune,
  okTune,
  setTune,
  costIn,
  serializeTune,
  loadTune,
  hashTune,
  isProtoRoom,
  TUNABLES,
  TUNE_CATALOG,
  tuneCatalog,
  migrateTune,
} from '../src/sim/tune.ts';
import { FNV_SEED } from '../src/sim/hash.ts';
import { HARD_CAP } from '../src/sim/stacks.ts';
import { TRACK, HELPER, AGES } from '../src/sim/route.ts';

test('defaults are saved and hashed with catalog and revision', () => {
  const t = createTune();
  assert.equal(t.v.hard, HARD_CAP);
  assert.equal(t.v.cost0, AGES[0]!.cost);
  assert.deepEqual(serializeTune(t), { catalog: TUNE_CATALOG, revision: 0, values: t.v });
  assert.notEqual(hashTune(t), FNV_SEED);
  const initial = hashTune(t);
  setTune(t, 'hard', 30);
  setTune(t, 'hard', HARD_CAP);
  assert.notEqual(hashTune(t), initial, 'returning to defaults preserves the accepted revision');
  assert.notEqual(tuneCatalog(TUNABLES.map((x) => ({ ...x, def: x.def + 1 }))), TUNE_CATALOG);
});

test('keys and bounds', () => {
  for (const { key, min, max, def } of TUNABLES) {
    assert.ok(okTune(key, def) && okTune(key, min) && okTune(key, max), key);
    assert.ok(!okTune(key, min - 1) && !okTune(key, max + 1) && !okTune(key, def + 0.5) && !okTune(key, String(def)));
  }
  assert.ok(!okTune('nope', 1));
  assert.ok(!okTune('__proto__', 1));
});

test('round-trip keeps the hash; bad saves throw', () => {
  const t = createTune();
  setTune(t, 'cost0', 30);
  setTune(t, 'trickle', 50);
  const u = createTune();
  loadTune(u, JSON.parse(JSON.stringify(serializeTune(t))));
  assert.deepEqual(u.v, t.v);
  assert.equal(hashTune(u), hashTune(t));
  assert.notEqual(hashTune(t), FNV_SEED);
  assert.throws(() => loadTune(u, { cost0: 1 }));
  assert.throws(() => loadTune(u, { what: 3 }));
  assert.throws(() => loadTune(u, []));
  assert.throws(() => loadTune(u, { ...serializeTune(t), catalog: 'different' }));
  assert.throws(() => loadTune(u, { ...serializeTune(t), values: { yield: 5 } }));
  assert.throws(() => loadTune(u, { ...serializeTune(t), revision: -1 }));
});

test('a save with retired keys (soft cap, spill) still loads, without them', () => {
  const u = createTune();
  loadTune(u, migrateTune({ soft: 12, spill: 5, hard: 40 }));
  assert.equal(u.v.hard, 40);
  assert.equal(serializeTune(u).values.hard, 40);
  assert.equal(Object.keys(serializeTune(u).values).length, TUNABLES.length);
});

test('wood costs follow the tuning', () => {
  const t = createTune();
  setTune(t, 'cost0', 24);
  setTune(t, 'helper0', 10);
  assert.equal(costIn(t)(0, TRACK), 24);
  assert.equal(costIn(t)(2, HELPER), 10);
});

test('only proto- rooms tune', () => {
  assert.ok(isProtoRoom('v02-proto-haul') && isProtoRoom('proto-haul'));
  assert.ok(!isProtoRoom('v02-beach') && !isProtoRoom('v02-myproto-x') && !isProtoRoom(undefined));
});
