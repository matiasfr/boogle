// The build prototype's hut as data (src/proto/build/blueprint.ts): pieces go up in order, scaffold first, the last
// one only when the hut is built, and the stage follows the ring's stock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HUT_BUILD, buildFraction, shows } from '../src/proto/build/blueprint.ts';

test('pieces are listed in the order they appear, scaffold first, the last at completion', () => {
  HUT_BUILD.forEach((p, k) => k && assert.ok(p.at >= HUT_BUILD[k - 1].at, `piece ${k} out of order`));
  assert.equal(HUT_BUILD[0].kind, 'scaffold');
  assert.equal(HUT_BUILD.at(-1)!.at, 1);
  assert.ok(HUT_BUILD.every((p) => p.at >= 0 && p.at <= 1 && p.w > 0 && p.h > 0 && p.d > 0));
});

test('the stage follows the stock: nothing when empty, more as it fills, everything once built', () => {
  const count = (f: number) => HUT_BUILD.filter((p) => shows(p, f)).length;
  assert.equal(count(buildFraction(0, 36, false)), 0);
  assert.ok(count(buildFraction(2, 36, false)) >= 1);
  assert.ok(count(buildFraction(10, 36, false)) < count(buildFraction(30, 36, false)));
  assert.ok(count(buildFraction(35, 36, false)) < HUT_BUILD.length);
  assert.equal(count(buildFraction(0, 36, true)), HUT_BUILD.length);
});
