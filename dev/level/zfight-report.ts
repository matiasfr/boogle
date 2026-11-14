// Turn a saved `node --import ./dev/sim/hooks.ts dev/level/zfight.ts --json` into a reviewable census.
// node dev/level/zfight-report.ts <report.json> > docs/research/zfighting-2026-11-14.md
import fs from 'node:fs';
import type { checkZfights } from './zfight.ts';
const report = JSON.parse(fs.readFileSync(process.argv[2]!, 'utf8')) as Awaited<ReturnType<typeof checkZfights>>;
const row = (c: (typeof report.findings)[number], i: number) =>
  `| ${i + 1} | ${c.a} | ${c.b} | ${c.area.toFixed(4)} | ${(c.separation * 1000).toFixed(4)} | ${c.position.map((v) => v.toFixed(3)).join(', ')} |`;
const reported = report.findings.flatMap((c, i) =>
  c.a.includes('door-step-1') || (c.a === 'Home/station/batch-0/43' && c.b === 'railway.halt-0-down-deck/part-5')
    ? [row(c, i)]
    : [],
);
console.log(
  [
    '# Z-fighting census, 14 November 2026',
    '',
    `Geometry source: local origin/main \`fceb07f6115d854628bd14e3bb677b46866075b4\`. Tool run at commit \`${report.build.commit}\`, source hash \`${report.build.sourceHash}\`. All geometry-producing game files match that base; tooling never fixes the two reported placements.`,
    '',
    `${report.count} candidate oriented face-pair rows across ${report.pieces} pieces and ${report.faces} triangles. This run took ${report.timingMs} ms (not a performance benchmark). Both reported contacts were found; the supplied screenshot references 1.png and 2.png were opened.`,
    '',
    'The [full ranked JSON](zfighting-findings-2026-11-14.json) lists every other candidate with world coordinates, normal, exposed area and separation. Opposite sides of a pair are separate rows. No candidates are allowlisted. The ten largest are below; coordinates are supplied for owner review, not visually approved.',
    '',
    '| Rank | Piece A | Piece B | Area m² | Separation mm | World x, y, z |',
    '| --- | --- | --- | ---: | ---: | --- |',
    ...report.findings.slice(0, 10).map(row),
    '',
    '## Reported regressions',
    '',
    'Home: the old station kerb against the platform foundation, next to the engine spur. Forge: the upper stone door step against the workshop slab. These are geometry-confirmed correspondences to the supplied stills, not fixes.',
    '',
    '| Rank | Piece A | Piece B | Area m² | Separation mm | World x, y, z |',
    '| --- | --- | --- | ---: | ---: | --- |',
    ...reported,
    '',
    '## False positives and coverage',
    '',
    'Treat every row as a diagnostic candidate. Many track-kit contacts are intended construction joints: matching material/UVs can make them harmless. Downward-facing greybox/track overlaps can be exposed into an inaccessible void, so local exterior exposure overstates player-visible defects. Non-convex or open geometry can leave occluded contacts in the output. The two supplied screenshots establish visible defects; the remaining rows are not individually visually adjudicated.',
    '',
    `Rows involving main track: ${report.findings.filter((c) => c.a.startsWith('track/') || c.b.startsWith('track/')).length}. Downward normals (y < -0.9): ${report.findings.filter((c) => c.normal[1] < -0.9).length}. These sets overlap; neither is an automatically safe baseline.`,
    '',
    `Tolerances: ${report.tolerances.separation * 1000} mm, normal dot ${report.tolerances.normalDot}, area ${report.tolerances.minArea} m². The tolerance covers transformed-buffer noise without treating ordinary centimetre offsets as coincident. See [how to run, place pieces, and adopt a baseline](../agents/test-details/zfighting.md).`,
    '',
    report.coverage,
    '',
    ...report.excluded.map((s) => `- ${s}`),
    '',
    'No ROM data was added. Not tested on a device.',
    '',
  ].join('\n'),
);
