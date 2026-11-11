// The kill table for the railway test rewrite (docs/plans/ecs-migration-railway.md, M3c and T1 to T7): applies each
// named one-line rule mutation in turn, runs the given test files, restores the file, and prints which tests failed
// under each. A batch prints it before and after its conversion; the two must be identical, or each difference is
// named in its commit body. Not part of `npm run check` (minutes per run).
//
//   node dev/migrate/rail-mutants.ts <test files...>          the table, one block per mutation
//   node dev/migrate/rail-mutants.ts --list                   the mutations only
//   node dev/migrate/rail-mutants.ts --only=<text> <files...>  the mutations whose name holds <text>
//
// A mutation's file must be clean in git before it runs, and is written back from memory in a `finally` (and on
// SIGINT or SIGTERM), so a crash or a ^C leaves the tree as it was; `git diff src/sim` after a run shows nothing.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

type Mutant = { name: string; file: string; from: string; to: string };
/** At least one per rule file (every railway-sys-*.ts, the queries, the train and line catalogs) that the M0 goldens
 * kill on their own; the rest reach edges no seed stage runs (a bill met in steps of 8, a kiln filled in one go), and
 * survive the goldens: they are there for the batches' own unit tests to kill. */
export const MUTANTS: readonly Mutant[] = [
  {
    name: 'train dwell 50 to 51 ticks',
    file: 'src/sim/railway-train.ts',
    from: '  dwellTicks: 50,',
    to: '  dwellTicks: 51,',
  },
  { name: 'carry cap raised by one', file: 'src/sim/railway-layout.ts', from: '  carry: 8,', to: '  carry: 9,' },
  {
    name: 'a line-one bill one log short',
    file: 'src/sim/railway-sys-line1.ts',
    from: '    j.stock !== spec.bill[0] ||',
    to: '    j.stock < spec.bill[0] - 1 ||',
  },
  {
    name: 'the forge lights one log early',
    file: 'src/sim/railway-sys-line2.ts',
    from: '      if (fm.used === FORGE.logs) fm.lit',
    to: '      if (fm.used >= FORGE.logs - 1) fm.lit',
  },
  {
    name: 'the depot cart loads one log more',
    file: 'src/sim/railway-sys-line2.ts',
    from: 'cartMint(w, k, Math.min(CART.load, need.logs));',
    to: 'cartMint(w, k, Math.min(CART.load + 1, need.logs));',
  },
  {
    name: 'a block signal ignored',
    file: 'src/sim/railway-trains.ts',
    from: '    if (within(b, dest) && lineSlots(line)',
    to: '    if (false && within(b, dest) && lineSlots(line)',
  },
  {
    name: 'the kit train never waits for rails',
    file: 'src/sim/railway-sys-trains.ts',
    from: '          tick < r.depart + TRAIN.dwellTicks + TRAIN.kitWaitTicks',
    to: '          tick < r.depart + TRAIN.dwellTicks',
  },
  {
    name: "the kiln's log count off by one",
    file: 'src/sim/railway-sys-works.ts',
    from: 'Math.min(a.carry, WORKS.kilnLogs - works.logs)',
    to: 'Math.min(a.carry, WORKS.kilnLogs + 1 - works.logs)',
  },
  {
    name: 'the pier takes one footing too many',
    file: 'src/sim/railway-sys-works.ts',
    from: "aboard(w, 'foot') >= WORKS.pier)",
    to: "aboard(w, 'foot') > WORKS.pier)",
  },
  {
    name: "the away credit's cap removed",
    file: 'src/sim/railway-sys-away.ts',
    from: '    const n = Math.min(ticks, scheduleOf(LINE1_STATIONS[slot]!, j).totalTicks - run.elapsed);',
    to: '    const n = ticks;',
  },
  {
    name: 'a hand chop yields one log more',
    file: 'src/sim/railway-sys-line1.ts',
    from: 'n = Math.min(rail.axe ? 5 : 2, t.left, room);',
    to: 'n = Math.min(rail.axe ? 5 : 3, t.left, room);',
  },
  {
    name: 'the forge pours a tick slow',
    file: 'src/sim/railway-sys-line2.ts',
    from: 'cm.lastPour += FORGE.pourTicks;',
    to: 'cm.lastPour += FORGE.pourTicks + 1;',
  },
  {
    name: 'a call off the line end allowed',
    file: 'src/sim/railway-sys-trains.ts',
    from: '(halt.stop === 0 && dir < 0)',
    to: '(false && dir < 0)',
  },
  {
    name: 'the kiln casts a tick early',
    file: 'src/sim/railway-sys-works.ts',
    from: '< WORKS.castTicks',
    to: '< WORKS.castTicks - 1',
  },
  {
    name: 'a resume marker credited twice',
    file: 'src/sim/railway-sys-away.ts',
    from: 'if (marker <= clock.resumeMarker) return 0;',
    to: 'if (marker < clock.resumeMarker) return 0;',
  },
  {
    name: 'the supply pulse credits a minute more',
    file: 'src/sim/railway-sys-away.ts',
    from: 'Math.min(1440, e.marker - marker)',
    to: 'Math.min(1440, e.marker - marker + 1)',
  },
  {
    name: 'a session may skip an epoch',
    file: 'src/sim/railway-sys-core.ts',
    from: '      if (epoch !== old.epoch + 1) return false;',
    to: '      if (epoch <= old.epoch) return false;',
  },
  {
    name: 'a back forgets the rails it carries',
    file: 'src/sim/railway-queries.ts',
    from: 'a.carry + a.stone + a.rails;',
    to: 'a.carry + a.stone;',
  },
];

