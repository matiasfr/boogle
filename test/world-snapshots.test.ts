// Current server checkpoints round-trip; malformed data never throws through the load boundary.
// A bad state falls back fresh for inspection but may never be saved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serverWorld } from './helpers/server-world.ts';

function peer() {
  return serverWorld().sync;
}
const copy = (v: unknown) => JSON.parse(JSON.stringify(v));

// A changed authoritative roster, checkpointed with railway and tuning state.
function played() {
  const host = serverWorld();
  const s = host.sync;
  host.run('alice', { op: 'who.set', n: 'Ana', c: 3 });
  for (let k = 0; k < 5; k++) s.updateWorld(0.1);
  return { snap: copy(s.snapshot()), data: copy(s.snapshot().data) };
}

test('a current save preserves every server state across load and save', () => {
  const { snap, data } = played();
  const s = peer();
  assert.equal(s.loadSnapshot(copy(snap)), true);
  assert.deepEqual(s.snapshot().data, data);
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

test('malformed snapshots and states never throw; failed loads prohibit saving their fallback', (t) => {
  const warn = console.warn;
  console.warn = () => {}; // every bad state logs a warning: expected here
  t.after(() => (console.warn = warn));
  const { snap, data: expected } = played();
  const s = peer();
  const fresh = copy(s.snapshot().data);
  for (const bad of [null, 'x', [], {}, { tick: -1 }, { ...snap, data: 5 }, { ...snap, seed: 'a' }])
    assert.equal(s.loadSnapshot(copy(bad ?? null)), false);
  assert.deepEqual(s.snapshot().data, fresh, 'a rejected snapshot changes nothing');

  const keys = Object.keys(expected);
  for (let k = 0; k < JUNK.length; k++) {
    // Every state gets every junk value over the loop.
    const data = Object.fromEntries(keys.map((key, n) => [key, JUNK[(k + n) % JUNK.length]]));
    assert.doesNotThrow(() => s.loadSnapshot({ tick: 9, seed: 1, epochMs: 0, data }));
    assert.doesNotThrow(() => s.updateWorld(0.2), `ticking after junk round ${k}`);
    assert.doesNotThrow(() => s.snapshot());
  }
  assert.ok(s.worldStatus().loadErrors > 0, 'some junk was caught by a throwing load');
  assert.equal(s.worldStatus().badSave, true);
  assert.equal(s.saveNow(true), false);
  s.loadSnapshot(copy(snap)); // A later inspection can load values, but does not clear the failed-load guard.
  assert.deepEqual(s.snapshot().data, expected);
});
