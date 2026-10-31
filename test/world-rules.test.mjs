// The rules contract (src/world/rules/README.md), checked over every module in RULES on the home land: the order pin,
// identical edits giving identical hashes on two peers, snapshot round-trips, old saves, and rules purity.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSync } from '../src/world/sync.js';
import { RULES, installRules } from '../src/world/rules/index.js';
import { homeLand, fixture } from './helpers/land.mjs';
import { giftIndex } from '../src/sim/gift-catalog.js';
import { ON_GROUND, SRC } from '../src/sim/gifts.js';
import { SEEDS } from '../src/world/rules/gifts.js';

const CANONICAL = ['mushrooms', 'gifts', 'roster', 'stacks', 'piles', 'sites', 'sources']; // production order (test/fixtures/world-inputs.json)

function peer() {
  const s = createSync({ env: { canPlantAt: () => true } });
  s.setSelfId('a');
  const rules = installRules(s, homeLand());
  return { s, rules };
}
const tick = (x, n = 1) => x.s.updateWorld(n * 0.1); // local mode: whole 100 ms ticks, edits apply next tick

// One accepted edit per op, per system, built from that peer's state (a function builds its edit when its turn comes).
// A new rules module with ops adds its script here.
const SCRIPTS = {
  mushrooms: () => [
    { op: 'mush.plant', i: 228, j: 200 },
    { op: 'mush.water', i: 228, j: 200 },
  ],
  gifts: () => [
    { op: 'fruit.drop', i: 175, j: 200, t: 0, d: 2 },
    ({ rules }) => {
      const it = rules.gifts.gifts.items.find((x) => x.src === SRC.FRUIT);
      return { op: 'gift.take', i: it.i, j: it.j, id: it.id };
    },
    { op: 'gift.toss', i: 230, j: 205, k: giftIndex('mango'), y: ON_GROUND, n: 7, l: [0, 100, 0, 0, 0, 0] },
    { op: 'gift.toss', i: 232, j: 200, k: SEEDS, y: ON_GROUND, n: 8, l: [0, 100, 0, 0, 0, 0] }, // plants a mushroom
  ],
  roster: () => [{ op: 'who.set', i: 0, j: 0, n: 'Ana', c: 3 }],
  piles: () => [
    ({ rules }) => {
      rules.piles.drop(212, 188, 0, 9); // a pile to start from, the same on both peers (nothing else makes one yet)
      return { op: 'pile.take', i: 212, j: 188, id: rules.piles.piles.list[0].id, n: 6 };
    },
    { op: 'pile.drop', i: 214, j: 188, n: 2 },
  ],
  sources: () => [{ op: 'src.take', i: 175, j: 200, id: 0 }],
  sites: () => [
    { op: 'site.stock', i: 0, j: 0, s: 0, ring: 0, n: 2 },
    { op: 'site.stock', i: 0, j: 0, s: 0, ring: 1, n: 1 },
    ({ rules }) => {
      rules.sites.addFreight(60); // fill the Track ring the same way on both peers, so the machine can start
      return { op: 'site.run', i: 0, j: 0, s: 0 };
    },
  ],
};

// Runs every converted system's script on x, three ticks apart (over every per-player rate limit). Returns the edits.
function play(x) {
  const edits = [];
  for (const m of RULES)
    for (const step of SCRIPTS[m.name]?.(x) ?? []) {
      const e = typeof step === 'function' ? step(x) : step;
      assert.equal(x.s.submitEdit(e), true, `${m.name}: ${JSON.stringify(e)} was rejected`);
      edits.push(e);
      tick(x, 3);
    }
  return edits;
}

test('RULES is the canonical prefix, and states and ops register in its order', () => {
  const { s } = peer();
  const { states, ops } = s.registry();
  assert.deepEqual(
    states,
    RULES.map((m) => m.name),
  );
  assert.deepEqual(states, CANONICAL.slice(0, RULES.length));
  assert.deepEqual(ops, fixture.ops.slice(0, ops.length));
});

test('every op has an accepted edit, and the same edits give the same state on two peers', () => {
  const a = peer(),
    b = peer();
  const fresh = a.s.stateHashes();
  const ops = new Set(play(a).map((e) => e.op));
  assert.deepEqual([...ops].sort(), [...a.s.registry().ops].sort(), 'every registered op needs an edit in SCRIPTS');
  for (const e of play(b)) assert.ok(ops.has(e.op));
  assert.deepEqual(b.s.stateHashes(), a.s.stateHashes());
  for (const m of RULES)
    if (SCRIPTS[m.name]) assert.notEqual(a.s.stateHashes()[m.name], fresh[m.name], `${m.name} did not change`);
});

test('a snapshot round-trips through JSON and stays in step for 50 ticks', () => {
  const a = peer();
  play(a);
  const b = peer();
  assert.notDeepEqual(b.s.stateHashes(), a.s.stateHashes());
  assert.equal(b.s.loadSnapshot(JSON.parse(JSON.stringify(a.s.snapshot()))), true);
  assert.deepEqual(b.s.stateHashes(), a.s.stateHashes());
  assert.equal(b.s.worldHash(), a.s.worldHash());
  tick(a, 50);
  tick(b, 50);
  assert.deepEqual(b.s.stateHashes(), a.s.stateHashes());
  assert.equal(b.s.worldHash(), a.s.worldHash());
});

test('mush.plant fails closed: the host env decides, and no env rejects the edit', () => {
  const s = createSync({ env: { canPlantAt: (i) => i !== 228 } });
  s.setSelfId('a');
  installRules(s, homeLand());
  assert.equal(s.submitEdit({ op: 'mush.plant', i: 228, j: 200 }), false);
  assert.equal(s.submitEdit({ op: 'mush.plant', i: 230, j: 200 }), true);
  const bare = createSync();
  bare.setSelfId('a');
  installRules(bare, homeLand());
  assert.equal(bare.submitEdit({ op: 'mush.plant', i: 230, j: 200 }), false);
});

test('rules import only pure modules (no three.js, DOM or constants.js)', () => {
  const allowed = /\/src\/(world\/rules\/[^/]+|world\/grid|sim\/[^/]+)\.js$/;
  const seen = new Set();
  const visit = (url) => {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    assert.match(url.pathname, allowed, `rules reach ${url.pathname}`);
    const src = fs.readFileSync(url, 'utf8');
    for (const [, a, b] of src.matchAll(
      /^\s*(?:import|export)\b[^'";]*?\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm,
    )) {
      const spec = a ?? b;
      assert.ok(spec.startsWith('.'), `${url.pathname} imports the package ${spec}`);
      visit(new URL(spec, url));
    }
  };
  visit(new URL('../src/world/rules/index.js', import.meta.url));
});