const ROOT = path.resolve(import.meta.dirname, '../..');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const args = process.argv.slice(2).filter((a) => !a.startsWith('--only='));
if (args.includes('--list') || !args.length) {
  for (const m of MUTANTS) console.log(`${m.name}  (${m.file})`);
  if (!args.length) console.log('\nusage: node dev/migrate/rail-mutants.ts <test files...>');
  process.exit(args.length ? 0 : 1);
}

let restore: (() => void) | null = null;
for (const sig of ['SIGINT', 'SIGTERM'] as const)
  process.on(sig, () => {
    restore?.();
    process.exit(130);
  });

function clean(file: string) {
  const r = spawnSync('git', ['status', '--porcelain', '--', file], { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim() === '';
}
// The test runs never see GOLDEN: with it set the golden shards would rewrite their fixtures from the mutated rules
// (M3c's review).
const TEST_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'GOLDEN'));
/** The names of the tests that failed (TAP `not ok` lines), or the reason the run never got to report. */
function failing(files: string[]): string[] {
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files], {
    cwd: ROOT,
    env: TEST_ENV,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
  const names = [...r.stdout.matchAll(/^\s*not ok \d+ - (.*)$/gm)].map((m) => m[1]!.trim());
  return names.length || r.status === 0 ? [...new Set(names)].sort() : [`(exit ${r.status}, no test reported)`];
}

const baseline = failing(args);
if (baseline.length) console.log(`unmutated: ${baseline.length} failing\n  ${baseline.join('\n  ')}`);
for (const m of MUTANTS.filter((x) => !only || x.name.includes(only))) {
  const file = path.join(ROOT, m.file);
  const text = fs.readFileSync(file, 'utf8');
  if (!clean(m.file)) throw new Error(`${m.file} has uncommitted changes: commit or stash them first`);
  const at = text.split(m.from).length - 1;
  if (at !== 1) throw new Error(`${m.name}: the line to mutate is in ${m.file} ${at} times, not once`);
  restore = () => fs.writeFileSync(file, text);
  let killed: string[];
  try {
    fs.writeFileSync(file, text.replace(m.from, m.to));
    killed = failing(args).filter((n) => !baseline.includes(n));
  } finally {
    restore();
    restore = null;
  }
  console.log(`${m.name}: ${killed.length ? `${killed.length} failing` : 'SURVIVED'}`);
  for (const n of killed) console.log(`  ${n}`);
}
