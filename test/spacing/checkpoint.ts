// Train-spacing harness: a checkpoint sheet against a fixed one, row for row (the designer's bar for the fourth car: no
// figure worse than the fixed sheet by more than 10 ticks or 0.3 points, every worst under 1,600). Reads two sheet.json
// files of the same sweep kind (leg1-sweep.ts rows by where, or sweep.ts rows by stage) and prints mean, p95, the
// shares over 1,050 and 1,158 and the worst for each, the differences, and a verdict. Scratch measurement only.
//
//   node test/spacing/checkpoint.ts <fixed/sheet.json> <new/sheet.json>
import fs from 'node:fs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const [fa, fb] = process.argv.slice(2) as [string, string];
const A: Any = JSON.parse(fs.readFileSync(fa, 'utf8')),
  B: Any = JSON.parse(fs.readFileSync(fb, 'utf8'));
const place = (r: Any) => r.where ?? r.stage;
const worst = (r: Any) => (typeof r.worst === 'number' ? r.worst : r.worst ? (r.worst.v ?? r.worst.ticks ?? 0) : 0);
const pts = (x: number) => (100 * x).toFixed(2);
const md: string[] = [
  '| rate | place | mean fixed / new (diff) | p95 | >1,050 (points) | >1,158 (points) | worst | verdict |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
];
let bad = 0;
for (const b of B.rows) {
  if (b.hold !== 75) continue;
  const a = A.rows.find((r: Any) => r.rate === b.rate && place(r) === place(b) && r.hold === 75);
  if (!a) continue;
  const dm = b.mean - a.mean,
    dp = b.p95 - a.p95,
    d1 = 100 * (b.over1050 - a.over1050),
    d2 = 100 * (b.over1158 - a.over1158),
    dw = worst(b) - worst(a);
  const fails = [
    dm > 10 && 'mean',
    dp > 10 && 'p95',
    d1 > 0.3 && '>1,050',
    d2 > 0.3 && '>1,158',
    dw > 10 && 'worst',
    worst(b) >= 1600 && 'over 1,600',
  ].filter(Boolean);
  if (fails.length) bad++;
  md.push(
    `| ${b.rate} | ${place(b)} | ${a.mean} / ${b.mean} (${dm >= 0 ? '+' : ''}${dm.toFixed(1)}) | ${a.p95} / ${b.p95} | ${pts(a.over1050)} / ${pts(b.over1050)} (${d1 >= 0 ? '+' : ''}${d1.toFixed(2)}) | ${pts(a.over1158)} / ${pts(b.over1158)} (${d2 >= 0 ? '+' : ''}${d2.toFixed(2)}) | ${worst(a)} / ${worst(b)} | ${fails.length ? `worse: ${fails.join(', ')}` : 'within'} |`,
  );
}
md.push('', `${bad} rows outside the bar`);
console.log(md.join('\n'));
