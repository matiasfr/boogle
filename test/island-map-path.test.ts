// The halt map's line 2 runs on past the Pier (halt-map.ts): a train's marker, placed by `pathAt` at its `s`, stands on
// the Railhead's and Ring Island's stops at the first and last railhead, the solid track ends where the stage says, and
// Ring Island lights only when joined.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathAt } from '../src/render/island-map.ts';
import { haltMap } from '../src/entities/railway/halt-map.ts';
import { RING_HEAD, RING_END } from '../src/sim/railway-ring-layout.ts';

test('a marker on line 2 follows the path past the Pier to the Railhead and Ring Island', async () => {
  const layout = await import('../src/place/layout.ts');
  for (const head of [0, 7]) {
    const l2 = haltMap(layout, { open: 5, head }).lines[1]!;
    const rail = l2.stops.find((s) => s.name === 'Railhead')!,
      ring = l2.stops.find((s) => s.name === 'Ring Island')!;
    assert.equal(rail.s, RING_HEAD[head]!.s / 100, `railhead ${head}: the stop is at the bent`);
    assert.equal(ring.s, RING_END.s / 100);
    for (const st of [rail, ring]) {
      const p = pathAt(l2, st.s);
      assert.ok(
        Math.hypot(p.x - st.x, p.z - st.z) < 1e-6,
        `railhead ${head}: a marker at ${st.name} stands on its stop`,
      );
    }
    assert.equal(l2.laid, rail.s, `railhead ${head}: solid to the Railhead`);
    assert.equal(l2.path[l2.path.length - 1]!.s, ring.s, 'the dashed line runs on to Ring Island');
  }
});

test('the map shows the Railhead only once Q7 is laid, and lights Ring Island when joined', async () => {
  const layout = await import('../src/place/layout.ts');
  const names = (open: number) => haltMap(layout, { open, head: 3 }).lines[1]!.stops.map((s) => s.name);
  assert.ok(!names(3).includes('Ring Island') && !names(3).includes('Railhead'));
  assert.ok(names(4).includes('Ring Island') && !names(4).includes('Railhead'));
  assert.ok(names(5).includes('Railhead') && names(5).includes('Ring Island'));
  const pier = haltMap(layout, { open: 4, head: 0 }).lines[1]!;
  assert.equal(pier.laid, pier.stops.find((s) => s.name === 'Pier')!.s, 'solid track ends at the Pier until Q7');
  const joined = haltMap(layout, { open: 6, head: 7 }).lines[1]!;
  assert.equal(joined.laid, joined.stops.find((s) => s.name === 'Ring Island')!.s, 'joined: solid to Ring Island');
  assert.equal(joined.stops.at(-1)!.name, 'High Gorge', 'joined: the stack line runs on, dashed, to High Gorge');
  assert.equal(
    joined.stops.find((s) => s.name === 'Railhead')!.s,
    RING_HEAD[7]!.s / 100,
    'the Railhead stays at the last bent',
  );
});
