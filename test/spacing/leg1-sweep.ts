// Train-spacing harness on the grown line, the sweep (docs/plans/train-spacing.md, section 3): runs
// test/spacing/leg1.ts over the places, holds, ask rates and seeds in at most 4 processes, pools line 2's waits by
// place, and writes the section 3 columns as markdown (sheet.txt) and JSON (sheet.json) under SPACING_OUT, with
// every run's raw line (runs.jsonl). Scratch measurement only. Settings, all by environment:
//
//   SPACING_OUT      output directory (required)
//   SPACING_WHERE    stage0,stage1,stage2,stage3,stage4,settled,whole
//   SPACING_HOLDS    75,0          (0% runs heavy asks only: printed, safety only)
//   SPACING_RATES    heavy,light
//   SPACING_TICKS    20000
//   SPACING_SEEDS    1000-102f     (hex range or comma list: the 48 of the 12 November baseline)
//   SPACING_WORKERS  4
//   SPACING_QUIET    12000         nothing-asked ticks a place (0: skip)
//   SPACING_FROM     runs.jsonl    re-aggregate an earlier sweep's raw lines instead of running
//   SPACING_HOLD, SPACING_HOLD_LATE  passed through to the workers (test/spacing/leg1.ts)
//
//   SPACING_OUT=.look/spacing/leg1-e0 node test/spacing/leg1-sweep.ts
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const env = (k: string, own: string) => process.env[k] || own;
const OUT = process.env.SPACING_OUT;
if (!OUT) throw new Error('SPACING_OUT: an output directory');
const WHERE = env('SPACING_WHERE', 'stage0,stage1,stage2,stage3,stage4,settled,whole').split(',');
const HOLDS = env('SPACING_HOLDS', '75,0').split(',').map(Number);
const RATES = env('SPACING_RATES', 'heavy,light').split(',');
const TICKS = Number(env('SPACING_TICKS', '20000'));
const SEEDS = env('SPACING_SEEDS', '1000-102f');
const seedList = SEEDS.includes('-')
  ? (() => {
      const [a, b] = SEEDS.split('-').map((h) => Number.parseInt(h, 16)) as [number, number];
      return Array.from({ length: b - a + 1 }, (_v, j) => a + j);
    })()
  : SEEDS.split(',').map((h) => Number.parseInt(h, 16));
const WORKERS = Math.min(4, Number(env('SPACING_WORKERS', '4')));
const QUIET = Number(env('SPACING_QUIET', '12000'));
fs.mkdirSync(OUT, { recursive: true });

const jobs: string[][] = [];
const CHUNK = 8;
for (const rate of RATES)
  for (const where of WHERE)
    for (const hold of HOLDS) {
      if (hold === 0 && rate === 'light') continue;
      for (let j = 0; j < seedList.length; j += CHUNK)
        jobs.push([
          'fuzz',
          where,
          String(hold),
          String(TICKS),
          rate,
          seedList
            .slice(j, j + CHUNK)
            .map((x) => x.toString(16))
            .join(','),
        ]);
    }
if (QUIET > 0)
  for (const where of WHERE)
    for (const hold of HOLDS) if (hold > 0) jobs.push(['quiet', where, String(QUIET), String(hold)]);

const lines: string[] = [];
const runOne = (args: string[]) =>
  new Promise<void>((done) => {
    const p = spawn(
      process.execPath,
      ['--import', './test/helpers/rail-no-audit.ts', 'test/spacing/leg1.ts', ...args],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    );
    let buf = '';
    p.stdout.on('data', (d: Buffer) => (buf += d.toString()));
    p.on('close', (code) => {
      for (const l of buf.split('\n')) if (l.trim()) lines.push(l);
      if (code) lines.push(JSON.stringify({ kind: 'error', args, code }));
      process.stderr.write(`done ${args.join(' ')}\n`);
      done();
    });
  });
let next = 0;
if (process.env.SPACING_FROM)
  lines.push(
    ...fs
      .readFileSync(process.env.SPACING_FROM, 'utf8')
      .split('\n')
      .filter((l) => l.trim()),
  );
else
  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      while (next < jobs.length) await runOne(jobs[next++]!);
    }),
  );
