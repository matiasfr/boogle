// The load check on the world (docs/plans/ecs-migration-railway.md, M8b): each bad world in
// test/fixtures/railway-bad-worlds.ts, one per `throw` message of the world check, is refused with that message; every
// message the world check throws is an entry or named unreachable; and the two conservation checks the seeds rely on
// stay in it. Every golden stage's acceptance is in the golden shards (test/helpers/railway-golden.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { World } from '../src/ecs/index.ts';
import { check } from '../src/sim/railway-drive.ts';
import { BAD_WORLDS, BAD_WORLD_STAGES, DOMINATED, UNREACHABLE } from './fixtures/railway-bad-worlds.ts';
import { stageWorld, worldVerdict } from './helpers/railway-check.ts';

// Built at module scope, outside the 5 s test timeout (as the golden shards do).
const bases = new Map<string, World>(BAD_WORLD_STAGES.map((stage) => [stage, stageWorld(stage)]));
const broken = (entry: (typeof BAD_WORLDS)[number]) => {
  const w = bases.get(entry.stage)!.clone();
  entry.break(w);
  return w;
};

test('the bad worlds are built on stages the world check accepts', () => {
  for (const [stage, w] of bases) assert.equal(worldVerdict(w), null, stage);
});
for (const entry of BAD_WORLDS)
  test(`bad world ${entry.site}: refused with "${entry.message}" by the world check`, () => {
    assert.equal(worldVerdict(broken(entry)), entry.message);
  });

// The world check's messages, read from its source: every `bad('…')` in the check files, and the message literals of
// trainRowBroken, which checkTrains throws (railway-check-trains.ts). Ring Island's are in test/railway-check-ring.test.ts.
function said() {
  const files = ['railway-check.ts', 'railway-check-line1.ts', 'railway-check-line2.ts', 'railway-check-trains.ts'];
  const text = [...files, 'railway-check-works.ts']
    .map((f) => readFileSync(new URL(`../src/sim/${f}`, import.meta.url), 'utf8'))
    .join('\n');
  const out = new Set([...text.matchAll(/bad\('([^']+)'\)/g)].map((m) => `railway: ${m[1]!}`));
  const trains = readFileSync(new URL('../src/sim/railway-trains.ts', import.meta.url), 'utf8');
  const start = trains.indexOf('export function trainRowBroken(');
  const body = trains.slice(start, trains.indexOf('\n}\n', start));
  for (const m of body.matchAll(/'(railway: [^']+)'/g)) out.add(m[1]!);
  return out;
}
test('every message the world check throws is a bad world, unreachable or dominated, and nothing else is listed', () => {
  const listed = new Set([...BAD_WORLDS, ...UNREACHABLE, ...DOMINATED].map((e) => e.message));
  assert.deepEqual([...listed].sort(), [...said()].sort());
});

// Review of M12b-1: the set above counts messages, not sites. The world check splits 'job bounds' and 'line2 job
// bounds' into three sites each (railway-check-line1.ts, railway-check-line2.ts); the corpus had two worlds for each,
// so the start/completion range site had none (dropping `!railInt(j.completion, 1)` passed every test). Each line now
// has a `completion: 2` world for it.
test('review M12b-1: each bad() site of the world check has its own entry (sites counted with repeats)', () => {
  const files = ['railway-check.ts', 'railway-check-line1.ts', 'railway-check-line2.ts', 'railway-check-works.ts'];
  const sites = new Map<string, number>();
  for (const f of [...files, 'railway-check-trains.ts'])
    for (const m of readFileSync(new URL(`../src/sim/${f}`, import.meta.url), 'utf8').matchAll(/bad\('([^']+)'\)/g))
      sites.set(`railway: ${m[1]!}`, (sites.get(`railway: ${m[1]!}`) ?? 0) + 1);
  const entries = new Map<string, number>();
  for (const e of [...BAD_WORLDS, ...UNREACHABLE, ...DOMINATED])
    entries.set(e.message, (entries.get(e.message) ?? 0) + 1);
  const short = [...sites].filter(([m, n]) => (entries.get(m) ?? 0) < n).map(([m, n]) => `${m}: ${n} sites`);
  assert.deepEqual(short, []);
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
