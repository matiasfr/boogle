// The wagon's lockstep clock and `?layout=` (src/island/layout.ts moves ROUTE's positions in place on one tab): the
// steam rules (src/world/rules/wagon.ts) ask wagonStandsAt, which reads the shipped line, so a tab walking a layout
// ticks the same as the others and the server. Its own file: it moves ROUTE before the wagon module builds its line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE } from '../src/sim/route.ts';
import { wagonAt, wagonStandsAt, wagonCycle } from '../src/sim/wagon.ts';

test('wagonStandsAt follows the shipped line, whatever ?layout= did to ROUTE', () => {
  const shipped = ROUTE.map((r) => ({ x: r.x, z: r.z, to: [r.to[0], r.to[1]] }));
  // A layout walk, before anything has asked the wagon module where the line is: every section twice as long.
  ROUTE.forEach((r) => Object.assign(r, { to: [r.x + (r.to[0] - r.x) * 2, r.z + (r.to[1] - r.z) * 2] }));
  const standing = (laid: number) => {
    const out: boolean[] = [];
    for (let t = 0; t < 3000; t += 0.5) out.push(wagonStandsAt(laid, t));
    return out;
  };
  const moved = [1, 2, 3].map(standing);
  ROUTE.forEach((r, s) => Object.assign(r, shipped[s])); // back as shipped: wagonAt now builds the same line
  [1, 2, 3].forEach((laid, k) => {
    assert.ok(wagonCycle(laid) < 3000);
    const want: boolean[] = [];
    for (let t = 0; t < 3000; t += 0.5) want.push(wagonAt(laid, t)!.stop >= 0);
    assert.deepEqual(moved[k], want, `laid ${laid}`);
  });
  assert.equal(wagonStandsAt(0, 123), true); // nothing laid: no wagon to run
});