fs.writeFileSync(path.join(OUT, 'runs.jsonl'), lines.join('\n') + '\n');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const runs: Any[] = lines.map((l) => JSON.parse(l));
const errors = runs.filter((r) => r.kind === 'error');
const pct = (x: number) => `${(100 * x).toFixed(2)}%`;
const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]! : 0;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const rows: Any[] = [];
for (const rate of RATES)
  for (const where of WHERE)
    for (const hold of HOLDS) {
      const R = runs.filter(
        (r) => r.kind === 'fuzz' && r.where === where && r.headPct === hold && r.light === (rate === 'light'),
      );
      if (!R.length) continue;
      const waits: number[] = R.flatMap((r) => r.waits);
      const long = R.flatMap((r) => r.long.map((x: Any) => ({ ...x, seed: r.seed })));
      const top = long.reduce((a: Any, x: Any) => (x.v > (a?.v ?? -1) ? x : a), null);
      const head: Record<string, { n: number; sum: number; sq: number }> = {};
      for (const r of R)
        for (const [k, v] of Object.entries(r.headway as Record<string, { n: number; sum: number; sq: number }>)) {
          const h = (head[k] ??= { n: 0, sum: 0, sq: 0 });
          h.n += v.n;
          h.sum += v.sum;
          h.sq += v.sq;
        }
      const headway = Object.fromEntries(
        Object.entries(head).map(([k, h]) => {
          const m = h.sum / Math.max(1, h.n);
          return [
            k,
            {
              mean: Math.round(m),
              cv: Number((Math.sqrt(Math.max(0, h.sq / Math.max(1, h.n) - m * m)) / m).toFixed(2)),
            },
          ];
        }),
      );
      const laps = R.reduce((a, r) => a + r.laps, 0);
      const stand: Record<string, number> = {};
      for (const r of R)
        for (const [k, v] of Object.entries(r.stand as Record<string, number>)) stand[k] = (stand[k] ?? 0) + v;
      const early = (x: Any) => x.asked < 1000;
      const up = R.flatMap((r) => r.trips.up),
        down = R.flatMap((r) => r.trips.down);
      rows.push({
        rate,
        where,
        hold,
        seeds: R.length,
        n: waits.length,
        mean: Number(mean(waits).toFixed(1)),
        seedMeans: R.length <= 4 ? R.map((r) => r.mean) : undefined,
        p95: q(waits, 0.95),
        over1050: waits.filter((x) => x > 1050).length / Math.max(1, waits.length),
        over1158: waits.filter((x) => x > 1158).length / Math.max(1, waits.length),
        worst: top
          ? { v: top.v, at: top.at, asked: top.asked, seed: top.seed.toString(16), open: top.served < 0 }
          : null,
        seedsOver: R.filter((r) => r.worst > 1050).length,
        // The first 1,000 ticks of the run against the rest, by the tick asked.
        split: {
          over1350: [
            long.filter((x: Any) => x.v > 1350 && early(x)).length,
            long.filter((x: Any) => x.v > 1350 && !early(x)).length,
          ],
          over1158: [
            long.filter((x: Any) => x.v > 1158 && early(x)).length,
            long.filter((x: Any) => x.v > 1158 && !early(x)).length,
          ],
          over1050: [long.filter(early).length, long.filter((x: Any) => !early(x)).length],
          worstLate: Math.max(0, ...long.filter((x: Any) => !early(x)).map((x: Any) => x.v)),
        },
        headway,
        standLap: Object.fromEntries(Object.entries(stand).map(([k, v]) => [k, Math.round(v / Math.max(1, laps))])),
        longest: R.reduce((a, r) => (r.longest.ticks > a.ticks ? r.longest : a), { ticks: 0 }),
        tripUp: [Math.round(mean(up)), Math.max(0, ...up)],
        tripDown: [Math.round(mean(down)), Math.max(0, ...down)],
        journey: (() => {
          const js: number[] = R.flatMap((r) => r.journeys ?? []);
          return {
            n: js.length,
            mean: Math.round(mean(js)),
            p95: q(js, 0.95),
            worst: Math.max(0, ...js),
            open: R.reduce((a, r) => a + (r.journeysOpen ?? 0), 0),
          };
        })(),
        plat: (() => {
          const P: Record<string, [number, number, number, number]> = {};
          for (const r of R)
            for (const [k, v] of Object.entries((r.plat ?? {}) as Record<string, [number, number, number, number]>)) {
              const p = (P[k] ??= [0, 0, 0, 0]);
              p[0] += v[0];
              p[1] += v[1];
              p[2] += v[2];
              p[3] = Math.max(p[3], v[3]);
            }
          return Object.fromEntries(
            Object.entries(P).map(([k, p]) => [
              k,
              { n: p[0], mean: Math.round(p[1] / Math.max(1, p[0])), over1050: p[2] / Math.max(1, p[0]), worst: p[3] },
            ]),
          );
        })(),
        startGaps: R[0].startGaps,
        gorgeAt:
          where === 'whole' ? [Math.min(...R.map((r) => r.gorgeAt)), Math.max(...R.map((r) => r.gorgeAt))] : undefined,
      });
    }
