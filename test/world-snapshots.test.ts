// Saved worlds on the current rules round-trip; malformed snapshots or states never throw.
// A bad state starts fresh and the world keeps ticking.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { homeLand } from './helpers/land.ts';

function peer() {
  const s = createSync();
  s.setSelfId('a');
  installRules(s, homeLand());
  return s;
}
const copy = (v: unknown) => JSON.parse(JSON.stringify(v));

// A world with a changed retained state: the classic transport's roster.
function played() {
  const s = peer();
  s.submitEdit({ op: 'who.set', i: 0, j: 0, n: 'Ana', c: 3 });
  for (let k = 0; k < 5; k++) s.updateWorld(0.1);
  return { snap: copy(s.snapshot()), hashes: s.stateHashes() };
}

test('a current save preserves every state hash across load and save', () => {
  const { snap, hashes } = played();
  const s = peer();
  assert.equal(s.loadSnapshot(copy(snap)), true);
  assert.deepEqual(s.stateHashes(), hashes);
  assert.equal(s.worldStatus().loadErrors, 0);
  const saved = copy(s.snapshot());
  assert.deepEqual(saved, snap);
});

const JUNK = [
  null,
  undefined,
  0,
  -1,
  1.5,
  'x',
  '',
  true,
  [],
  [1, 2, 3],
  {},
  { d: 'x', players: 5 },
  { v: 2, p: 'x', it: [1, 2], r: 'q', pa: {}, n: -1 },
  { v: 2, it: Array(70).fill(7), n: 1e300 },
  { a: 'x', c: [1e9, -1, 'a'] },
  [['x', 'y', 'z']],
  [[1e9, 5, -1, 2, 'a', 3]],
  { k: 'x', n: [1, 2], ms: 'q' },
];

test('malformed snapshots and states never throw; bad states start fresh and the world keeps ticking', (t) => {
  const warn = console.warn;
  console.warn = () => {}; // every bad state logs a warning: expected here
  t.after(() => (console.warn = warn));
  const { snap, hashes } = played();
  const s = peer();
  const fresh = s.stateHashes();
  for (const bad of [null, 'x', [], {}, { tick: -1 }, { ...snap, data: 5 }, { ...snap, seed: 'a' }])
    assert.equal(s.loadSnapshot(copy(bad ?? null)), false);
  assert.deepEqual(s.stateHashes(), fresh, 'a rejected snapshot changes nothing');

  const keys = Object.keys(hashes);
  for (let k = 0; k < JUNK.length; k++) {
    // Every state gets every junk value over the loop.
    const data = Object.fromEntries(keys.map((key, n) => [key, JUNK[(k + n) % JUNK.length]]));
    assert.doesNotThrow(() => s.loadSnapshot({ tick: 9, seed: 1, epochMs: 0, data }));
    assert.doesNotThrow(() => s.updateWorld(0.2), `ticking after junk round ${k}`);
    assert.doesNotThrow(() => s.snapshot());
  }
  assert.ok(s.worldStatus().loadErrors > 0, 'some junk was caught by a throwing load');
  s.loadSnapshot(copy(snap)); // a good save afterwards loads as usual
  assert.deepEqual(s.stateHashes(), hashes);
});
