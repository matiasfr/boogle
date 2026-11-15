// Owner-requested regression: the offline census must not resurrect retired prototype geometry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
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
