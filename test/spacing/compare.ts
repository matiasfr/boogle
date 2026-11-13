// Train-spacing harness: two sweeps' raw runs compared run for run (the off case bit for bit): every fuzz run of the
// second found in the first with the same place, seed, hold and rate must have identical waits, and every quiet run
// identical hashes, wagon, footing and kit ticks. Prints the count compared and any difference; exits 1 on one.
//
//   node test/spacing/compare.ts <a/runs.jsonl> <b/runs.jsonl>
import fs from 'node:fs';

const read = (p: string) =>
  fs
    .readFileSync(p, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Record<string, unknown>);
const [pa, pb] = process.argv.slice(2) as [string, string];
const key = (r: Record<string, unknown>) =>
  r.kind === 'fuzz' ? `fuzz ${r.where} ${r.seed} ${r.headPct} ${r.light}` : `quiet ${r.where} ${r.headPct ?? 75}`;
const a = new Map(read(pa).map((r) => [key(r), r]));
let n = 0,
  bad = 0;
for (const r of read(pb)) {
  if (r.kind === 'error') {
    console.log('error in b:', JSON.stringify(r));
    bad++;
    continue;
  }
  const o = a.get(key(r));
  if (!o) continue;
  n++;
  const fields =
    r.kind === 'fuzz' ? ['waits', 'stand', 'trips', 'longest'] : ['hashes', 'wagon', 'footing', 'kits', 'laps'];
  for (const f of fields)
    if (JSON.stringify(o[f]) !== JSON.stringify(r[f])) {
      console.log(`${key(r)}: ${f} differs`);
      bad++;
    }
}
console.log(`${n} runs compared, ${bad} differences`);
process.exit(bad ? 1 : 0);
