// An exception to AGENTS.md's test diet, by the owner's call: `npm run level-check` stands in for a designer, so a flood
// fill that quietly passes everything would be worse than none (the cliff kit's reach check below too). It's no
// precedent for testing features.
import test from 'node:test';
import assert from 'node:assert/strict';
import { flood, type Grid, type Mover } from '../dev/level/flood.ts';
import { kitReach } from '../dev/level/cliff-kit-reach.ts';
import { kitPieceProblems } from '../dev/prefab/cliff-kit.ts';
import { tracks } from '../dev/level/rail-network.ts';
import { H } from '../src/place/terrain.ts';
import { LINES, ORIGIN, PATHS, lineAt, railY } from '../src/place/layout.ts';
import type { Placement } from '../src/prefab/types.ts';

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

// The cliff kit's reach and piece rules (dev/level/cliff-kit-reach.ts, dev/prefab/cliff-kit.ts), on Home's real ground
// beside the canyon climb: bad placements a review seeded, each seen failing on the check before it was fixed.
const ground = (x: number, z: number) => H(x + ORIGIN.x, z);
const [CA, CB] = [PATHS[0]!.pts[9]!, PATHS[0]!.pts[10]!];
const CLEN = Math.hypot(CB[0]! - CA[0]!, CB[1]! - CA[1]!);
const F = [(CB[0]! - CA[0]!) / CLEN, (CB[1]! - CA[1]!) / CLEN] as const,
  R = [-F[1], F[0]] as const;
const FACING = Math.atan2(-R[0], -R[1]);
/** A point `s` m along the climb's first leg and `d` m across it, uphill positive. */
const climbAt = (s: number, d: number): [number, number] => [
  CA[0]! + F[0] * s + R[0] * d,
  CA[1]! + F[1] * s + R[1] * d,
];
const cap = (id: string, [x, z]: [number, number], y: number): Placement => ({
  id,
  prefab: 'terrain.rim-cap',
  pos: [x, y, z],
  rot: [FACING, 0, 0],
});

test('cliff kit reach: a staircase up from the climb within two jumps a step fails', () => {
  const base = ground(...climbAt(15, 5.5));
  const stairs = Array.from({ length: 8 }, (_, i) => cap(`dj.${i}`, climbAt(15 - i * 1.4, 5.5), base + 1.1 + i * 2.2));
  assert.notEqual(kitReach(stairs).fresh.length, 0);
});

test('cliff kit reach: a ramp a player walks up, rising 8 m off the village green, fails', () => {
  // On flat ground beside the village's path, so nothing bare stands near its top.
  const ramp = Array.from({ length: 32 }, (_, i): Placement => {
    const x = -108 - i * 0.5;
    return { id: `ramp.${i}`, prefab: 'terrain.bank-rock', pos: [x, ground(x, 0) + 0.2 + i * 0.25, 0] };
  });
  assert.notEqual(kitReach(ramp).fresh.length, 0);
});

test('cliff kit reach: a perch on the gorge lip that launches a jump to a ledge over the river fails; the ledge alone passes', () => {
  // The ledge's top is 10.5 m over the river's middle: more than two jumps over any bank within a jump's reach (the
  // highest, 6.2 m), so only a glide from the rims above reaches it bare. A perch on the near lip puts it within two.
  const lip = climbAt(15, -6),
    ledge = cap('perch.ledge', climbAt(15, -13), 10.1);
  assert.equal(kitReach([ledge]).fresh.length, 0);
  assert.notEqual(kitReach([cap('perch.perch', lip, 7.5), ledge]).fresh.length, 0);
});

test('cliff kit reach: steps a player takes off a train roof beside line 2 fail', () => {
  const p = { x: 0, z: 0, ux: 0, uz: 1 };
  lineAt(LINES.east, 310, p);
  const y = railY(LINES.east, 310);
  const stairs = Array.from({ length: 6 }, (_, i): Placement => {
    const out = 2.2 + i * 0.8;
    return {
      id: `roof.${i}`,
      prefab: 'terrain.boulder-s',
      pos: [p.x - p.uz * out, y + 1.7 + i * 1.2, p.z + p.ux * out],
    };
  });
  assert.deepEqual(
    stairs.flatMap((s) => kitPieceProblems(s)),
    [],
  );
  assert.notEqual(kitReach(stairs).fresh.length, 0);
});

test('cliff kit reach: no pieces, nothing reached', () => {
  assert.deepEqual(kitReach([]), { cells: 0, fresh: [] });
});

test('cliff kit gauge: a rock 0.14 m over the railhead, across the rails, is in the gauge', () => {
  const p = { x: 0, z: 0, ux: 0, uz: 1 };
  lineAt(LINES.east, 250, p);
  const rock: Placement = { id: 'low', prefab: 'terrain.bank-rock', pos: [p.x, railY(LINES.east, 250) - 0.26, p.z] };
  assert.ok(kitPieceProblems(rock).some((m) => m.includes("inside a rail's gauge")));
});

test("cliff kit gauge: a cap on the middle of the ring loop's 30.6 m straight is in the gauge", () => {
  const loop = tracks().find((t) => t.id === 'ring-loop')!;
  const [a, b] = [loop.pts[1]!, loop.pts[2]!];
  assert.ok(Math.hypot(b.x - a.x, b.z - a.z) > 24); // longer than the three 8 m rail bins round a point
  const mid: Placement = {
    id: 'mid',
    prefab: 'terrain.rim-cap',
    pos: [(a.x + b.x) / 2 - ORIGIN.x, (a.y + b.y) / 2 + 1, (a.z + b.z) / 2 - ORIGIN.z],
  };
  assert.ok(kitPieceProblems(mid).some((m) => m.includes("inside a rail's gauge")));
});
