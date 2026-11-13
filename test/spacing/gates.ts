// Train-spacing harness, the six-hold checkpoint gates (docs/plans/short-turn.md section 7): node test/spacing/gates.ts <E0 dir> <candidate dir> [<compare dir>...]
// Reads sheet.json and runs.jsonl of each; prints the gate table against E0 and the three owed figures.
import fs from 'node:fs';
import path from 'node:path';
type Row = {
  rate: string;
  where: string;
  hold: number;
  mean: number;
  over1050: number;
  worst: { v: number; at: string; seed: string };
  journey: { mean: number };
  longest: { ticks: number; at: string };
  tripUp: number[];
  tripDown: number[];
};
type Run = {
  kind: string;
  where: string;
  light: boolean;
  seed: number;
  plat: Record<string, [number, number, number, number]>;
  pastBy?: Record<string, number>;
  longStands?: { ticks: number; at: string }[];
};
type Quiet = { where: string; kits: string[]; laps: number[] };
type Sheet = { d: string; sheet: { rows: Row[]; quiet: Quiet[] }; runs: Run[] };
type Way = 'up' | 'down';
const [e0Dir, candDir, ...more] = process.argv.slice(2) as [string, string, ...string[]];
const load = (d: string): Sheet => ({
  d,
  sheet: JSON.parse(fs.readFileSync(path.join(d, 'sheet.json'), 'utf8')) as Sheet['sheet'],
  runs: fs.existsSync(path.join(d, 'runs.jsonl'))
    ? fs
        .readFileSync(path.join(d, 'runs.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l) as Run)
    : [],
});
const E0 = load(e0Dir);
const C = load(candDir);
const others = more.map(load);
const row = (S: Sheet, rate: string, where: string) =>
  S.sheet.rows.find((x) => x.rate === rate && x.where === where && x.hold === 75);
const fuzz = (S: Sheet, rate: string, where: string) =>
  S.runs.filter((r) => r.kind === 'fuzz' && r.where === where && (r.light ? 'light' : 'heavy') === rate);
/** Mean wait at a way's platforms (served plus still waiting), pooled. */
function wayWait(S: Sheet, rate: string, where: string, way: Way) {
  let n = 0,
    sum = 0;
  for (const r of fuzz(S, rate, where))
    for (const [k, p] of Object.entries(r.plat))
      if (k.endsWith(` ${way}`)) {
        n += p[0];
        sum += p[1];
      }
  return n ? sum / n : NaN;
}
const trip = (S: Sheet, rate: string, where: string, way: Way) =>
  row(S, rate, where)![way === 'up' ? 'tripUp' : 'tripDown'][0]!;
const f0 = (x: number) => (Number.isFinite(x) ? x.toFixed(0) : '-');
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '-');
const pc = (x: number) => `${(100 * x).toFixed(2)}%`;
const lines: string[] = [];
const gate = (name: string, val: string | number, lim: string, ok: boolean) =>
  lines.push(`| ${name} | ${val} | ${lim} | ${ok ? 'pass' : 'FAIL'} |`);
lines.push(`Gates: ${candDir} against ${e0Dir}`, '', '| gate | value | limit | |', '| --- | --- | --- | --- |');
{
  const r = row(C, 'light', 'settled')!;
  gate('light settled worst', r.worst.v, '1,350', r.worst.v <= 1350);
  gate('light settled share >1,050', pc(r.over1050), '0.5%', r.over1050 <= 0.005);
}
{
  const r = row(C, 'heavy', 'settled')!;
  gate('heavy settled share >1,050', pc(r.over1050), '3.62%', r.over1050 <= 0.0362);
  gate('heavy settled mean', f1(r.mean), '525', r.mean <= 525);
  gate('heavy settled worst', r.worst.v, '1,500', r.worst.v <= 1500);
}
for (const rate of ['heavy', 'light']) {
  const r = row(C, rate, 'whole')!;
  gate(`${rate} whole worst`, r.worst.v, '1,600', r.worst.v <= 1600);
}
for (const rate of ['heavy', 'light'])
  for (const where of ['settled', 'whole']) {
    const a = row(C, rate, where)!.journey.mean,
      b = row(E0, rate, where)!.journey.mean;
    gate(`${rate} ${where} journey mean`, a, `E0 ${b}`, a <= b);
  }
{
  const L = Math.max(
    ...['heavy', 'light'].flatMap((rate) => ['settled', 'whole'].map((w) => row(C, rate, w)!.longest.ticks)),
  );
  gate('longest stand (any row)', L, 'under 1,200', L < 1200);
}
if (C.sheet.quiet.length) {
  const kits = (S: { sheet: { quiet: Quiet[] } }) =>
    JSON.stringify(S.sheet.quiet.map((q) => [q.where, q.kits.map((k) => k.split(':')[0])]).sort());
  const a = kits(C),
    b = kits(
      E0.sheet.quiet.some((q) => q.where === 'settled')
        ? { sheet: { quiet: E0.sheet.quiet.filter((q) => ['settled', 'whole'].includes(q.where)) } }
        : E0,
    );
  gate('kit ticks (quiet settled, whole)', a === b ? 'equal' : 'differ', 'equal to E0', a === b);
  const lap = Math.max(...C.sheet.quiet.flatMap((q) => q.laps));
  gate('quiet lap', lap.toFixed(3), '1.2', lap <= 1.2);
}
for (const rate of ['heavy', 'light'])
  for (const way of ['up', 'down'] as const) {
    const a = trip(C, rate, 'settled', way),
      b = trip(E0, rate, 'settled', way);
    gate(`${rate} settled trip ${way}`, `${a} (${f1((100 * (a - b)) / b)}%)`, `E0 ${b} +5%`, a <= b * 1.05);
  }
for (const rate of ['heavy', 'light'])
  for (const way of ['up', 'down'] as const) {
    const wa = wayWait(C, rate, 'whole', way),
      wb = wayWait(E0, rate, 'whole', way),
      ta = trip(C, rate, 'whole', way),
      tb = trip(E0, rate, 'whole', way);
    gate(
      `${rate} whole door to door ${way}`,
      `${f0(wa)} + ${ta} = ${f0(wa + ta)}`,
      `E0 ${f0(wb)} + ${tb} = ${f0(wb + tb)}`,
      wa + ta <= wb + tb,
    );
    gate(`${rate} whole trip ${way}`, `${ta} (${f1((100 * (ta - tb)) / tb)}%)`, `E0 ${tb} +6%`, ta <= tb * 1.06);
  }
lines.push('', 'Rows (mean / share >1,050 / worst; journey mean; longest stand; trip up/down):', '');
for (const S of [E0, C, ...others])
  for (const rate of ['heavy', 'light'])
    for (const where of ['settled', 'whole']) {
      const r = row(S, rate, where);
      if (!r) continue;
      lines.push(
        `- ${S.d} ${rate} ${where}: ${f1(r.mean)} / ${pc(r.over1050)} / ${r.worst.v} (${r.worst.at}, seed ${r.worst.seed}); journey ${r.journey.mean}; longest ${r.longest.ticks} ${r.longest.at}; trip ${r.tripUp[0]}/${r.tripDown[0]}; wait up/down ${f0(wayWait(S, rate, where, 'up'))}/${f0(wayWait(S, rate, where, 'down'))}`,
      );
    }
lines.push('', "Ring Island's longest stand past the dwell (from `arrived`), and every halt's, by row:", '');
for (const S of [C, ...others])
  for (const rate of ['heavy', 'light'])
    for (const where of ['settled', 'whole']) {
      const by: Record<string, { v: number; seed: string }> = {};
      for (const r of fuzz(S, rate, where))
        for (const [k, v] of Object.entries(r.pastBy ?? {}))
          if (v > (by[k]?.v ?? -1)) by[k] = { v, seed: r.seed.toString(16) };
      const ri = by['Ring Island'];
      lines.push(
        `- ${S.d} ${rate} ${where}: Ring Island ${ri ? `${ri.v} (seed ${ri.seed})` : '-'}; all: ${Object.entries(by)
          .sort((a, b) => b[1].v - a[1].v)
          .map(([k, x]) => `${k} ${x.v}`)
          .join(', ')}`,
      );
    }
lines.push('', 'Stands over 600 and over 800 ticks (dwell included) per 48 seeds, by place:', '');
for (const S of [C, ...others])
  for (const rate of ['heavy', 'light'])
    for (const where of ['settled', 'whole']) {
      const R = fuzz(S, rate, where);
      if (!R[0]?.longStands) continue;
      const by: Record<string, [number, number]> = {};
      let worst = 0;
      for (const r of R)
        for (const x of r.longStands ?? []) {
          const b = (by[x.at.split(' @')[0]!] ??= [0, 0]);
          b[0]++;
          if (x.ticks > 800) b[1]++;
          worst = Math.max(worst, x.ticks);
        }
      const seeds = new Set(R.map((r) => r.seed)).size;
      const k = 48 / seeds;
      lines.push(
        `- ${S.d} ${rate} ${where} (${seeds} seeds): ${
          Object.entries(by)
            .sort((a, b) => b[1][0] - a[1][0])
            .map(([p, [a, b]]) => `${p} ${f0(a * k)} / ${f0(b * k)}`)
            .join('; ') || 'none'
        }; worst ${worst}`,
      );
    }
console.log(lines.join('\n'));
