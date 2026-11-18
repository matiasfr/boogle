// Owner-requested regression: the offline census must not resurrect retired prototype geometry.
import { test } from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { padById } from '../src/place/tech-layout.ts';
import { ORIGIN } from '../src/place/layout.ts';
import { collectDrawnGeometry } from '../dev/level/drawn-geometry.ts';

test('the drawn census captures every audited tech piece and no retired prototype geometry', async () => {
  const { faces } = await collectDrawnGeometry();
  const pieces = new Set(faces.map((f) => f.piece));
  assert.ok(![...pieces].some((p) => /jump-catch|jump-return|glide-ramp/.test(p)), 'no undrawn prototype ramps/slabs');
  assert.deepEqual(
    [...pieces].filter((p) => /:pad\/|:pad-column\//.test(p)),
    [],
    'no legacy pad box recipes',
  );
  const techFaces = faces.filter((f) => f.piece.startsWith('tech/'));
  // Check semantic locations too: indices alone must not conceal a duplicated pad or omitted support.
  for (const [piece, pad] of [
    ['tech/tools/1', 'p1'],
    ['tech/line2/0', 'apron'],
    ['tech/line2/1', 'apron'],
    ['tech/line2/2', 'p2'],
    ['tech/secrets/0', 'lookout'],
    ['tech/secrets/1', 'stack'],
    ['tech/secrets/2', 'balcony'],
    ['tech/secrets/3', 'lookout'],
    ['tech/secrets/4', 'loft'],
    ['tech/secrets/5', 'balcony'],
    ['tech/secrets/6', 'stack'],
  ] as const) {
    const points = techFaces.filter((f) => f.piece === piece).flatMap((f) => f.points);
    assert.ok(points.length, piece);
    const p = padById(pad!);
    for (const [axis, value] of [
      [0, p.x + ORIGIN.x],
      [2, p.z],
    ]) {
      const coordinates = points.map((p) => p[axis!]!);
      const center = (Math.min(...coordinates) + Math.max(...coordinates)) / 2;
      // Seven-sided columns are asymmetric around their bounding-box centre.
      assert.ok(Math.abs(center - value!) < 0.3, `${piece}: ${pad} axis ${axis}`);
    }
  }
  const inventory = [...new Set(techFaces.map((f) => f.piece))].sort().map((id) => {
    const rows = techFaces.filter((f) => f.piece === id),
      points = rows.flatMap((f) => f.points);
    return {
      id,
      faces: rows.length,
      min: [0, 1, 2].map((axis) => +Math.min(...points.map((p) => p[axis]!)).toFixed(4)),
      max: [0, 1, 2].map((axis) => +Math.max(...points.map((p) => p[axis]!)).toFixed(4)),
    };
  });
  assert.deepEqual(inventory, JSON.parse(fs.readFileSync('test/fixtures/zfight-tech-inventory.json', 'utf8')));
});
