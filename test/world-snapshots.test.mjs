// Saved worlds on the real rules: a save without state versions loads at version 0, and malformed snapshots or states
// never throw: a bad state starts fresh and the world keeps ticking. A 0.1 save captured at M4 keeps loading. (The
// pre-0.1 fixtures were retired with the namespace bump, src/world/namespace.js: no 0.1 tab loads an older save.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../src/world/sync.js';
import { installRules } from '../src/world/rules/index.js';
import fs from 'node:fs';
import { homeLand } from './helpers/land.mjs';

const v01 = JSON.parse(fs.readFileSync(new URL('./fixtures/snap-v01.json', import.meta.url), 'utf8'));

function peer() {
  const s = createSync({ env: { canPlantAt: () => true } });
  s.setSelfId('a');
  installRules(s, homeLand());
  return s;
}
const copy = (v) => JSON.parse(JSON.stringify(v));

// A world with something in it: a planted mushroom and a mango on the ground.
function played() {
  const s = peer();
  s.submitEdit({ op: 'mush.plant', i: 228, j: 200 });
  s.submitEdit({ op: 'gift.toss', i: 230, j: 205, k: 3, y: -1, n: 7, l: [0, 100, 0, 0, 0, 0] });
  for (let k = 0; k < 5; k++) s.updateWorld(0.1);
  return { snap: copy(s.snapshot()), hashes: s.stateHashes() };
}

test('a save without vers loads every state at version 0, and re-saves with versions', () => {
  const { snap, hashes } = played();
  delete snap.vers;
  const s = peer();
  assert.equal(s.loadSnapshot(copy(snap)), true);
  assert.deepEqual(s.stateHashes(), hashes);
  assert.equal(s.worldStatus().loadErrors, 0);
  const saved = copy(s.snapshot());
  assert.deepEqual(Object.keys(saved.vers), Object.keys(hashes));
});

test('a 0.1 save (test/fixtures/snap-v01.json) still loads to the same hashes', () => {
  const s = peer();
  assert.equal(s.loadSnapshot(copy(v01.snap)), true);
  const now = s.stateHashes();
  for (const [k, h] of Object.entries(v01.hashes)) assert.equal(now[k], h, `${k} loads differently`);
  assert.equal(s.worldStatus().loadErrors, 0);
  assert.equal(s.worldStatus().newerSave, false);
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
    // every state gets a junk value (each sees every one over the loop), and every third round junk versions too
    const data = Object.fromEntries(keys.map((key, n) => [key, JUNK[(k + n) % JUNK.length]]));
    const vers = k % 3 === 0 ? { [keys[k % keys.length]]: 'x', [keys[(k + 1) % keys.length]]: -2 } : undefined;
    assert.doesNotThrow(() => s.loadSnapshot({ tick: 9, seed: 1, epochMs: 0, data, ...(vers ? { vers } : {}) }));
    assert.doesNotThrow(() => s.updateWorld(0.2), `ticking after junk round ${k}`);
    assert.doesNotThrow(() => s.snapshot());
  }
  assert.ok(s.worldStatus().loadErrors > 0, 'some junk was caught by a throwing load');
  assert.equal(s.worldStatus().newerSave, false);
  s.loadSnapshot(copy(snap)); // a good save afterwards loads as usual
  assert.deepEqual(s.stateHashes(), hashes);
});
