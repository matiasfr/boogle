// Asset size targets warn and never fail (owner, 10 November): an asset over 4 MB (or its sidecar's budgetKB), a texture
// over 2048 px, and a first load over 25 MB or total over 100 MB each produce a warning line that is counted in the summary.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BUDGET, assetSizeWarning, textureSizeWarning, sizeSummary, budgetReport } from '../dev/assets/manifest.ts';

const MB = 1024 * 1024;

test('an asset over its size target warns with name, size and limit; within it is silent', () => {
  const w = assetSizeWarning('big-rig', 5 * MB, BUDGET.assetKB);
  assert.match(w!, /big-rig: 5120\.0 KB is over its 4096\.0 KB size target/);
  assert.equal(assetSizeWarning('ok', 4 * MB, BUDGET.assetKB), null);
  assert.ok(assetSizeWarning('hero', 3 * MB, 2048), "a sidecar's budgetKB is the limit");
  assert.equal(assetSizeWarning('hero', 3 * MB, 4096), null);
});

test('an oversized texture warns with its name, size and the 2048 px target (it is not an error)', () => {
  assert.match(textureSizeWarning('lamp', 'albedo', 4096)!, /lamp: texture albedo is 4096 px, over the 2048 px target/);
  assert.equal(textureSizeWarning('lamp', 'albedo', 2048), null);
});

test('first load and total over their targets are flags to warn on, with the numbers', () => {
  const r = budgetReport(
    { a: 30 * MB, b: 80 * MB },
    { a: { priority: 'first', conditional: false }, b: { priority: 'later', conditional: false } },
  );
  assert.equal(r.flags.length, 2);
  assert.match(r.flags[0]!, /First-load size target exceeded/);
  assert.match(r.flags[1]!, /Total download size target exceeded/);
});

test('the summary counts each asset over a target once', () => {
  const s = sizeSummary(10, ['a: big', 'b: big'], ['a: texture x'], ['First-load size target exceeded']);
  assert.match(
    s,
    /^2 of 10 assets over a size target \(2 over size, 1 oversized textures, 1 of first-load and total over\)$/,
  );
});
