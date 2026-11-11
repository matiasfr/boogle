// The railway's system census (docs/plans/ecs-migration-railway.md, section 2, M3): every system is dispatched by
// exactly one of the op table, the tick schedule or the named entry points; every component is written by some
// system; and no two systems share a phase and order (createSchedule refuses that).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchedule } from '../src/ecs/index.ts';
import { RAIL_COMPONENTS } from '../src/sim/railway-components.ts';
import { RAIL_ENTRIES, RAIL_OPS, RAIL_SYSTEMS, RAIL_TICK } from '../src/sim/railway-systems.ts';

test('every railway system is in exactly one of the op table, the tick and the entry points', () => {
  const ops = Object.values(RAIL_OPS).flat();
  const homes = new Map<string, string[]>();
  for (const [home, list] of [
    ['ops', [...new Set(ops)]],
    ['tick', RAIL_TICK],
    ['entries', RAIL_ENTRIES],
  ] as const)
    for (const s of list) homes.set(s.name, [...(homes.get(s.name) ?? []), home]);
  for (const [name, at] of homes) assert.equal(at.length, 1, `${name} is in ${at.join(' and ')}`);
  assert.equal(new Set(ops).size, ops.length, 'a system answers two ops');
  assert.deepEqual(
    RAIL_SYSTEMS.map((s) => s.name),
    [...homes.keys()],
    'RAIL_SYSTEMS is the op table, the tick and the entry points',
  );
  assert.equal(RAIL_SYSTEMS.length, 50);
});

test('the op table names each system after its op, the deposit falling through to line two', () => {
  for (const [op, list] of Object.entries(RAIL_OPS)) assert.equal(list[0]!.name, op, op);
  assert.deepEqual(
    RAIL_OPS['rail.deposit']!.map((s) => s.name),
    ['rail.deposit', 'rail.deposit2'],
  );
  for (const s of Object.values(RAIL_OPS).flat()) assert.equal(s.phase, 'act', s.name);
});

test('the tick runs in the declared order the hand-coded tick used', () => {
  assert.deepEqual(
    RAIL_TICK.map((s) => [s.name, s.phase, s.order]),
    [
      ['rail.lineTick', 'tick', 0],
      ['rail.line2Tick', 'tick', 1],
      ['rail.cartTick', 'tick', 2],
      ['rail.trainTick', 'tick', 3],
      ['rail.worksTick', 'tick', 4],
      ['rail.jobClock', 'tick', 5],
    ],
  );
});

test('every component is written by at least one system', () => {
  const written = new Set(RAIL_SYSTEMS.flatMap((s) => s.writes.map((c) => c.kind)));
  for (const c of RAIL_COMPONENTS) assert.ok(written.has(c.kind), `${c.kind} is written by no system`);
});

test('no two systems share a phase and order', () => {
  assert.doesNotThrow(() => createSchedule(RAIL_SYSTEMS));
});
