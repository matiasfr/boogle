// Playtest tuning (src/sim/tune.ts): defaults are today's constants and hash like no state at all, bounds hold, only
// overrides are saved, a round-trip keeps the hash, the wood costs follow the tuning, and only proto- rooms tune.
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
import { HARD_CAP } from '../src/sim/stacks.ts';
import { TRACK, HELPER, AGES } from '../src/sim/route.ts';

test('defaults are the constants; an untuned room saves and hashes nothing', () => {
  const t = createTune();
  assert.equal(t.v.hard, HARD_CAP);
  assert.equal(t.v.cost0, AGES[0].cost);
  assert.deepEqual(serializeTune(t), {});
  assert.equal(hashTune(t), FNV_SEED);
  setTune(t, 'hard', 30);
  setTune(t, 'hard', HARD_CAP);
  assert.equal(hashTune(t), FNV_SEED, 'back at the default is untuned');
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
});

test('a save with retired keys (soft cap, spill) still loads, without them', () => {
  const u = createTune();
  loadTune(u, { soft: 12, spill: 5, hard: 40 });
  assert.equal(u.v.hard, 40);
  assert.deepEqual(serializeTune(u), { hard: 40 });
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
