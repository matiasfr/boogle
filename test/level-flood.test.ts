// An exception to AGENTS.md's test diet, by the owner's call: `npm run level-check` stands in for a designer, so a flood
// fill that quietly passes everything would be worse than none. It's no precedent for testing features.
import test from 'node:test';
import assert from 'node:assert/strict';
import { flood, type Grid, type Mover } from '../dev/level/flood.ts';

const MOVER: Mover = { walkSlope: 1.5, jumpHeight: 1.6, wade: 0.8, swimHop: 0.5 };
const CELL = 1;
const N = 9;
const grid = (f: (i: number, j: number) => number): Grid => {
  const h = new Float64Array(N * N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) h[i * N + j] = f(i, j);
  return { n: N, cell: CELL, h };
};
const START = 0;
const END = 8 * N + 8;
const reaches = (g: Grid, options = {}) => flood(g, MOVER, [START], options)[END] === 1;

test('flat ground is reached, and a wall of blocked nodes cuts it off', () => {
  const g = grid(() => 1);
  assert.ok(reaches(g));
  const blocked = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) blocked[4 * N + j] = 1;
  assert.ok(!reaches(g, { blocked }));
});

test('a cliff stops you going up, not down', () => {
  const g = grid((i) => (i >= 4 ? 20 : 1)); // the far side is high
  assert.ok(!reaches(g));
  const below = grid((i) => (i >= 4 ? 1 : 20)); // the far side is low
  assert.ok(reaches(below));
  // ...and the way back up from a fall isn't there.
  assert.ok(!flood(below, MOVER, [END], {})[START]);
  assert.ok(!flood(below, MOVER, [START], { reverse: true })[END]);
});

test('a slope within the limit climbs, one over it does not', () => {
  assert.ok(reaches(grid((i) => i * 1.4)));
  assert.ok(!reaches(grid((i) => i * 3)));
});

test('sea stops a walk, not a swim', () => {
  const g = grid((i) => (i === 4 ? -5 : i === 3 || i === 5 ? -0.5 : 0.5)); // a channel with shelving banks
  assert.ok(!reaches(g));
  assert.ok(reaches(g, { swim: true }));
  // The far side is a bank too high to get onto from the water.
  const bank = grid((i) => (i === 4 ? -5 : i > 4 ? 1 : -0.8 + 0.1 * (4 - i)));
  assert.ok(!reaches(bank, { swim: true }));
});
