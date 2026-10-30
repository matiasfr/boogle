// Terrain edits feeding the water sim's ground copy, the way src/world/water-world.js does it: after every applied
// edit whose op is in TERRAIN_OPS, copy the cells terrain.lastCells() reports into the water's terrain and wake them.
// A tab that loads a snapshot copies the whole ground instead, so the two must end up on the same ground.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTerrainState, TERRAIN_OPS, RATE_TICKS } from '../src/world/terrain-logic.js';
import { createWater } from '../src/sim/water.js';

const N = 16;

function makePeer() {
  const base = new Int16Array(N * N).fill(50); // flat beach at 0.5 m
  const terrain = createTerrainState({ base, n: N });
  const ground = new Int32Array(N * N);
  const copy = (a0, b0, a1, b1) => {
    for (let a = a0; a <= a1; a++)
      for (let b = b0; b <= b1; b++) ground[a * N + b] = base[a * N + b] + terrain.delta[a * N + b];
  };
  copy(0, 0, N - 1, N - 1);
  const water = createWater({ width: N, height: N, terrain: ground, seaEdges: 0, evapInterval: 0 });
  return { terrain, ground, water, copy };
}

let tick = 1000;
// Validate + apply like the host, then run the 'water ground' adapter for the ops `follows` accepts.
function edit(peer, e, follows = (op) => TERRAIN_OPS.has(op)) {
  tick += RATE_TICKS;
  assert.ok(peer.terrain.validate(e, { tick }), `${e.op} rejected`);
  peer.terrain.apply(e, tick);
  if (!follows(e.op)) return;
  let box = null;
  for (const [idx] of peer.terrain.lastCells()) {
    const a = (idx / N) | 0,
      b = idx - a * N;
    box = box ? [Math.min(box[0], a), Math.min(box[1], b), Math.max(box[2], a), Math.max(box[3], b)] : [a, b, a, b];
  }
  if (!box) return;
  peer.copy(...box);
  for (let a = box[0]; a <= box[2]; a++) for (let b = box[1]; b <= box[3]; b++) peer.water.wake(a, b, 1);
}
const steps = (peer, k) => {
  for (let s = 0; s < k; s++) peer.water.step();
};

// Dig a pool, fill it, then flatten it: returns the long-running peer.
function play(follows) {
  const a = makePeer();
  for (let k = 0; k < 3; k++) edit(a, { op: 'dig', i: 8, j: 8, p: 'x' }, follows);
  a.water.addWater(8, 8, 300);
  steps(a, 20);
  const before = Int16Array.from(a.terrain.delta);
  edit(a, { op: 'flatten', i: 8, j: 8, p: 'x', h: 50 }, follows);
  assert.notDeepEqual(a.terrain.delta, before, 'flatten changed nothing');
  steps(a, 5);
  return a;
}

// A late joiner / resyncing tab: loads both snapshots and copies the full ground, as water-world's load() does.
function joinFrom(a) {
  const b = makePeer();
  b.terrain.load(JSON.parse(JSON.stringify(a.terrain.serialize())));
  b.copy(0, 0, N - 1, N - 1);
  b.water.load(JSON.parse(JSON.stringify(a.water.serialize())));
  return b;
}

test('flatten changes delta and survives a serialize/load round-trip', () => {
  const a = play();
  for (const [idx] of a.terrain.lastCells()) {
    const i = (idx / N) | 0;
    assert.ok(Math.abs(i - 8) <= 1 && Math.abs(idx - i * N - 8) <= 1, 'flatten only touches the 3x3');
  }
  const b = joinFrom(a);
  assert.deepEqual(b.terrain.delta, a.terrain.delta);
  assert.equal(b.terrain.hash(), a.terrain.hash());
});

test('after a flatten, a running tab and a freshly loaded one keep the same water', () => {
  const a = play();
  const b = joinFrom(a);
  assert.deepEqual(a.ground, b.ground, 'running ground copy missed a terrain edit');
  assert.equal(a.water.hash(), b.water.hash());
  steps(a, 60);
  steps(b, 60);
  assert.equal(a.water.hash(), b.water.hash());
});

test('ignoring flatten (the old dig/pile filter) leaves the running ground stale', () => {
  const a = play((op) => op === 'dig' || op === 'pile');
  const b = joinFrom(a);
  assert.notDeepEqual(a.ground, b.ground);
  steps(a, 60);
  steps(b, 60);
  assert.notEqual(a.water.hash(), b.water.hash());
});
