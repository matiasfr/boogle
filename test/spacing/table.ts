// Train-spacing harness: one comparison table over several leg 1 sweeps (test/spacing/leg1-sweep.ts sheet.json), judged
// against the short-turn plan's tier 1 (none over 1,350 settled, none over 1,600 on the whole leg, at light asks) and
// its keep rule (the settled share over 1,050 at least halves at both rates against E0, the means no higher), with the
// Gorge-bound journey and the worst outward and outer waits beside them. Each argument is `<label>=<dir>[@<hold>]`;
// the first is E0. Scratch measurement only.
//
//   node test/spacing/table.ts e0=.look/spacing/leg1-e0 hp100=.look/spacing/step1/hp@100 ...
import fs from 'node:fs';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const args = process.argv.slice(2).map((a) => {
  const [label, rest] = a.split('=') as [string, string];
  const [dir, hold] = rest.split('@') as [string, string | undefined];
  return { label, dir, hold: hold === undefined ? 75 : Number(hold) };
});
const sheets = args.map((a) => ({
  ...a,
  j: JSON.parse(fs.readFileSync(path.join(a.dir, 'sheet.json'), 'utf8')) as Any,
}));
const row = (s: (typeof sheets)[number], rate: string, where: string) =>
  s.j.rows.find((r: Any) => r.rate === rate && r.where === where && r.hold === s.hold);
const pct = (x: number) => `${(100 * x).toFixed(2)}%`;
const e0 = sheets[0]!;
const OUTER = ['Ring Island up', 'Railhead up', 'Stack head 3 up', 'Stack head 3 down', 'High Gorge down'];
const md: string[] = [];
md.push(
  '| candidate | rate | settled mean | settled >1,050 | settled worst | whole mean | whole >1,050 | whole worst | journey mean / p95 / worst (n) | Ring Island up worst | Railhead up worst | outer worst (SH3 up, SH3 down, HG down) | longest stand | tier 1 | keep |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
);
for (const s of sheets)
  for (const rate of ['heavy', 'light']) {
    const st = row(s, rate, 'settled'),
      wh = row(s, rate, 'whole');
    if (!st || !wh) continue;
    const base = row(e0, rate, 'settled');
    const worst = (r: Any) => (r.worst ? r.worst.v : 0);
    const tier1 = rate === 'light' ? worst(st) <= 1350 && worst(wh) <= 1600 : null;
    const half = (k: string) => {
      const a = row(s, k, 'settled'),
        b = row(e0, k, 'settled');
      return a && b && a.over1050 <= b.over1050 / 2 && a.mean <= b.mean;
    };
    const keep = half('heavy') && half('light');
    const pl = (k: string) => st.plat?.[k]?.worst ?? '-';
    md.push(
      `| ${s.label} | ${rate} | ${st.mean.toFixed(1)} | ${pct(st.over1050)} | ${worst(st)} | ${wh.mean.toFixed(1)} | ${pct(wh.over1050)} | ${worst(wh)} | ${st.journey ? `${st.journey.mean} / ${st.journey.p95} / ${st.journey.worst} (${st.journey.n})` : '-'} | ${pl('Ring Island up')} | ${pl('Railhead up')} | ${pl('Stack head 3 up')}, ${pl('Stack head 3 down')}, ${pl('High Gorge down')} | ${Math.max(st.longest.ticks, wh.longest.ticks)} | ${tier1 === null ? '' : tier1 ? 'yes' : 'no'} | ${rate === 'heavy' ? (keep ? 'yes' : 'no') : ''} |`,
    );
    void base;
  }
md.push('', 'Settled waits by platform and way: worst (mean, share over 1,050), E0 then each candidate:', '');
for (const rate of ['heavy', 'light']) {
  const names = Object.keys(row(e0, rate, 'settled')?.plat ?? {}).sort();
  md.push(`- ${rate}:`);
  for (const k of names)
    md.push(
      `  - ${k}${OUTER.includes(k) ? ' (outer)' : ''}: ${sheets
        .map((s) => {
          const p = row(s, rate, 'settled')?.plat?.[k];
          return p ? `${s.label} ${p.worst} (${p.mean}, ${pct(p.over1050)})` : `${s.label} -`;
        })
        .join('; ')}`,
    );
}
console.log(md.join('\n'));
