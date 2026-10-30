// The rules contract (src/world/rules/README.md), checked over every module in RULES on the home land: the order pin,
// identical edits giving identical hashes on two peers, snapshot round-trips, legacy migrations, and rules purity.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSync } from '../src/world/sync.js';
import { RULES, installRules } from '../src/world/rules/index.js';
import { homeLand, fixture } from './helpers/land.mjs';

const CANONICAL = ['terrain', 'mushrooms', 'gifts', 'proto', 'water']; // production order (test/fixtures/world-inputs.json)

function peer() {
  const s = createSync({ env: { canPlantAt: () => true } });
  s.setSelfId('a');
  const rules = installRules(s, homeLand());
  return { s, rules };
}
const tick = (x, n = 1) => x.s.updateWorld(n * 0.1); // local mode: whole 100 ms ticks, edits apply next tick

// One accepted edit per op, per system, built from that peer's state. A new rules module adds its script here.
const SCRIPTS = {
  terrain({ rules }) {
    const { n, mask, base } = rules.terrain.state;
    let c = -1;
    for (let k = 0; k < n * n && c < 0; k++) {
      const i = (k / n) | 0,
        j = k % n;
      if ([-1, 0, 1].every((di) => [-1, 0, 1].every((dj) => mask[(i + di) * n + j + dj]))) c = k;
    }
    assert.ok(c >= 0, 'no sand on the home land');
    const i = (c / n) | 0,
      j = c % n;
    return [
      { op: 'dig', i, j },
      { op: 'pile', i: i + 1, j },
      { op: 'flatten', i, j, h: base[c] - 100 }, // below the ground: the bucket has room, it may be empty
    ];
  },
};

// Runs every converted system's script on x, three ticks apart (over every per-player rate limit). Returns the edits.
function play(x) {
  const edits = [];
  for (const m of RULES)
    for (const e of SCRIPTS[m.name]?.(x) ?? []) {
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
  assert.deepEqual([...ops], a.s.registry().ops, 'every registered op needs an edit in SCRIPTS');
  for (const e of play(b)) assert.ok(ops.has(e.op));
  assert.deepEqual(b.s.stateHashes(), a.s.stateHashes());
  for (const m of RULES) assert.notEqual(a.s.stateHashes()[m.name], fresh[m.name], `${m.name} did not change`);
});

test('a snapshot round-trips through JSON and stays in step for 50 ticks', () => {
  const a = peer();
  play(a);
  const b = peer();
  assert.equal(b.s.loadSnapshot(JSON.parse(JSON.stringify(a.s.snapshot()))), true);
  assert.deepEqual(b.s.stateHashes(), a.s.stateHashes());
  assert.equal(b.s.worldHash(), a.s.worldHash());
  tick(a, 50);
  tick(b, 50);
  assert.deepEqual(b.s.stateHashes(), a.s.stateHashes());
  assert.equal(b.s.worldHash(), a.s.worldHash());
});

test('legacy saves migrate: 129-grid terrain deltas move to the 409 grid', () => {
  const snap = (data) => ({ tick: 5, seed: 1, epochMs: 0, data });
  const a = peer();
  a.s.loadSnapshot(snap({ terrain: { d: [60 * 129 + 70, -40], players: [['p', 40, 3]] } }));
  const { state } = a.rules.terrain;
  assert.equal(state.delta[200 * 409 + 210], -40);
  assert.equal(state.carryOf('p'), 40);
  const saved = JSON.parse(JSON.stringify(a.s.snapshot().data));
  assert.deepEqual(saved.terrain.d, [200 * 409 + 210, -40]);
  assert.equal(saved.terrain.n, 409);
  const b = peer();
  b.s.loadSnapshot(snap(saved)); // already migrated: loads as is
  assert.deepEqual(b.s.stateHashes(), a.s.stateHashes());
});

test('rules import only pure modules (no three.js, DOM or constants.js)', () => {
  const allowed = /\/src\/(world\/rules\/[^/]+|world\/(grid|terrain-logic|legacy-grid)|sim\/[^/]+)\.js$/;
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
