// Saved worlds on the real rules (B3): a snapshot captured before state versions existed still loads to the same
// hashes, and malformed snapshots or states never throw: a bad state starts fresh and the world keeps ticking.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSync } from '../src/world/sync.js';
import { installRules } from '../src/world/rules/index.js';
import { homeLand } from './helpers/land.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/snap-pre-version.json', import.meta.url), 'utf8'));

function peer() {
  const s = createSync({ env: { canPlantAt: () => true } });
  s.setSelfId('a');
  installRules(s, homeLand());
  return s;
}
const copy = (v) => JSON.parse(JSON.stringify(v));

test('a snapshot saved before state versions (no vers) still loads to the same hashes', () => {
  assert.equal(fixture.snap.vers, undefined);
  const s = peer();
  assert.equal(s.loadSnapshot(copy(fixture.snap)), true);
  assert.deepEqual(s.stateHashes(), fixture.hashes);
  assert.equal(s.worldStatus().loadErrors, 0);
  assert.equal(s.worldStatus().newerSave, false);
  // and this build's own save of it carries versions and round-trips
  const saved = copy(s.snapshot());
  assert.deepEqual(Object.keys(saved.vers), Object.keys(fixture.hashes));
  const t = peer();
  t.loadSnapshot(saved);
  assert.deepEqual(t.stateHashes(), fixture.hashes);
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
  { d: [1.5, 'a', -9, null], players: [[1, 2, 3], 'p', ['p', 'lots', 'x']], n: 409 },
  { v: 2, p: 'x', it: [1, 2], r: 'q', pa: {}, n: -1 },
  { v: 2, it: Array(70).fill(7), n: 1e300 },
  { width: 1, height: 1, cells: 'x', src: 5 },
  { mask: 'x' },
  { region: 5, cells: [1e9, 5, -1, 2, 'a', 3], src: ['a', 'b'], width: 'w' },
];

test('malformed snapshots and states never throw; bad states start fresh and the world keeps ticking', (t) => {
  const warn = console.warn;
  console.warn = () => {}; // every bad state logs a warning: expected here
  t.after(() => (console.warn = warn));
  const s = peer();
  const fresh = s.stateHashes();
  for (const bad of [null, 'x', [], {}, { tick: -1 }, { ...fixture.snap, data: 5 }, { ...fixture.snap, seed: 'a' }])
    assert.equal(s.loadSnapshot(copy(bad ?? null)), false);
  assert.deepEqual(s.stateHashes(), fresh, 'a rejected snapshot changes nothing');

  const keys = Object.keys(fixture.hashes);
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
  s.loadSnapshot(copy(fixture.snap)); // a good save afterwards loads as usual
  assert.deepEqual(s.stateHashes(), fixture.hashes);
});

test('an old snapshot with sand deltas, water cells and shore items loads cleanly and deterministically', () => {
  const a = peer(),
    b = peer();
  for (const s of [a, b]) {
    assert.equal(s.loadSnapshot(copy(fixture.snap)), true);
    assert.equal(s.worldStatus().loadErrors, 0);
  }
  assert.deepEqual(a.stateHashes(), b.stateHashes());
  for (let k = 0; k < 50; k++) {
    a.updateWorld(0.1);
    b.updateWorld(0.1);
  }
  assert.deepEqual(a.stateHashes(), b.stateHashes());
});
