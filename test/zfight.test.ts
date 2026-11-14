// Owner-requested exception to the test diet: pure face-list geometry only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findZfights, type Face, type Point } from '../src/geometry/zfight.ts';
const top = (piece: string, y = 0, x = 0, size = 1): Face => ({
  piece,
  points: [
    [x, y, 0],
    [x, y, size],
    [x + size, y, size],
    [x + size, y, 0],
  ],
});
test('clips real overlap, aggregates triangles, reports position and separation', () => {
  const a = top('a'),
    b = top('b', 0.001, 0.5);
  const rows = findZfights([a, b]);
  assert.equal(rows.length, 1);
  assert.ok(Math.abs(rows[0]!.area - 0.5) < 1e-8);
  assert.deepEqual(rows[0]!.position, [0.75, 0.001, 0.5]);
  assert.equal(rows[0]!.separation, 0.001);
  const triangles = (face: Face): Face[] => [
    { ...face, points: [face.points[0]!, face.points[1]!, face.points[2]!] },
    { ...face, points: [face.points[0]!, face.points[2]!, face.points[3]!] },
  ];
  assert.ok(Math.abs(findZfights([...triangles(a), ...triangles(b)])[0]!.area - 0.5) < 1e-8);
});
test('rejects same piece, opposite normals, edge contact, slivers, separated and tilted planes', () => {
  const a = top('a');
  for (const b of [
    top('a'),
    { ...top('b'), points: [...top('b').points].reverse() },
    top('b', 0, 1),
    top('b', 0, 0.999),
    top('b', 0.0021),
    { ...top('b'), points: top('b').points.map((p): Point => [p[0], p[2] * 0.01, p[2]]) },
  ])
    assert.equal(findZfights([a, b]).length, 0);
});
test('handles a rotated plane across spatial and tolerance bucket boundaries, sorts by area', () => {
  const rotate = (f: Face): Face => ({ ...f, points: f.points.map(([x, y, z]): Point => [x + 7.7, z + 3, -y + 8]) });
  const rows = findZfights([rotate(top('a')), rotate(top('b', 0.001)), top('c', 0, 30, 2), top('d', 0, 30, 2)]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]!.area, 4);
  assert.ok(Math.abs(rows[1]!.area - 1) < 1e-8);
});
test('removes buried contacts, retains the exposed portion beside a ground triangle', () => {
  const a = top('a', -0.001),
    b = top('b', -0.001);
  const ground: Face = {
    piece: 'ground',
    ground: true,
    points: [
      [0, 0.01, 0],
      [0, 0.01, 1],
      [1, 0.01, 0],
    ],
  };
  const rows = findZfights([a, b, ground]);
  assert.equal(rows.length, 1);
  assert.ok(Math.abs(rows[0]!.area - 0.5) < 1e-8);
  assert.equal(findZfights([a, b, { ...top('ground', 0.01), ground: true }]).length, 0);
});
test('subtracts an opaque closed convex blocker without discarding the rest of a face', () => {
  const points: Point[] = [
    [0, -0.1, 0],
    [0, -0.1, 1],
    [0.5, -0.1, 1],
    [0.5, -0.1, 0],
    [0, 0.1, 0],
    [0, 0.1, 1],
    [0.5, 0.1, 1],
    [0.5, 0.1, 0],
  ];
  const blocker = [
    [4, 5, 6, 7],
    [3, 2, 1, 0],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [1, 2, 6, 5],
    [3, 0, 4, 7],
  ].map((indices): Face => ({ piece: 'blocker', points: indices.map((i) => points[i]!) }));
  const rows = findZfights([top('a'), top('b'), ...blocker]);
  assert.equal(rows.length, 1);
  assert.ok(Math.abs(rows[0]!.area - 0.5) < 1e-8);
  assert.throws(() => findZfights([], { separation: NaN }));
});
