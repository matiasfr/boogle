// node dev/level/zfight-report.ts <classified-report.json> > docs/research/zfighting-2026-11-14.md
import fs from 'node:fs';
import type { checkZfights } from './zfight.ts';
const report = JSON.parse(fs.readFileSync(process.argv[2]!, 'utf8')) as Awaited<ReturnType<typeof checkZfights>>;
const proofFile = 'docs/research/zfighting-2026-11-14-visual.json';
const proofs = fs.existsSync(proofFile)
  ? (JSON.parse(fs.readFileSync(proofFile, 'utf8')) as { rank: number; manifest: string; observation: string }[])
  : [];
const row = (c: (typeof report.findings)[number], i: number) =>
  `| ${i + 1} | ${c.a} | ${c.b} | ${c.area.toFixed(4)} | ${c.count} | ${c.position.map((v) => v.toFixed(3)).join(', ')} | ${c.reasons.filter((r) => !r.startsWith('occluded')).join(', ')} |`;
const reported = report.findings.flatMap((c, i) =>
  c.members.some(
    (m) =>
      m.a.includes('door-step-1') || (m.a === 'Home/station/batch-0/43' && m.b === 'railway.halt-0-down-deck/part-5'),
  )
    ? [row(c, i)]
    : [],
);
console.log(
  [
    '# Classified z-fighting census, 14 November 2026',
    '',
    `Geometry remains the launch origin/main snapshot \`fceb07f6115d854628bd14e3bb677b46866075b4\`; no geometry fixes are made here. Run commit \`${report.build.commit}\`, source hash \`${report.build.sourceHash}\`.`,
    '',
    `Grouped findings: **a likely visible ${report.counts.a}; b same-appearance joints ${report.counts.b}; c proved hidden ${report.counts.c}**. Raw oriented rows: a ${report.rawCounts.a}, b ${report.rawCounts.b}, c ${report.rawCounts.c}. New since baseline: **${report.newSinceBaseline}**. ${report.pieces} pieces, ${report.faces} triangles, ${report.timingMs} ms (not a performance benchmark).`,
    '',
    'The old 3,151-row list lacked appearance and omitted buried portions. This pass preserves authored/instance colours, vertex colours, texture/UV evidence and shadow flags. Hidden counts now include clipped buried portions, so raw totals are not the old count partitioned. Any exposed portion with differing or unresolved appearance keeps the whole grouped contact in a. Downward normals alone never imply hidden.',
    '',
    'Orientations of an exact piece pair collapse first (maximum face area, not a double count). One anchor against repeated part instances groups next. Track assemblies additionally group repeated pairs of the same kit-part families as one recurring pattern; every member and coordinate remains in the JSON. Areas for such groups sum member pair areas; coordinates identify the largest representative contact, not the average of an entire line.',
    '',
    '## New top twenty: class a only',
    '',
    'Names below are representative pieces; count includes all oriented/hidden member rows within the group. The [committed JSON](zfighting-findings-2026-11-14.json) contains the complete class-a list and member coordinates. `npm run zfight -- --all` exposes b/c as well.',
    '',
    '| Rank | Piece A | Piece B | Area m² | Rows | World x, y, z | Evidence for class a |',
    '| --- | --- | --- | ---: | ---: | --- | --- |',
    ...report.findings.slice(0, 20).map(row),
    '',
    '## The two owner reports',
    '',
    'Both remain **class a**. Home is the kerb against the platform foundation beside the spur; Forge is the upper door step against its slab. Their current ranks and representative coordinates are:',
    '',
    '| Rank | Piece A | Piece B | Area m² | Rows | World x, y, z | Evidence for class a |',
    '| --- | --- | --- | ---: | ---: | --- | --- |',
    ...reported,
    '',
    '## New visual review of the top ten',
    '',
    'All captures use the existing broker and in-game scan tint. Each clears the tint after 1.2 seconds for middle motion-sheet comparison frames, then rescans at 1.8 seconds so the final full-size still has tints. These are still-image observations: none proves temporal flicker. Free-camera underside views do not establish that the normal player camera can reach that view. Missing or ambiguous evidence remains in a.',
    '',
    '| Rank | Manifest under .look/evidence | Inspected observation |',
    '| --- | --- | --- |',
    ...proofs.map((p) => `| ${p.rank} | ${p.manifest} | ${p.observation} |`),
    '',
    'The loaded rail asset has a negative signed volume on its main shell (bottom triangles face upward), while plank/sleeper shells have positive volume. Rail/deck contacts also have different steel/wood appearance, so they cannot honestly be labelled harmless same-material joints. They are grouped recurring suspects, not thousands of default lines. Procedural grain phases, unknown legacy shader/material details and uncertain camera accessibility remain class a.',
    '',
    '## Baseline, limits and validation',
    '',
    'The committed `dev/level/zfight-baseline.json` contains only class-a member pairs. New member pairs inside an existing pattern count as new findings; grouping cannot silently absorb new debt. Fixing a contact leaves a stale baseline pair to remove. Level-check remains report-only; `--strict` fails on new findings only. [Rules, commands and baseline workflow](../agents/test-details/zfighting.md).',
    '',
    report.coverage,
    '',
    ...report.excluded.map((s) => `- ${s}`),
    '',
    'Known limits: geometry-only legacy adapters lack some appearance details and remain conservative a; arbitrary TSL colour/deformation and procedural grain are not proven equal. Only closed convex connected solids and drawn terrain prove occlusion. No general player-camera visibility oracle exists. No ROM data added; not tested on a device.',
  ].join('\n'),
);
