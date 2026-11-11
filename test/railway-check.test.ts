// The load check on the world (docs/plans/ecs-migration-railway.md, M8b): each bad world in
// test/fixtures/railway-bad-worlds.ts, one per `throw` site of the old validators, is refused by the world check with
// that site's message, and the read model's check (until M12b) gives the same; every throw site is either an entry or
// named unreachable; and the two conservation checks the seeds rely on stay in it. Every golden stage's acceptance is in
// the golden shards (test/helpers/railway-golden.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { World } from '../src/ecs/index.ts';
import { check } from '../src/sim/railway-drive.ts';
import {
  BAD_WORLDS,
  BAD_WORLD_STAGES,
  BY_CONSTRUCTION,
  DOMINATED,
  UNREACHABLE,
} from './fixtures/railway-bad-worlds.ts';
import { modelVerdict, stageWorld, worldVerdict } from './helpers/railway-check.ts';

// Built at module scope, outside the 5 s test timeout (as the golden shards do).
const bases = new Map<string, World>(BAD_WORLD_STAGES.map((stage) => [stage, stageWorld(stage)]));
const broken = (entry: (typeof BAD_WORLDS)[number]) => {
  const w = bases.get(entry.stage)!.clone();
  entry.break(w);
  return w;
};

test('the bad worlds are built on stages both checks accept', () => {
  for (const [stage, w] of bases) {
    assert.equal(worldVerdict(w), null, stage);
    assert.equal(modelVerdict(w), null, stage);
  }
});
for (const entry of BAD_WORLDS)
  test(`bad world ${entry.site}: refused with "${entry.message}" by the world check and the read model's`, () => {
    const w = broken(entry);
    assert.equal(worldVerdict(w), entry.message, 'the world check');
    assert.equal(modelVerdict(w), entry.message, "the read model's check");
  });

// The old validators' `throw` sites, counted in their source: each is an entry, unreachable or dominated.
const SOURCES: [string, string][] = [
  ['src/sim/railway-check.ts', 'validateRailway'],
  ['src/sim/railway-line.ts', 'validateRailLine'],
  ['src/sim/railway-line2.ts', 'validateRailLine2'],
  ['src/sim/railway-trains.ts', 'validateRailTrains'],
  // validateRailTrains throws what trainRowBroken returns (R3a): that function's message literals are its sites.
  ['src/sim/railway-trains.ts', 'trainRowBroken'],
  ['src/sim/railway-works.ts', 'validateRailWorks'],
];
function throwSites(file: string, fn: string) {
  const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const start = text.indexOf(`export function ${fn}(`);
  const end = text.indexOf('\n}\n', start);
  const body = text.slice(start, end);
  if (fn === 'trainRowBroken') return [...body.matchAll(/'(railway: [^']+)'/g)].map((m) => m[1]!);
  return [...body.matchAll(/throw new Error\('([^']+)'\)/g)].map((m) => m[1]!);
}
test('every throw site of the old validators is a bad world, unreachable or dominated (87 sites)', () => {
  const sites = SOURCES.flatMap(([file, fn]) => throwSites(file, fn)).sort();
  assert.equal(sites.length, 87, 'the old validators changed: list the new sites');
  const listed = [...BAD_WORLDS, ...UNREACHABLE, ...DOMINATED].map((e) => e.message).sort();
  assert.deepEqual(listed, sites);
  assert.equal(BY_CONSTRUCTION.length, 2);
});
test("the world check's own throw sites hold the same messages as the old validators'", () => {
  const files = ['railway-check.ts', 'railway-check-line1.ts', 'railway-check-line2.ts', 'railway-check-trains.ts'];
  const text = [...files, 'railway-check-works.ts']
    .map((f) => readFileSync(new URL(`../src/sim/${f}`, import.meta.url), 'utf8'))
    .join('\n');
  const said = new Set([...text.matchAll(/bad\('([^']+)'\)/g)].map((m) => `railway: ${m[1]!}`));
  // checkTrains throws whatever trainRowBroken returns (railway-check-trains.ts), so its message literals are said too.
  for (const m of throwSites('src/sim/railway-trains.ts', 'trainRowBroken')) said.add(m);
  for (const e of BAD_WORLDS) assert.ok(said.has(e.message), e.message);
});

// The seeds' safety rests on these two staying in the load check (M3c's review): the seed builders check the world
// (railway-drive.ts check) where they once read line2Rails and footingTotal off the model. A rail or a footing that
// appears from nowhere, or goes missing, must be refused by the check the seeds run.
test('the check the seeds run refuses a rail or a footing that is not conserved', () => {
  for (const message of ['railway: rail conservation', 'railway: footing conservation']) {
    const entries = BAD_WORLDS.filter((e) => e.message === message);
    assert.equal(entries.length, 1, message);
    assert.equal(check(broken(entries[0]!)), message);
  }
});
