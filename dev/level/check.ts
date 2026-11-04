// One entry point for classic composition and Round 4 (place) progression. Known classic issues keep their bounded
// allowances; place assertions have no allowances. The browser's default URL selects Round 4, not classic.
//   npm run level-check                           classic + layout fixtures + place progression
//   npm run level-check -- --all                  also print known classic issues and their reasons
//   npm run level-check -- --place=place          only place progression, all existing states and facts
//   npm run level-check -- --place=classic        classic + layout fixtures
//   npm run level-check -- --island=low --all      only classic-low, including known issues
//   npm run level-check -- my-layout.json         only that classic layout fixture
//   npm run level-check -- --json                 coverage, issues, allowances and place facts as JSON
//   npm run level-check -- --place=place --physics --region=T3 --state=empty
import fs from 'node:fs';
import path from 'node:path';
import { ALLOW, type Allow } from './allow.ts';
import { sourceBuild } from './build.ts';
import type { Level } from './level.ts';
import type { Issue } from './rules.ts';

const argv = process.argv.slice(2);
const t0 = performance.now();
const low = argv.includes('--island=low');
const physics = argv.includes('--physics');
const replay = argv.includes('--replay');
const place = argv.find((a) => a.startsWith('--place='))?.slice('--place='.length);
const files = argv.filter((a) => !a.startsWith('--'));
const showAll = argv.includes('--all');
const json = argv.includes('--json');
const bad = argv.filter(
  (a) =>
    a.startsWith('--') &&
    !['--all', '--json', '--island=low', '--place=classic', '--place=place', '--physics', '--replay'].includes(a) &&
    !((a.startsWith('--region=') || a.startsWith('--state=') || a.startsWith('--fixture=')) && physics),
);
if (
  bad.length ||
  argv.filter((a) => a.startsWith('--place=')).length > 1 ||
  (physics && (place !== 'place' || low || files.length || replay)) ||
  (replay && argv.length !== 1) ||
  (place === 'place' && (low || files.length))
) {
  console.error(
    `level-check: unsupported selection${bad.length ? `: ${bad.join(', ')}` : ''}. Use --place=classic|place, --island=low, or a layout file; --physics requires --place=place; --replay runs alone.`,
  );
  process.exit(2);
}
if (physics) {
  const { runSpatialAudit } = await import('./spatial.ts');
  await runSpatialAudit(argv);
} else if (replay) {
  const { runReplays } = await import('./replay.ts');
  await runReplays();
} else await runChecks();

