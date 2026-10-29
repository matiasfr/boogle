import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTerrainState, CARRY_MAX, MAX_DELTA, MIN_DELTA, RATE_TICKS, RIM_CM } from '../src/world/terrain-logic.js';

const N = 16;
function make() {
  const base = new Int16Array(N * N).fill(50); // flat beach at 0.5 m
  base[3 * N + 3] = 400; // grass/rock: not editable
  base[12 * N + 12] = -500; // deep water: not editable
  return createTerrainState({ base, n: N });
}
const edit = (op, i, j, p = 'a') => ({ op, i, j, p });
let tick = 100;
const go = (s, e) => {
  tick += RATE_TICKS;
  if (!s.validate(e, { tick })) return false;
  s.apply(e, tick);
  return true;
};
const total = (s, players) => s.delta.reduce((a, b) => a + b, 0) + players.reduce((a, p) => a + s.carryOf(p), 0);

test('conservation: dig and pile never create sand', () => {
  const s = make();
  let x = 12345;
  const rnd = (m) => ((x = (Math.imul(x, 1103515245) + 12345) >>> 0) >>> 8) % m;
  for (let k = 0; k < 500; k++) {
    const op = ['dig', 'pile', 'flatten'][rnd(3)];
    go(s, { ...edit(op, 1 + rnd(N - 2), 1 + rnd(N - 2), rnd(2) ? 'a' : 'b'), h: 20 + rnd(60) });
    assert.equal(total(s, ['a', 'b']), 0);
    assert.ok(s.carryOf('a') >= 0 && s.carryOf('a') <= CARRY_MAX);
  }
  for (const d of s.delta) assert.ok(d >= MIN_DELTA && d <= MAX_DELTA);
});

test('dig takes 40/20 from the 3x3, rims the 5x5, rest goes in the bucket', () => {
  const s = make();
  assert.ok(go(s, edit('dig', 8, 8)));
  assert.equal(s.delta[8 * N + 8], -40);
  assert.equal(s.delta[7 * N + 8], -20);
  assert.equal(s.delta[6 * N + 8], RIM_CM);
  assert.equal(s.delta[6 * N + 6], RIM_CM);
  assert.equal(s.carryOf('a'), 200 - 16 * RIM_CM);
  assert.equal(total(s, ['a']), 0);
  assert.ok(go(s, edit('pile', 8, 8)));
  assert.ok(s.carryOf('a') >= 0);
  assert.equal(total(s, ['a']), 0);
});

test('flatten moves the brush toward the given height, through the bucket', () => {
  const s = make();
  for (let k = 0; k < 3; k++) go(s, edit('dig', 8, 8));
  const before = Math.abs(s.delta[8 * N + 8]);
  assert.ok(go(s, { ...edit('flatten', 8, 8), h: 50 }));
  assert.ok(Math.abs(s.delta[8 * N + 8]) < before);
  assert.equal(total(s, ['a']), 0);
  assert.equal(s.check({ ...edit('flatten', 8, 8), h: 1.5 }, 99999), 'int');
  assert.equal(s.check({ ...edit('flatten', 8, 8), h: 50 }, 99999), null); // rims above 50 still to level
  const flat = make();
  assert.equal(flat.check({ ...edit('flatten', 8, 8), h: 50 }, 99999), 'nothing-to-move');
});

test('validation rejects bad edits', () => {
  const s = make();
  const why = (e, t = 1000) => s.check(e, t);
  assert.equal(why(edit('pile', 8, 8)), 'no-carry');
  assert.equal(why(edit('dig', 3, 3)), 'not-sand');
  assert.equal(why(edit('dig', 12, 12)), 'not-sand');
  assert.equal(why(edit('dig', 0, 5)), 'range');
  assert.equal(why(edit('dig', N, 5)), 'range');
  assert.equal(why(edit('dig', 2.5, 5)), 'int');
  assert.equal(why(edit('dig', 5, 5, '')), 'player');
  assert.equal(why(edit('dance', 5, 5)), 'op');
  // rate: two validations in the same or next tick, second is rejected
  assert.ok(s.validate(edit('dig', 8, 8), { tick: 2000 }));
  assert.equal(s.validate(edit('dig', 8, 8), { tick: 2000 }), false);
  assert.equal(s.validate(edit('dig', 8, 8), { tick: 2000 + RATE_TICKS - 1 }), false);
  assert.ok(s.validate(edit('dig', 8, 8), { tick: 2000 + RATE_TICKS }));
  // other players are not limited by this one
  assert.ok(s.validate(edit('dig', 8, 8, 'b'), { tick: 2000 }));
});

test('full bucket and depth limit stop digging', () => {
  const s = make();
  for (let i = 2; i <= 11; i += 3) for (let j = 2; j <= 11; j += 3) go(s, edit('dig', i, j));
  for (let i = 2; i <= 13; i += 3) for (let j = 2; j <= 13; j += 3) go(s, edit('dig', i, j, 'a'));
  assert.equal(s.check(edit('dig', 13, 2), 99999), 'bucket-full');
  const t = make();
  for (let k = 0; k < 40; k++) go(t, edit('dig', 8, 8));
  assert.equal(t.check(edit('dig', 8, 8), 99999), 'too-deep');
  assert.ok(t.delta.every((d) => d >= MIN_DELTA && d <= MAX_DELTA));
});

test('serialize/load round-trip and order-independent hash', () => {
  const s = make();
  for (const [op, i, j, p] of [
    ['dig', 5, 5, 'a'],
    ['dig', 9, 6, 'b'],
    ['pile', 7, 7, 'a'],
    ['dig', 6, 6, 'b'],
  ])
    go(s, edit(op, i, j, p));
  const snap = JSON.parse(JSON.stringify(s.serialize()));
  const r = make();
  r.load(snap);
  assert.deepEqual(r.delta, s.delta);
  assert.equal(r.carryOf('a'), s.carryOf('a'));
  assert.equal(r.carryOf('b'), s.carryOf('b'));
  assert.equal(r.hash(), s.hash());
  const shuffled = { d: [], players: [...snap.players].reverse() };
  for (let k = snap.d.length - 2; k >= 0; k -= 2) shuffled.d.push(snap.d[k], snap.d[k + 1]);
  const q = make();
  q.load(shuffled);
  assert.equal(q.hash(), s.hash());
  const before = s.hash();
  go(s, edit('dig', 10, 10));
  assert.notEqual(s.hash(), before);
});
