import '../node-version.ts';
import { findZfights, ZFIGHT } from '../../src/geometry/zfight.ts';
import { collectDrawnGeometry } from './drawn-geometry.ts';
import { sourceBuild } from './build.ts';

export async function checkZfights() {
  const start = performance.now();
  const { faces, coverage, excluded } = await collectDrawnGeometry();
  const findings = findZfights(faces);
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
    count: findings.length,
    timingMs: Math.round(performance.now() - start),
    failures: 0,
  };
}
export function printZfights(report: Awaited<ReturnType<typeof checkZfights>>, limit = 5) {
  console.log(
    `drawn z-fighting: ${report.count} candidates (${report.pieces} pieces, ${report.faces} faces, ${report.timingMs} ms; report only)`,
  );
  for (const [i, c] of report.findings.slice(0, limit).entries())
    console.log(
      `  ${i + 1}. ${c.a} <> ${c.b}: ${c.area.toFixed(4)} m², ${(c.separation * 1000).toFixed(3)} mm at (${c.position.map((v) => v.toFixed(3)).join(', ')}) normal (${c.normal.map((v) => v.toFixed(3)).join(', ')})`,
    );
  for (const scope of report.excluded) console.log(`  Excluded: ${scope}`);
}
if (process.argv[1]?.endsWith('/zfight.ts')) {
  const args = process.argv.slice(2);
  if (args.some((a) => !['--json', '--strict', '--all'].includes(a))) throw new Error('Use --json, --all, --strict');
  const report = await checkZfights();
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else printZfights(report, args.includes('--all') ? Infinity : 10);
  process.exitCode = args.includes('--strict') && report.count ? 1 : 0;
}
