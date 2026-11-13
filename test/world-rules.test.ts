// The surviving classic transport contract: roster and haul tuning retain deterministic ordering and round-trips.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSync } from '../src/world/sync.ts';
import { RULES, installRules } from '../src/world/rules/index.ts';
import { homeLand, fixture } from './helpers/land.ts';
import type { Rules } from '../src/world/rules/types.ts';

const CANONICAL = ['roster', 'tune'];

function peer() {
  const s = createSync({ env: { protoRoom: true, tuneController: () => true } });
  s.setSelfId('a');
  const rules = installRules(s, homeLand());
  return { s, rules, after: {} as Record<string, number> };
}
type Peer = ReturnType<typeof peer>;
const tick = (x: Peer, n = 1) => x.s.updateWorld(n * 0.1);
type Step = Record<string, unknown> | ((x: Peer) => Record<string, unknown>);
const SCRIPTS: Partial<Record<keyof Rules, (x: Peer) => Step[]>> = {
  roster: () => [{ op: 'who.set', i: 0, j: 0, n: 'Ana', c: 3 }],
  tune: () => [
    { op: 'tune.set', i: 0, j: 0, key: 'hard', v: 30 },
    ({ rules }) => ({
      op: 'tune.commit',
      i: 0,
      j: 0,
      key: 'yield',
      v: 7,
      expectedRevision: rules.tune.tune.revision,
      requestId: 'script',
    }),
  ],
};

function play(x: Peer) {
  const edits: Record<string, unknown>[] = [];
  for (const m of RULES) {
    for (const step of SCRIPTS[m.name]?.(x) ?? []) {
      const e = typeof step === 'function' ? step(x) : step;
      assert.equal(x.s.submitEdit(e), true, `${m.name}: ${JSON.stringify(e)} was rejected`);
      edits.push(e);
      tick(x, 3);
    }
    x.after[m.name] = x.s.stateHashes()[m.name]!;
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

test('rules runtime imports reach only pure modules (type-only boundaries are erased)', () => {
  const allowed = /\/src\/(world\/rules\/[^/]+|world\/grid|sim\/[^/]+)\.(js|ts)$/;
  const seen = new Set<string>();
  const visit = (url: URL) => {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    assert.match(url.pathname, allowed, `rules reach ${url.pathname}`);
    const src = fs.readFileSync(url, 'utf8');
    for (const [, a, b] of src.matchAll(
      /^\s*(?:import|export)\b(?!\s+type\b)[^'";]*?\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm,
    )) {
      const spec = a ?? b!;
      assert.ok(spec.startsWith('.'), `${url.pathname} imports the package ${spec}`);
      visit(new URL(spec, url));
    }
  };
  visit(new URL('../src/world/rules/index.ts', import.meta.url));
});
