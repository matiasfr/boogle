// Complete tuning values, validation and deterministic round-trips.
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
} from '../src/sim/tune.ts';
import { FNV_SEED } from '../src/sim/hash.ts';
import { TRACK, HELPER, AGES } from '../src/sim/route.ts';

test('defaults are saved and hashed with revision', () => {
  const t = createTune();
  assert.equal(t.v.hard, 60);
  assert.equal(t.v.cost0, AGES[0]!.cost);
  assert.deepEqual(serializeTune(t), { revision: 0, values: t.v });
  assert.notEqual(hashTune(t), FNV_SEED);
  const initial = hashTune(t);
  setTune(t, 'hard', 30);
  setTune(t, 'hard', 60);
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
  assert.throws(() => loadTune(u, { ...serializeTune(t), values: { yield: 5 } }));
  assert.throws(() => loadTune(u, { ...serializeTune(t), revision: -1 }));
});

test('wood costs follow the tuning', () => {
  const t = createTune();
  setTune(t, 'cost0', 24);
  setTune(t, 'helper0', 10);
  assert.equal(costIn(t)(0, TRACK), 24);
  assert.equal(costIn(t)(2, HELPER), 10);
});

test("the boiler's haul pace: appended after the glider's keys, 300 cm/s solo and 540 helped", () => {
  const keys = TUNABLES.map((t) => t.key as string);
  const boiler = { railBoilerSoloSpeed: 300, railBoilerHelpSpeed: 540 };
  const at = keys.indexOf('railGlideDeploy');
  assert.deepEqual(keys.slice(at + 1, at + 3), Object.keys(boiler), 'appended in order, after railGlideDeploy');
  for (const [key, def] of Object.entries(boiler)) {
    const t = TUNABLES.find((s) => s.key === key)!;
    assert.equal(t.def, def, key);
    assert.ok(okTune(key, def), key);
    assert.equal(okTune(key, t.min - 1), false, `${key} below its range`);
    assert.equal(okTune(key, t.max + 1), false, `${key} above its range`);
  }
  // They load and hash like every other key: a save without them is refused.
  const t = createTune(),
    json = serializeTune(t);
  const loaded = createTune();
  loadTune(loaded, json);
  assert.equal(hashTune(loaded), hashTune(t));
  const edited = createTune();
  loadTune(edited, { ...json, values: { ...json.values, railBoilerSoloSpeed: 340 } });
  assert.notEqual(hashTune(edited), hashTune(t));
  const old: Record<string, number> = { ...json.values };
  delete old.railBoilerSoloSpeed;
  assert.throws(() => loadTune(createTune(), { ...json, values: old }), /tune:/);
});

test("a footing's own pace, then the trains' headway hold: appended last (works-late-game 2b, generic-lines 4a)", () => {
  const keys = TUNABLES.map((t) => t.key as string);
  const foot = { railFootSoloSpeed: 300, railFootHelpSpeed: 540, railTrainHeadPct: 75 };
  // Appended in order; only later appended keys follow them (slice 5's trade tunables, in their own test).
  const at = keys.indexOf('railFootSoloSpeed');
  assert.deepEqual(keys.slice(at, at + 3), Object.keys(foot), 'appended in order');
  assert.deepEqual(
    keys.slice(at + 3),
    ['railFarePct', 'railRiderPct', 'railPricePct', 'railTrainHoldCap', 'railTrainHoldPct'],
    "then only the trade keys and the Ring Island hold's",
  );
  for (const [key, def] of Object.entries(foot)) {
    const t = TUNABLES.find((s) => s.key === key)!;
    assert.equal(t.def, def, key);
    assert.ok(okTune(key, def), key);
  }
  const json = serializeTune(createTune());
  const old: Record<string, number> = { ...json.values };
  delete old.railFootSoloSpeed;
  assert.throws(() => loadTune(createTune(), { ...json, values: old }), /tune:/, 'a save without them is refused');
});

test('only proto- rooms tune', () => {
  assert.ok(isProtoRoom('v02-proto-haul') && isProtoRoom('proto-haul'));
  assert.ok(!isProtoRoom('v02-beach') && !isProtoRoom('v02-myproto-x') && !isProtoRoom(undefined));
});

test('the glider tunables: appended after the railway keys, defaulting to the BotW target', () => {
  const keys = TUNABLES.map((t) => t.key as string);
  const glide = {
    railGlideSpeed: 1000,
    railGlideSink: 320,
    railGlideAccel: 1800,
    railGlideBrake: 1200,
    railGlideOver: 800,
    railGlideTurnTau: 120,
    railGlideTurnMax: 360,
    railGlideDeploy: 100,
  };
  const at = keys.indexOf('railBeamGraceS');
  assert.deepEqual(keys.slice(at + 1, at + 9), Object.keys(glide), 'appended in order, after railBeamGraceS');
  for (const [key, def] of Object.entries(glide)) {
    const t = TUNABLES.find((s) => s.key === key)!;
    assert.equal(t.def, def, key);
    assert.ok(okTune(key, def), key);
    assert.equal(okTune(key, 0), false, `${key} refuses 0`);
    assert.equal(okTune(key, t.min - 1), false, `${key} below its range`);
    assert.equal(okTune(key, t.max + 1), false, `${key} above its range`);
  }
});
