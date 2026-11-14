import '../node-version.ts';
import { findZfights, ZFIGHT } from '../../src/geometry/zfight.ts';
import { collectDrawnGeometry } from './drawn-geometry.ts';
import { sourceBuild } from './build.ts';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import {
  classifyZfights,
  baselineDelta,
  makeBaseline,
  className,
  type Baseline,
} from '../../src/geometry/zfight-classify.ts';

const baselineFile = 'dev/level/zfight-baseline.json';
const baselineHash = () =>
  fs.existsSync(baselineFile) ? createHash('sha256').update(fs.readFileSync(baselineFile)).digest('hex') : null;

export async function checkZfights() {
  const start = performance.now();
  const { faces, coverage, excluded } = await collectDrawnGeometry();
  const contacts = findZfights(faces, { includeHidden: true });
  const groups = classifyZfights(contacts);
  const findings = groups.filter((g) => g.class === 'a');
  const baseline = fs.existsSync(baselineFile)
    ? (JSON.parse(fs.readFileSync(baselineFile, 'utf8')) as Baseline)
    : { version: 1 as const, entries: [] };
  if (baseline.version !== 1 || !Array.isArray(baseline.entries)) throw new Error('Unsupported z-fighting baseline');
  const delta = baselineDelta(groups, baseline);
  const counts = { a: 0, b: 0, c: 0 };
  for (const group of groups) counts[group.class]++;
  const rawCounts = { a: 0, b: 0, c: 0 };
  for (const c of contacts) rawCounts[c.hidden ? 'c' : c.differences?.length === 0 ? 'b' : 'a']++;
  const { commit, sourceHash } = sourceBuild();
  return {
    level: 'drawn-z-fighting',
    build: { commit, sourceHash },
    tolerances: ZFIGHT,
    faces: faces.length,
    pieces: new Set(faces.map((f) => f.piece)).size,
    coverage,
    excluded,
    findings,
    groups,
    counts,
    rawCounts,
    newSinceBaseline: delta.newFindings.length,
    staleBaselinePairs: delta.stalePairs,
    baseline: { file: baselineFile, hash: baselineHash(), entries: baseline.entries.length },
    count: findings.length,
    timingMs: Math.round(performance.now() - start),
    failures: 0,
  };
}
export function printZfights(report: Awaited<ReturnType<typeof checkZfights>>, limit = 5, all = false) {
  console.log(
    `drawn z-fighting: a likely visible ${report.counts.a}, b joints ${report.counts.b}, c hidden ${report.counts.c}; new since baseline: ${report.newSinceBaseline} (${report.pieces} pieces, ${report.faces} faces, ${report.timingMs} ms; report only)`,
  );
  for (const [i, c] of (all ? report.groups : report.findings).slice(0, limit).entries())
    console.log(
      `  ${i + 1}. [${c.class} ${className[c.class]}, ${c.count} rows] ${c.a} <> ${c.b}: ${c.area.toFixed(4)} m², ${(c.separation * 1000).toFixed(3)} mm at (${c.position.map((v) => v.toFixed(3)).join(', ')}) — ${c.reasons.join(', ') || 'same appearance'}`,
    );
  for (const scope of report.excluded) console.log(`  Excluded: ${scope}`);
  if (report.staleBaselinePairs.length)
    console.log(`  Baseline: remove ${report.staleBaselinePairs.length} fixed/stale member pairs.`);
}
if (process.argv[1]?.endsWith('/zfight.ts')) {
  const args = process.argv.slice(2);
  if (args.some((a) => !['--json', '--strict', '--all', '--write-baseline'].includes(a)))
    throw new Error('Use --json, --all, --strict, --write-baseline');
  const report = await checkZfights();
  if (args.includes('--write-baseline')) {
    fs.writeFileSync(baselineFile, JSON.stringify(makeBaseline(report.groups), null, 2) + '\n');
    report.newSinceBaseline = 0;
    report.staleBaselinePairs = [];
    report.baseline = { file: baselineFile, hash: baselineHash(), entries: report.findings.length };
  }
  if (args.includes('--json')) {
    const { groups, ...summary } = report;
    console.log(JSON.stringify({ ...summary, ...(args.includes('--all') ? { groups } : {}) }, null, 2));
  } else printZfights(report, args.includes('--all') ? Infinity : 20, args.includes('--all'));
  process.exitCode = args.includes('--strict') && report.newSinceBaseline ? 1 : 0;
}
