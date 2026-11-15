// Owner-requested regression: the offline census must not resurrect retired prototype geometry.
import { test } from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { collectTechGeometry } from '../dev/level/tech-geometry.ts';
import { padById } from '../src/place/tech-layout.ts';
import { ORIGIN } from '../src/place/layout.ts';
import { collectDrawnGeometry } from '../dev/level/drawn-geometry.ts';

test('census captures current tech builders instead of the retired recovery pad catalogue', async () => {
  const { faces } = await collectDrawnGeometry();
  const pieces = new Set(faces.map((f) => f.piece));
  assert.ok(![...pieces].some((p) => /jump-catch|jump-return|glide-ramp/.test(p)), 'no undrawn prototype ramps/slabs');
  assert.ok(
    [...pieces].some((p) => p.startsWith('tech/tools/')),
    'starting pillar/platform builder captured',
  );
  assert.ok(
    [...pieces].some((p) => p.startsWith('tech/hook/')),
    'live hook slab builder captured',
  );
  assert.deepEqual(
    [...pieces].filter((p) => /:pad\/|:pad-column\//.test(p)),
    [],
    'no legacy pad box recipes',
  );
});

// Explicit expected inventory prevents an incomplete adapter from agreeing with itself.
test('every surviving runtime pad and support reaches the census', async () => {
  const expected = [
    ...Array.from({ length: 2 }, (_, i) => `tech/tools/${i}`),
    ...Array.from({ length: 19 }, (_, i) => `tech/hook/${i}`),
    ...Array.from({ length: 4 }, (_, i) => `tech/line2/${i}`),
    ...Array.from({ length: 7 }, (_, i) => `tech/secrets/${i}`),
  ].sort();
  const direct = collectTechGeometry();
  const { faces } = await collectDrawnGeometry();
  assert.deepEqual([...new Set(direct.map((f) => f.piece))].sort(), expected);
  assert.deepEqual([...new Set(faces.filter((f) => f.piece.startsWith('tech/')).map((f) => f.piece))].sort(), expected);
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
    const points = faces.filter((f) => f.piece === piece).flatMap((f) => f.points);
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
});

// Pin every object's bounds and face count as well as its ID: replacing a missing piece with a duplicate must fail.
test('runtime tech inventory matches the audited per-piece geometry snapshot', () => {
  const faces = collectTechGeometry();
  const inventory = [...new Set(faces.map((f) => f.piece))].sort().map((id) => {
    const rows = faces.filter((f) => f.piece === id),
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
