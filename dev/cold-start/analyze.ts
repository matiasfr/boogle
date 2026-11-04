// Reassess saved broker timelines with this checkout's metrics without rewriting the trusted broker's report.
// node dev/cold-start/analyze.ts <evidence-dir> <new-output.json>
import fs from 'node:fs';
import path from 'node:path';
import { summarize, comparePairs, comparisonThreshold } from './report.ts';
import type { StartupTimeline } from '../../src/debug/startup-record.ts';

const [directory, output] = process.argv.slice(2);
if (!directory || !output) throw new Error('Use analyze.ts <evidence-dir> <new-output.json>');
const source = path.resolve(directory, 'report.json');
const report = JSON.parse(fs.readFileSync(source, 'utf8')) as {
  changedDuringRun: boolean;
  results: { run: number; kind: string; health: string[] }[];
  cacheProof: { exclusiveCleared: boolean; exclusiveWrites: boolean };
};
const results = report.results.map((r) => {
  const timeline = JSON.parse(
    fs.readFileSync(path.join(directory, `${r.run}-${r.kind}-timeline.json`), 'utf8'),
  ) as StartupTimeline;
  return { ...r, summary: summarize(timeline) };
});
const compared = comparePairs(results);
const trueCold =
  compared.measurable &&
  report.cacheProof.exclusiveCleared &&
  report.cacheProof.exclusiveWrites &&
  !report.changedDuringRun &&
  !fs.existsSync(path.join(directory, 'failure.json'));
const assessment = {
  source,
  ...compared,
  cacheProof: { ...report.cacheProof, measurable: compared.measurable, trueCold, threshold: comparisonThreshold },
  results,
};
fs.writeFileSync(output, JSON.stringify(assessment, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, trueCold, ...compared }, null, 2));
