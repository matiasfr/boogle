// The rules contract (src/world/rules/README.md), checked over every module in RULES on the home land: the order pin,
// identical edits giving identical hashes on two peers, snapshot round-trips, old saves, and rules purity.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSync } from '../src/world/sync.ts';
import { RULES, installRules } from '../src/world/rules/index.ts';
import { homeLand, fixture } from './helpers/land.mjs';
import { giftIndex } from '../src/sim/gift-catalog.ts';
import { ON_GROUND, SRC } from '../src/sim/gifts.ts';
import { SEEDS } from '../src/world/rules/gifts.ts';
import { setTune } from '../src/sim/tune.ts';
import { PUSH_RUN, PUSH_RUN_KIND } from '../src/sim/scripted-run.ts';

const CANONICAL = [
  'mushrooms',
  'gifts',
  'roster',
  'stacks',
  'piles',
  'sites',
  'sources',
  'bank',
  'ball',
  'tune',
  'opening',
]; // production order (test/fixtures/world-inputs.json)

function peer() {
  const s = createSync({ env: { canPlantAt: () => true, protoRoom: true } });
  s.setSelfId('a');
  const rules = installRules(s, homeLand());
  return { s, rules, after: {} };
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
    { op: 'gift.toss', i: 230, j: 205, k: giftIndex('can'), y: ON_GROUND, n: 7, l: [0, 100, 0, 0, 0, 0] },
    ({ rules }) => {
      const it = rules.gifts.gifts.items.find((x) => x.src === SRC.TOSS);
      return { op: 'gift.take', i: it.i, j: it.j, id: it.id };
    },
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
  bank: () => [{ op: 'bank.wake', i: 0, j: 0, ms: 3600000 }], // what a host that loaded an hour-old save measures
  ball: () => [{ op: 'ball.rest', i: 0, j: 0, x: 1200, y: 150, z: 2000 }],
  // the reset empties the haul states again; each module's change is checked right after its own script (play)
  tune: () => [
    { op: 'tune.reset', i: 0, j: 0 },
    { op: 'tune.set', i: 0, j: 0, key: 'hard', v: 30 },
    { op: 'tune.fill', i: 0, j: 0 },
  ],
  sites: () => [
    { op: 'site.stock', i: 0, j: 0, s: 0, ring: 0, n: 2 },
    { op: 'site.stock', i: 0, j: 0, s: 0, ring: 1, n: 1 },
    ({ rules }) => {
      rules.sites.addFreight(60); // fill the Track ring the same way on both peers, so the machine can start
      setTune(rules.tune.tune, 'run', PUSH_RUN_KIND); // the push run (tune.set runs later, in tune's own script)
      return { op: 'site.run', i: 0, j: 0, s: 0 };
    },
    (x) => {
      for (let k = 0; k < PUSH_RUN[0].len; k++) tick(x); // past warm-up: the machine lays only while pushed
      return { op: 'site.push', i: 0, j: 0, s: 0 };
    },
  ],
  opening: () => [
    { op: 'open.lay', i: 0, j: 0 }, // the proto shortcut lays the rest of the route (env protoRoom)
    { op: 'open.start', i: 0, j: 0 },
    { op: 'open.here', i: 0, j: 0 }, // everyone at the platform: the call ends early
  ],
};

// Runs every converted system's script on x, three ticks apart (over every per-player rate limit). Returns the edits;
// x.after holds each module's state hash right after its own script.
function play(x) {
  const edits = [];
  for (const m of RULES) {
    for (const step of SCRIPTS[m.name]?.(x) ?? []) {
      const e = typeof step === 'function' ? step(x) : step;
      assert.equal(x.s.submitEdit(e), true, `${m.name}: ${JSON.stringify(e)} was rejected`);
      edits.push(e);
      tick(x, 3);
    }
    x.after[m.name] = x.s.stateHashes()[m.name];
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
    if (SCRIPTS[m.name]) assert.notEqual(a.after[m.name], fresh[m.name], `${m.name} did not change`);
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
  const allowed = /\/src\/(world\/rules\/[^/]+|world\/grid|sim\/[^/]+)\.(js|ts)$/;
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
  visit(new URL('../src/world/rules/index.ts', import.meta.url));
});
