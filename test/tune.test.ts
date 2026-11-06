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
  migrateTuneV1,
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
  for (const key of ['railRegrowMinutes', 'railRecoveryMinutes']) {
    assert.notEqual(
      tuneCatalog(TUNABLES.map((x) => (x.key === key ? { ...x, def: x.def + 1 } : x))),
      TUNE_CATALOG,
      `${key} default alone participates in build identity`,
    );
  }
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

test('only the exact published main v1 profile gains the current shared defaults', () => {
  const previous = {
    catalog: 'e0d64927',
    revision: 17,
    values: { cost0: 60, helper0: 36, hard: 60, yield: 9, full: 2, trickle: 200, wagonCruise: 30, wagonAccel: 30 },
  };
  const old = structuredClone(previous);
  const upgraded = migrateTuneV1(previous);
  assert.deepEqual(previous, old, 'migration does not mutate the input');
  assert.notEqual(TUNE_CATALOG, previous.catalog);
  assert.equal(
    tuneCatalog(TUNABLES.slice(0, 8)),
    previous.catalog,
    "fixture fingerprint is main's exact schema/default identity",
  );
  assert.equal(upgraded.catalog, TUNE_CATALOG);
  assert.equal(upgraded.revision, previous.revision);
  assert.deepEqual(upgraded.values, {
    ...previous.values,
    railRegrowMinutes: 31,
    railRecoveryMinutes: 21,
    railFeedMs: 70,
    railLaySpeed: 50,
    railDepartureTicks: 20,
    railBeamSoloSpeed: 220,
    railBeamHelpSpeed: 500,
    railJumpImpulse: 680,
    railJumpTurn: 70,
    railJumpSteer: 2500,
    railJumpApexSpeed: 160,
  });
  const current = createTune();
  loadTune(current, upgraded);
  assert.equal(current.revision, 17);
  assert.equal(current.v.yield, 9);
  assert.deepEqual(migrateTuneV1(upgraded), upgraded, 'already-current shape remains idempotent');
  assert.throws(
    () => loadTune(createTune(), previous),
    /incompatible catalog/,
    'live load never silently accepts the old fingerprint',
  );
  for (const bad of [
    null,
    [],
    { ...previous, catalog: 'unknown' },
    { ...previous, revision: -1 },
    { ...previous, revision: 0.5 },
    { ...previous, values: { yield: 9 } },
    { ...previous, values: { ...previous.values, yield: 9.5 } },
    { ...previous, values: { ...previous.values, hard: 201 } },
    { ...previous, values: { ...previous.values, railRegrowMinutes: 31 } },
  ])
    assert.throws(() => migrateTuneV1(bad));
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
