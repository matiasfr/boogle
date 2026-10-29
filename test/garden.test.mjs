import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/sim/garden.js';

const wet = () => true;
const dry = () => false;
const mk = (opts) => G.createGarden({ seed: 7, ...opts });
const run = (g, from, to, isWet) => {
  for (let t = from; t < to; t++) G.step(g, t, isWet);
};

test('crops grow only when hydrated', () => {
  const g = mk();
  assert.ok(G.plant(g, { i: 3, j: 4, kind: 'flower', p: 'a' }, 0).ok);
  run(g, 0, 5000, dry);
  assert.equal(G.cropAt(g, 3, 4).stage, 0);
  assert.equal(G.cropAt(g, 3, 4).hydratedTicks, 0);
  run(g, 5000, 5000 + 600, wet);
  assert.equal(G.cropAt(g, 3, 4).stage, 1);
  run(g, 5600, 5600 + 1200, wet);
  assert.ok(G.isRipe(G.cropAt(g, 3, 4)));
});

test('hand watering hydrates a dry crop for WATER_TICKS', () => {
  const g = mk();
  G.plant(g, { i: 1, j: 1, kind: 'melon', p: 'a' }, 0);
  G.water(g, { i: 1, j: 1, p: 'a' }, 0);
  run(g, 0, G.WATER_TICKS + 500, dry);
  assert.equal(G.cropAt(g, 1, 1).hydratedTicks, G.WATER_TICKS);
  assert.equal(G.water(g, { i: 9, j: 9, p: 'a' }, 0).reason, 'no-crop');
});

test('visitor bonus counts distinct players only and resets per day', () => {
  const g = mk();
  G.plant(g, { i: 1, j: 1, kind: 'melon', p: 'a' }, 0);
  for (let n = 0; n < 5; n++) G.water(g, { i: 1, j: 1, p: 'a' }, n);
  const c = G.cropAt(g, 1, 1);
  assert.equal(G.visitorCount(c, 10), 1);
  assert.equal(G.visitorMultiplier(c, 10), 1000);
  G.water(g, { i: 1, j: 1, p: 'b' }, 10);
  G.water(g, { i: 1, j: 1, p: 'c' }, 11);
  assert.equal(G.visitorCount(c, 12), 3);
  const m3 = G.visitorMultiplier(c, 12);
  assert.ok(m3 > 1000);
  for (const p of ['d', 'e', 'f', 'g']) G.water(g, { i: 1, j: 1, p }, 12);
  assert.ok(G.visitorMultiplier(c, 13) > m3);
  const solo = mk();
  G.plant(solo, { i: 1, j: 1, kind: 'melon', p: 'a' }, 0);
  run(g, 13, 313, wet);
  run(solo, 0, 300, wet);
  assert.ok(G.cropAt(g, 1, 1).growth > G.cropAt(solo, 1, 1).growth * 2);
  assert.equal(G.visitorCount(c, G.DAY_TICKS), 0);
  assert.equal(G.visitorMultiplier(c, G.DAY_TICKS), 1000);
  G.water(g, { i: 1, j: 1, p: 'b' }, G.DAY_TICKS + 1);
  assert.equal(G.visitorCount(c, G.DAY_TICKS + 1), 1);
});

test('catchUp equals stepping for constant wet or dry', () => {
  for (const isWet of [wet, dry]) {
    for (const N of [1, 777, 13000]) {
      const mkG = () => {
        const g = mk();
        G.plant(g, { i: 1, j: 1, kind: 'melon', p: 'a' }, 0);
        G.plant(g, { i: 2, j: 1, kind: 'palm', p: 'b' }, 0);
        G.plant(g, { i: 3, j: 1, kind: 'flower', p: 'c' }, 400);
        G.water(g, { i: 1, j: 1, p: 'a' }, 5);
        G.water(g, { i: 1, j: 1, p: 'b' }, 6);
        G.water(g, { i: 2, j: 1, p: 'c' }, G.DAY_TICKS - 100);
        return g;
      };
      const a = mkG();
      const b = mkG();
      run(a, 0, N, isWet);
      G.catchUp(b, 0, N, isWet === wet ? 1000 : 0);
      assert.deepEqual(G.serialize(b), G.serialize(a), `N=${N} wet=${isWet === wet}`);
      assert.equal(G.hash(b), G.hash(a));
    }
  }
});

test('catchUp partial wetness is deterministic and in between', () => {
  const mkG = () => {
    const g = mk();
    G.plant(g, { i: 1, j: 1, kind: 'melon', p: 'a' }, 0);
    return g;
  };
  const a = mkG();
  const b = mkG();
  const c = mkG();
  G.catchUp(a, 0, 6000, 500);
  G.catchUp(b, 0, 6000, 500);
  G.catchUp(c, 0, 6000, 1000);
  assert.equal(G.hash(a), G.hash(b));
  assert.equal(G.cropAt(a, 1, 1).hydratedTicks, 3000);
  assert.ok(G.cropAt(a, 1, 1).growth < G.cropAt(c, 1, 1).growth);
});