const quiet = runs.filter((r) => r.kind === 'quiet');
fs.writeFileSync(
  path.join(OUT, 'sheet.json'),
  JSON.stringify(
    {
      ticks: TICKS,
      seeds: SEEDS,
      hold: process.env.SPACING_HOLD ?? 'default',
      late: process.env.SPACING_HOLD_LATE === '1',
      rows,
      quiet,
      errors,
    },
    null,
    1,
  ),
);
const md: string[] = [];
md.push(
  `Ticks ${TICKS}; seeds ${SEEDS}; hold ${process.env.SPACING_HOLD ?? 'default (200,15)'}${process.env.SPACING_HOLD_LATE === '1' ? ' late' : ''}; errors ${errors.length}`,
  '',
);
md.push(
  '| rate | where | hold | seeds | waits | mean | p95 | >1,050 | >1,158 | worst (halt way, asked, seed) | seeds >1,050 | >1,350 first 1,000 / rest | >1,158 first/rest | >1,050 first/rest | worst after 1,000 | longest stand | trip up mean/worst | down |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
);
for (const r of rows)
  md.push(
    `| ${r.rate} | ${r.where} | ${r.hold} | ${r.seeds} | ${r.n} | ${r.mean}${r.seedMeans ? ` (${r.seedMeans.join('/')})` : ''} | ${r.p95} | ${pct(r.over1050)} | ${pct(r.over1158)} | ${r.worst ? `${r.worst.v} (${r.worst.at}, ${r.worst.asked}, ${r.worst.seed}${r.worst.open ? ', unserved' : ''})` : '-'} | ${r.seedsOver} | ${r.split.over1350.join(' / ')} | ${r.split.over1158.join(' / ')} | ${r.split.over1050.join(' / ')} | ${r.split.worstLate} | ${r.longest.ticks} ${r.longest.at ?? ''} | ${r.tripUp.join('/')} | ${r.tripDown.join('/')} |`,
  );
md.push('', 'Headway mean (CV) by halt and way; stand past the dwell a lap by halt:', '');
for (const r of rows)
  md.push(
    `- ${r.rate} ${r.where} ${r.hold}%: ${Object.entries(r.headway as Record<string, { mean: number; cv: number }>)
      .map(([k, v]) => `${k} ${v.mean} (${v.cv})`)
      .join('; ')} || stand/lap: ${Object.entries(r.standLap)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')}`,
  );
if (quiet.length) {
  md.push(
    '',
    '| nothing asked | hold | laps / non-stop | wagon arrivals | footing changes | kit changes | stone | fares | last hash |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const r of quiet)
    md.push(
      `| ${r.where} | ${r.headPct ?? 75} | ${Math.max(0, ...r.laps)} worst of ${r.laps.length} | ${r.wagon.length} | ${r.footing.length} | ${r.kits.length} | ${r.stone ?? '-'} | ${r.fares ?? '-'} | ${r.hashes.at(-1)} |`,
    );
}
fs.writeFileSync(path.join(OUT, 'sheet.txt'), md.join('\n') + '\n');
console.log(md.join('\n'));
