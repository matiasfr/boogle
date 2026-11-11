// Schema golden (docs/plans/ecs-migration-railway.md, M0): the railway's component schema is the portable layer (the
// wire, the save and the hash; what an engine evaluation reads). test/fixtures/rail-schema.json lists every component
// in RAIL_COMPONENTS order with its kind, key, replicate and track flags, required components, non-zero defaults and
// fields with types in order, with the WORLD_NS it was recorded under. Changing any of it without a WORLD_NS bump
// breaks mixed builds and saved rooms. Regenerate with `GOLDEN=1 node --test test/railway-schema.test.ts` together
// with the bump.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { WORLD_NS } from '../src/world/namespace.ts';
import { RAIL_COMPONENTS, RAIL_REPLICATED } from '../src/sim/railway-world.ts';

const FILE = new URL('./fixtures/rail-schema.json', import.meta.url);
type Entry = {
  kind: string;
  key: string | null;
  replicate: boolean;
  track: boolean;
  requires: string[];
  defaults: Record<string, string | number | boolean>;
  fields: [string, string][];
};
type Golden = { worldNs: string; components: Entry[] };

const zero = (type: string) => (type === 'str' ? '' : type === 'bool' ? false : 0);
const schema = (): Entry[] =>
  RAIL_COMPONENTS.map((c) => ({
    kind: c.kind,
    key: c.key ?? null,
    replicate: c.replicate,
    track: c.track,
    requires: c.requires.map((r) => r.kind),
    defaults: Object.fromEntries(
      c.names.filter((f) => c.defaults[f] !== zero(c.fields[f])).map((f) => [f, c.defaults[f]!]),
    ),
    fields: c.names.map((f) => [f, c.fields[f]] as [string, string]),
  }));

if (process.env.GOLDEN === '1') {
  const g: Golden = { worldNs: WORLD_NS, components: schema() };
  writeFileSync(FILE, JSON.stringify(g, null, 1) + '\n');
}
const golden = JSON.parse(readFileSync(FILE, 'utf8')) as Golden;

test('the railway component schema matches the golden, or WORLD_NS moved', () => {
  if (JSON.stringify(schema()) === JSON.stringify(golden.components)) return;
  assert.notEqual(
    WORLD_NS,
    golden.worldNs,
    `the railway component schema changed (component order, kind, key, flags, defaults or a field's name, type or ` +
      `position) while WORLD_NS is still ${WORLD_NS}. Mixed builds and saved rooms would break: revert it, or bump ` +
      `WORLD_NS with a dated history entry and regenerate (GOLDEN=1).`,
  );
  assert.fail(
    `WORLD_NS moved (${golden.worldNs} -> ${WORLD_NS}) and the schema changed: regenerate the golden (GOLDEN=1).`,
  );
});

test('the golden marks exactly the replicated components RAIL_REPLICATED lists', () => {
  const rep = golden.components.filter((c) => c.replicate).map((c) => c.kind);
  assert.deepEqual(
    rep,
    RAIL_REPLICATED.map((c) => c.kind),
  );
});