test('harvest only when ripe and returns the item; palm regrows', () => {
  const g = mk();
  G.plant(g, { i: 1, j: 1, kind: 'melon', p: 'a' }, 0);
  assert.equal(G.harvest(g, { i: 1, j: 1, p: 'z' }, 1).reason, 'not-ripe');
  run(g, 0, 7200, wet);
  const r = G.harvest(g, { i: 1, j: 1, p: 'z' }, 7200);
  assert.ok(r.ok);
  assert.equal(r.item.kind, 'melon');
  assert.equal(r.item.to, 'z');
  assert.ok(r.item.count >= 1 && r.item.count <= 2);
  assert.equal(G.cropAt(g, 1, 1), null);
  assert.equal(G.harvest(g, { i: 1, j: 1, p: 'z' }, 7201).reason, 'no-crop');
  G.plant(g, { i: 2, j: 2, kind: 'palm', p: 'q' }, 8000);
  run(g, 8000, 8000 + 30000, wet);
  assert.equal(G.harvest(g, { i: 2, j: 2, p: 'a' }, 38000).item.kind, 'coconut');
  const palm = G.cropAt(g, 2, 2);
  assert.ok(palm && palm.stage === 3 && !G.isRipe(palm));
});

test('validation rejects bad plants and cooldown abuse', () => {
  const g = mk({ canPlant: (i) => i < 10 });
  const ok = (op, t) => G.plant(g, op, t);
  assert.equal(ok({ i: 20, j: 0, kind: 'flower', p: 'a' }, 0).reason, 'bad-ground');
  assert.equal(ok({ i: 1, j: 0, kind: 'nope', p: 'a' }, 0).reason, 'bad-kind');
  assert.equal(ok({ i: 1, j: 0, kind: 'constructor', p: 'a' }, 0).reason, 'bad-kind');
  assert.equal(ok({ i: 1.5, j: 0, kind: 'flower', p: 'a' }, 0).reason, 'bad-cell');
  assert.equal(ok({ i: -1, j: 0, kind: 'flower', p: 'a' }, 0).reason, 'bad-cell');
  assert.equal(ok({ i: 1, j: 0, kind: 'flower' }, 0).reason, 'bad-player');
  assert.ok(ok({ i: 1, j: 0, kind: 'flower', p: 'a' }, 0).ok);
  assert.equal(ok({ i: 1, j: 0, kind: 'melon', p: 'b' }, 1).reason, 'occupied');
  assert.equal(ok({ i: 2, j: 0, kind: 'flower', p: 'a' }, 100).reason, 'cooldown');
  assert.ok(ok({ i: 2, j: 0, kind: 'flower', p: 'b' }, 100).ok);
  assert.ok(ok({ i: 3, j: 0, kind: 'flower', p: 'a' }, G.SEED_COOLDOWN_TICKS).ok);
  assert.equal(G.cropAt(g, 1, 0).kind, 'flower');
  assert.equal(G.uproot, undefined);
});

test('salt stops growth, water rinses, neglect removes', () => {
  const g = mk();
  G.plant(g, { i: 1, j: 1, kind: 'flower', p: 'a' }, 0);
  G.plant(g, { i: 2, j: 1, kind: 'flower', p: 'b' }, 0);
  G.salt(g, 1, 1, 10);
  G.salt(g, 2, 1, 10);
  run(g, 10, 100, wet);
  assert.equal(G.cropAt(g, 1, 1).growth, 0);
  G.water(g, { i: 1, j: 1, p: 'a' }, 100);
  run(g, 100, 10 + G.SALT_GRACE_TICKS + 5, wet);
  assert.ok(G.cropAt(g, 1, 1).growth > 0);
  assert.equal(G.cropAt(g, 2, 1), null);
});

test('serialize/load round-trip and determinism', () => {
  const build = () => {
    const g = mk();
    G.plant(g, { i: 5, j: 2, kind: 'melon', p: 'p2' }, 0);
    G.plant(g, { i: 1, j: 9, kind: 'palm', p: 'p1' }, 0);
    G.plant(g, { i: 2, j: 2, kind: 'flower', p: 'p3' }, 0);
    G.water(g, { i: 5, j: 2, p: 'p3' }, 3);
    G.water(g, { i: 5, j: 2, p: 'p1' }, 4);
    run(g, 0, 2500, (i) => i % 2 === 1);
    return g;
  };
  const a = build();
  const b = build();
  assert.equal(G.hash(a), G.hash(b));
  const json = JSON.parse(JSON.stringify(G.serialize(a)));
  const keys = json.crops.map((c) => G.cellKey(c[0], c[1]));
  assert.deepEqual(keys, [...keys].sort((x, y) => x - y));
  const c = mk();
  G.load(c, json);
  assert.deepEqual(G.serialize(c), G.serialize(a));
  assert.equal(G.hash(c), G.hash(a));
  run(a, 2500, 3000, wet);
  run(c, 2500, 3000, wet);
  assert.equal(G.hash(c), G.hash(a));
});
