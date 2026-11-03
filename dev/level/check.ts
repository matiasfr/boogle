// `npm run level-check`: there's no level editor because agents write levels, so this stands in for the designer who'd
// catch a mistake. It composes today's island and each dev/layouts/*.json headless and checks reachability, overlaps,
// slopes, bounds and water (./rules.ts), and reports budgets. Known problems are in ./allow.ts; a new one fails.
//   npm run level-check                       everything; fails on anything not allowed
//   npm run level-check -- --all              also lists what's allowed, with reasons
//   npm run level-check -- my-layout.json     just that file
//   npm run level-check -- --json             the issues as JSON
//   npm run level-check -- --island=low --all the opt-in home surface, including known issues
import fs from 'node:fs';
import path from 'node:path';
import { ALLOW, type Allow } from './allow.ts';
import type { Level } from './level.ts';
import type { Issue } from './rules.ts';

const argv = process.argv.slice(2);
const low = argv.includes('--island=low');
if (low) Object.defineProperty(globalThis, 'location', { value: { search: '?classic=1&island=low&room=island-low' } });
// Site modules read natural heights while composing cave approaches, so select the surface before importing them.
const { loadLevel, root } = await import('./level.ts');
const { budgets, checkLevel } = await import('./rules.ts');
const files = argv.filter((a) => !a.startsWith('--'));
const showAll = argv.includes('--all');
const json = argv.includes('--json');

const t0 = performance.now();
const layouts = fs
  .readdirSync(path.join(root, 'dev/layouts'))
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => `dev/layouts/${f}`);
const asked = files.length ? files : low ? [null] : [null, ...layouts];
const allowList = files.length ? ALLOW.filter((a) => a.level === 'all') : ALLOW; // 'all': facts of the home island

const where = (i: Issue) => `${i.file} (${i.x.toFixed(1)}, ${i.z.toFixed(1)})`;
function printIssue(i: Issue) {
  console.log(`  ${i.rule}: ${where(i)}`);
  console.log(`    ${i.message}`);
  console.log(`    Do: ${i.fix}`);
}

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

let failed = 0;
const report: unknown[] = [];
for (const file of asked) {
  const level = loadLevel(file);
  const issues = checkLevel(level);
  const fresh: Issue[] = [];
  const allowed: { issue: Issue; entry: Allow }[] = [];
  for (const issue of issues) {
    const entry = allowFor(level, issue);
    if (entry) allowed.push({ issue, entry });
    else fresh.push(issue);
  }
  failed += fresh.length;
  const { counts, budget, over } = budgets(level);
  report.push({ level: level.name, issues: fresh, allowed: allowed.map((a) => a.issue), counts });
  if (json) continue;
  const line = `${low ? 'island-low' : level.name}: ${fresh.length ? `${fresh.length} PROBLEMS` : 'ok'}, ${allowed.length} known`;
  console.log(
    `${line}; ${counts.placed}/${budget.placed} objects, ${counts.spheres}/${budget.spheres} collider spheres, ${counts.bodies}/${budget.bodies} bodies${over.length ? ` (over budget: ${over.join(', ')}; report only)` : ''}${level.labSections ? `; ${level.labSections} lab-only sections not checked` : ''}`,
  );
  for (const i of fresh) printIssue(i);
  if (showAll)
    for (const { issue, entry } of allowed) {
      console.log(`  known ${issue.rule}: ${where(issue)}: ${issue.message}`);
      console.log(`    Why it's allowed: ${entry.reason}`);
    }
}

const stale = files.length || low ? [] : allowList.filter((a) => (usage.get(a) ?? 0) < (a.max ?? 1));
for (const a of stale)
  console.error(
    `dev/level/allow.ts: "${a.level} ${a.rule} ${a.match}" matches ${usage.get(a) ?? 0} of ${a.max ?? 1}: lower or remove it.`,
  );
if (json) console.log(JSON.stringify(report, null, 2));
else console.log(`level-check: ${asked.length} levels in ${Math.round(performance.now() - t0)} ms`);
process.exit(failed || stale.length ? 1 : 0);