async function runChecks() {
  const classic = place !== 'place';
  const build = sourceBuild();
  const checkPlace = place === 'place' || (!place && !low && !files.length);
  const coverage = {
    defaultBrowser: 'place (Round 4; ?proto=place&fresh=1&coop=1)',
    included: [...(classic ? [low ? 'classic-low' : 'classic'] : []), ...(checkPlace ? ['place'] : [])],
    excluded: [
      ...(!low ? [{ scope: 'classic-low', reason: 'Opt-in comparison surface; request --island=low.' }] : []),
      ...(!classic ? [{ scope: 'classic', reason: 'Only --place=place was selected.' }] : []),
      ...(low ? [{ scope: 'classic', reason: 'The classic-low surface was selected instead.' }] : []),
      ...(!checkPlace ? [{ scope: 'place', reason: 'An explicit classic surface or layout was selected.' }] : []),
      ...(classic
        ? [
            {
              scope: 'classic structure/cave interiors and render-created colliders',
              reason:
                'The adapter composes terrain, sites, route and prop blueprints without rendering POI structures.',
            },
          ]
        : []),
      ...(checkPlace
        ? [
            {
              scope: 'place props, room/station collision, hook visibility and swept player clearance',
              reason:
                'The progression model uses a 2 m terrain flood, bridge/rail links and approximate ability envelopes.',
            },
            {
              scope: 'place controller timing, dynamic train/cargo, directed dry returns and recovery',
              reason:
                'These checks preserve the existing forward reachability assertions; they are not movement witnesses.',
            },
          ]
        : []),
    ],
  };
  if (!json) {
    console.log(`Source: ${build.sourceHash} (${build.dependencies.length} files; commit ${build.commit}).`);
    console.log(`Coverage: ${coverage.included.join(', ')}. Default browser entry: ${coverage.defaultBrowser}.`);
    for (const item of coverage.excluded) console.log(`  Excluded ${item.scope}: ${item.reason}`);
  }

  const where = (i: Issue) => `${i.file} (${i.x.toFixed(1)}, ${i.z.toFixed(1)})`;
  function printIssue(i: Issue) {
    console.log(`  ${i.rule}: ${where(i)}`);
    console.log(`    ${i.message}`);
    console.log(`    Do: ${i.fix}`);
  }

  let failed = 0;
  const report: unknown[] = [];
  let stale: Allow[] = [];
  if (classic) {
    if (low)
      Object.defineProperty(globalThis, 'location', { value: { search: '?classic=1&island=low&room=island-low' } });
    // Site modules read natural heights while composing cave approaches: select the surface before importing them.
    const { loadLevel, root } = await import('./level.ts');
    const { budgets, checkLevel } = await import('./rules.ts');
    const layouts = fs
      .readdirSync(path.join(root, 'dev/layouts'))
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => `dev/layouts/${f}`);
    const asked = files.length ? files : low ? [null] : [null, ...layouts];
    const allowList = files.length ? ALLOW.filter((a) => a.level === 'all') : ALLOW;
    const usage = new Map<Allow, number>();
    function allowFor(level: Level, i: Issue) {
      const entry = allowList.find(
        (a) =>
          (a.level === 'all' || a.level === level.name) &&
          a.rule === i.rule &&
          i.id.includes(a.match) &&
          (usage.get(a) ?? 0) < (a.max ?? 1),
      );
      if (entry) usage.set(entry, (usage.get(entry) ?? 0) + 1);
      return entry;
    }
    for (const file of asked) {
      const level = loadLevel(file);
      const name = file ? `${low ? 'classic-low' : 'classic'}/${level.name}` : low ? 'classic-low' : 'classic';
      const issues = checkLevel(level);
      const fresh: Issue[] = [];
      const allowed: { issue: Issue; reason: string }[] = [];
      for (const issue of issues) {
        const entry = allowFor(level, issue);
        if (entry) allowed.push({ issue, reason: entry.reason });
        else fresh.push(issue);
      }
      failed += fresh.length;
      const { counts, budget, over } = budgets(level);
      const excluded = level.labSections
        ? [
            {
              scope: `${level.labSections} lab-only route sections`,
              reason: 'The runtime builds only the classic route length.',
            },
          ]
        : [];
      report.push({ level: name, states: ['composed'], issues: fresh, allowed, counts, budget, over, excluded });
      if (json) continue;
      const line = `${name}: ${fresh.length ? `${fresh.length} PROBLEMS` : 'ok'}, ${allowed.length} known`;
      console.log(
        `${line}; ${counts.placed}/${budget.placed} objects, ${counts.spheres}/${budget.spheres} collider spheres, ${counts.bodies}/${budget.bodies} bodies${over.length ? ` (over budget: ${over.join(', ')}; report only)` : ''}`,
      );
      for (const item of excluded) console.log(`  Excluded ${item.scope}: ${item.reason}`);
      for (const i of fresh) printIssue(i);
      if (showAll)
        for (const { issue, reason } of allowed) {
          console.log(`  known ${issue.rule}: ${where(issue)}: ${issue.message}`);
          console.log(`    Why it's allowed: ${reason}`);
        }
    }
    stale = files.length || low ? [] : allowList.filter((a) => (usage.get(a) ?? 0) < (a.max ?? 1));
    for (const a of stale)
      console.error(
        `dev/level/allow.ts: "${a.level} ${a.rule} ${a.match}" matches ${usage.get(a) ?? 0} of ${a.max ?? 1}: lower or remove it.`,
      );
  }
  if (checkPlace) {
    const start = performance.now();
    const { runPlaceLevelCheck, printPlaceLevelCheck } = await import('../economy/place-level.ts');
    const result = runPlaceLevelCheck();
    const timingMs = Math.round(performance.now() - start);
    failed += result.failures;
    report.push({ ...result, timingMs });
    if (!json) {
      console.log(`place states: ${result.states.join(', ')}`);
      printPlaceLevelCheck(result);
      console.log(
        `place: ${result.failures ? `${result.failures} PROBLEMS` : 'ok'} in ${timingMs} ms (import + checks)`,
      );
    }
  }

  const timingMs = Math.round(performance.now() - t0);
  if (json) console.log(JSON.stringify({ build, coverage, reports: report, stale, timingMs }, null, 2));
  else console.log(`level-check: ${report.length} reports in ${timingMs} ms`);
  process.exitCode = failed || stale.length ? 1 : 0;
}
