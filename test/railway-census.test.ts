// The railway's system census (docs/plans/ecs-migration-railway.md, section 2, M3, M3b): every system a
// railway-sys-*.ts file exports is dispatched by exactly one of the op table, the tick schedule or the named entry
// points; every component is written by some system; no two systems share a phase and order (createSchedule refuses
// that); and no railway sim file re-exports another's names but the two blocks recorded here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createSchedule, type System } from '../src/ecs/index.ts';
import { RAIL_COMPONENTS } from '../src/sim/railway-components.ts';
import { RAIL_ENTRIES, RAIL_OPS, RAIL_SYSTEMS, RAIL_TICK } from '../src/sim/railway-systems.ts';

const SIM = new URL('../src/sim/', import.meta.url);
/** Every railway-sys-*.ts module, found on disk, so a new domain file is counted without editing this test. */
const SYSTEM_FILES: [string, Record<string, unknown>][] = await Promise.all(
  readdirSync(SIM)
    .filter((f) => /^railway-sys-.+\.ts$/.test(f))
    .sort()
    .map(async (f) => [f, (await import(new URL(f, SIM).href)) as Record<string, unknown>] as const),
);
const isSystem = (v: unknown): v is System<never, unknown> =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as { fn?: unknown }).fn === 'function' &&
  typeof (v as { phase?: unknown }).phase === 'string' &&
  typeof (v as { order?: unknown }).order === 'number';
const REEXPORT = /export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s*(?:as\s+\w+\s*)?from\s*'([^']+)'/g;
/** The one re-export left: the seed route behind railway-seeds.ts (not on M3b's list; line one's read helpers on
 * `Railway` went in M12b-2). */
const RE_EXPORTS = ['railway-seeds.ts <- ./railway-seed-route.ts'];

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
});

test('every system a railway-sys-*.ts file exports is in RAIL_SYSTEMS, and RAIL_SYSTEMS holds nothing else', () => {
  const listed = new Set<unknown>(RAIL_SYSTEMS);
  const exported: string[] = [];
  for (const [file, mod] of SYSTEM_FILES)
    for (const [key, value] of Object.entries(mod))
      if (isSystem(value)) {
        exported.push(value.name);
        assert.ok(listed.has(value), `${file} exports ${key} (${value.name}), which no list dispatches`);
      }
  assert.deepEqual([...exported].sort(), RAIL_SYSTEMS.map((s) => s.name).sort());
});

test('no src/sim/railway-*.ts file re-exports, but the two recorded blocks', () => {
  const found: string[] = [];
  for (const f of readdirSync(SIM).filter((f) => /^railway.*\.ts$/.test(f)))
    for (const m of readFileSync(new URL(f, SIM), 'utf8').matchAll(REEXPORT)) found.push(`${f} <- ${m[1]}`);
  assert.deepEqual(found.sort(), RE_EXPORTS);
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
      // Slice 5's yards, between the cart and the trains.
      ['rail.yardTick', 'tick', 2.5],
      ['rail.trainTick', 'tick', 3],
      // Slice 5 R3's riders, after the trains.
      ['rail.tradeTick', 'tick', 3.5],
      ['rail.worksTick', 'tick', 4],
      // Ring Island build 2's steel works casts after the kiln (ring-island-build2, R1).
      ['rail.steelTick', 'tick', 5],
      ['rail.jobClock', 'tick', 6],
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
