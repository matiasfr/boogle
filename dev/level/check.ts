// One entry point for the classic island's composition and the village's (src/place) progression, the production world's
// land and tech layout. Known classic issues keep their bounded allowances; place assertions have no allowances. The classic
// island stands in the same world, at the origin.
//   npm run level-check                           classic + layout fixtures + place progression
//   npm run level-check -- --all                  also print known classic issues and their reasons
//   npm run level-check -- --place=place          only place progression, all existing states and facts
//   npm run level-check -- --place=classic        classic + layout fixtures

//   npm run level-check -- my-layout.json         only that classic layout fixture
//   npm run level-check -- --json                 coverage, issues, allowances and place facts as JSON
//   npm run level-check -- --cove                 the cove's mesh and heightfield facade in Rapier (opt-in, alone)
import '../node-version.ts'; // first: re-runs under the pinned Node
import fs from 'node:fs';
import path from 'node:path';
import { ALLOW, type Allow } from './allow.ts';
import { sourceBuild } from './build.ts';
import type { Level } from './level.ts';
import type { Issue } from './rules.ts';

const argv = process.argv.slice(2);
const t0 = performance.now();
const cove = argv.includes('--cove');
const place = argv.find((a) => a.startsWith('--place='))?.slice('--place='.length);
const files = argv.filter((a) => !a.startsWith('--'));
const showAll = argv.includes('--all');
const json = argv.includes('--json');
const bad = argv.filter(
  (a) => a.startsWith('--') && !['--all', '--json', '--place=classic', '--place=place', '--cove'].includes(a),
);
if (
  bad.length ||
  argv.filter((a) => a.startsWith('--place=')).length > 1 ||
  (cove && argv.length !== 1) ||
  (place === 'place' && files.length)
) {
  console.error(
    `level-check: unsupported selection${bad.length ? `: ${bad.join(', ')}` : ''}. Use --place=classic|place or a layout file; --cove runs alone.`,
  );
  process.exit(2);
}
if (cove) {
  const { auditCove } = await import('./cove.ts');
  await auditCove();
} else await runChecks();

async function runChecks() {
  const classic = place !== 'place';
  const build = sourceBuild();
  const checkPlace = place === 'place' || (!place && !files.length);
  const coverage = {
    defaultBrowser: 'the railway world (the production entry; the village is src/place)',
    included: [...(classic ? ['classic'] : []), ...(checkPlace ? ['place'] : [])],
    excluded: [
      ...(!classic ? [{ scope: 'classic', reason: 'Only --place=place was selected.' }] : []),
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
    const { loadLevel, root } = await import('./level.ts');
    const { budgets, checkLevel } = await import('./rules.ts');
    const layouts = fs
      .readdirSync(path.join(root, 'dev/layouts'))
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => `dev/layouts/${f}`);
    const asked = files.length ? files : [null, ...layouts];
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
      const name = file ? `classic/${level.name}` : 'classic';
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
    stale = files.length ? [] : allowList.filter((a) => (usage.get(a) ?? 0) < (a.max ?? 1));
    for (const a of stale)
      console.error(
        `dev/level/allow.ts: "${a.level} ${a.rule} ${a.match}" matches ${usage.get(a) ?? 0} of ${a.max ?? 1}: lower or remove it.`,
      );
  }
  if (checkPlace) {
    const { checkMachineClearance } = await import('./machine-clearance.ts');
    const clearance = await checkMachineClearance();
    failed += clearance.failures;
    report.push(clearance);
    if (!json) {
      console.log(
        `machine clearance: ${clearance.samples} poses, ${clearance.sweptSamples} swept mesh samples, ${clearance.failures} problems (${clearance.clearanceMetres} m envelope); ${clearance.railPairs} rail pairs, trolley reach ${clearance.trolleyReachMetres} m on the ${clearance.beamMetres} m beam`,
      );
      for (const contact of clearance.contacts)
        console.log(`  ${contact.label}: ${contact.mesh} intersects ${contact.obstacle}`);
    }
    const { checkBuildingGrounding } = await import('./grounding.ts');
    const grounding = await checkBuildingGrounding();
    failed += grounding.failures;
    report.push(grounding);
    if (!json) {
      console.log(
        `production grounding: ${grounding.rows.length} placements, ${grounding.failures} problems (${grounding.toleranceCm} cm tolerance)`,
      );
      for (const row of grounding.rows.filter((row) => row.failed))
        console.log(
          `  ${row.id} (${row.x}, ${row.z}): gap ${row.gapCm.toFixed(1)} cm, sink ${row.sinkCm.toFixed(1)} cm`,
        );
    }
    const { checkTimberTrack } = await import('./timber-track.ts');
    const timber = checkTimberTrack();
    failed += timber.failures;
    report.push(timber);
    if (!json) {
      console.log(
        `timber against track: ${timber.decks} decks and platforms, ${timber.trackPieces} rails/sleepers/planks of both lines, ${timber.failures} problems (${timber.depthToleranceCm} cm tolerance)`,
      );
      for (const c of timber.contacts)
        console.log(
          `  ${c.deck} (${c.owner}) passes ${c.depthCm.toFixed(1)} cm into ${c.track} near (${c.x.toFixed(1)}, ${c.z.toFixed(1)})`,
        );
    }
    const { checkServiceLedges } = await import('./timber-track.ts');
    const ledges = checkServiceLedges();
    failed += ledges.failures;
    report.push(ledges);
    if (!json) {
      console.log(
        `service walkways: ${ledges.routes} routes, ${ledges.samples} centreline samples, ${ledges.failures} ledges over ${ledges.ledgeM} m`,
      );
      for (const l of ledges.ledges)
        console.log(
          `  ${l.route} deck ${l.deck}: deck ${l.over} stands ${l.above.toFixed(2)} m above it near (${l.x.toFixed(1)}, ${l.z.toFixed(1)})`,
        );
    }
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
    // Ring Island (planned): past Far Head, where place's grid stops (docs/plans/ring-island-build1.md, step 1).
    const { checkRing, printRing } = await import('./ring.ts');
    const ring = checkRing();
    failed += ring.failures;
    report.push(ring);
    if (!json) printRing(ring);
    // Greybox leg 2 (planned boxes): Bell Rock's two levels and Home's West landing (docs/plans/greybox-leg2-massing.md).
    const { checkLeg2, printLeg2 } = await import('./route-leg2.ts');
    const leg2 = checkLeg2();
    failed += leg2.failures;
    report.push(leg2);
    if (!json) printLeg2(leg2);
    // Track continuity: kinks, curves, grades and joins over every line as the game draws it (docs/plans/rail-map.md).
    const { checkContinuity, printContinuity } = await import('./track-continuity.ts');
    const continuity = checkContinuity();
    failed += continuity.failures;
    report.push({ ...continuity, findings: continuity.findings.length });
    if (!json) printContinuity(continuity);
  }

  const timingMs = Math.round(performance.now() - t0);
  if (json) console.log(JSON.stringify({ build, coverage, reports: report, stale, timingMs }, null, 2));
  else console.log(`level-check: ${report.length} reports in ${timingMs} ms`);
  process.exitCode = failed || stale.length ? 1 : 0;
}
