// Train-spacing harness, the sweep (docs/plans/train-spacing.md, section 3): runs test/spacing/run.ts over the
// stages, holds, ask rates and seeds in at most SPACING_WORKERS processes, pools the waits by stage, and writes the
// section 3 columns as a markdown table (sheet.txt) and JSON (sheet.json) under SPACING_OUT, with every run's raw line
// (runs.jsonl). Scratch measurement only: nothing in a suite runs it. Settings, all by environment:
//
//   SPACING_OUT      output directory (required)
//   SPACING_STAGES   q6-stocked,crossing-done,deck-laid,gap-footed,ring-joined
//   SPACING_HOLDS    75,0
//   SPACING_RATES    heavy,light   (heavy: main's 5% of ticks; light: main's FUZZ_LIGHT, SPACING_LIGHT_MIN + [0, SPACING_LIGHT_SPAN))
//   SPACING_TICKS    20000
//   SPACING_SEEDS    1000-102f     (hex, inclusive: the 48 of the 12 November baseline)
//   SPACING_WORKERS  4
//   SPACING_QUIET    12000         nothing-asked ticks a stage (0: skip); also trains-on, fares-running, wagon-on
//   SPACING_SEED_STAGES  1          also build all 40 seed stages and print their ticks and hashes
//   SPACING_FROM     runs.jsonl     re-aggregate an earlier sweep's raw lines instead of running
//
//   SPACING_OUT=/tmp/x node test/spacing/sweep.ts
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const env = (k: string, own: string) => process.env[k] || own;
const OUT = process.env.SPACING_OUT;
if (!OUT) throw new Error('SPACING_OUT: an output directory');
const STAGES = env('SPACING_STAGES', 'q6-stocked,crossing-done,deck-laid,gap-footed,ring-joined').split(',');
const HOLDS = env('SPACING_HOLDS', '75,0').split(',').map(Number);
const RATES = env('SPACING_RATES', 'heavy,light').split(',');
const TICKS = Number(env('SPACING_TICKS', '20000'));
const [S0, S1] = env('SPACING_SEEDS', '1000-102f')
  .split('-')
  .map((h) => Number.parseInt(h, 16)) as [number, number];
const WORKERS = Math.min(4, Number(env('SPACING_WORKERS', '4')));
const QUIET = Number(env('SPACING_QUIET', '12000'));
const QUIET_STAGES = [
  'trains-on',
  'fares-running',
  'q6-stocked',
  'wagon-on',
  'crossing-done',
  'deck-laid',
  'gap-footed',
  'ring-joined',
];
fs.mkdirSync(OUT, { recursive: true });

type Job = string[];
const jobs: Job[] = [];
const CHUNK = 8;
for (const rate of RATES)
  for (const stage of STAGES)
    for (const hold of HOLDS)
      for (let s = S0; s <= S1; s += CHUNK)
        jobs.push([
          'fuzz',
          stage,
          String(hold),
          String(TICKS),
          rate,
          s.toString(16),
          Math.min(S1, s + CHUNK - 1).toString(16),
        ]);
if (QUIET > 0) for (const stage of QUIET_STAGES) jobs.push(['quiet', stage, String(QUIET), S0.toString(16)]);
if (process.env.SPACING_SEED_STAGES === '1') jobs.push(['stages']);

const lines: string[] = [];
const runOne = (args: Job) =>
  new Promise<void>((done) => {
    const p = spawn(process.execPath, ['--import', './test/helpers/rail-no-audit.ts', 'test/spacing/run.ts', ...args], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
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
// SPACING_FROM=<runs.jsonl>: re-aggregate an earlier sweep's runs, running nothing.
if (process.env.SPACING_FROM)
  lines.push(...fs.readFileSync(process.env.SPACING_FROM, 'utf8').split('\n').filter((l) => l.trim()));
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

const pct = (x: number) => `${(100 * x).toFixed(3)}%`;
const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]! : 0;
};
const rows: Any[] = [];
for (const rate of RATES)
  for (const stage of STAGES)
    for (const hold of HOLDS) {
      const R = runs.filter(
        (r) => r.kind === 'fuzz' && r.stage === stage && r.headPct === hold && r.light === (rate === 'light'),
      );
      if (!R.length) continue;
      // The brief's pooling (12 November): every line-2 lever wait served, plus each ask still waiting at the end at
      // its wait so far. `served` and `servedMean` are the served waits alone (the committed test's diagnostic).
      const served: number[] = R.flatMap((r) => r.waits);
      const waits: number[] = R.flatMap((r) => [...r.waits, ...(r.unserved ?? [])]);
      const worst = R.reduce((a, r) => (r.worst.ticks > a.worst.ticks ? r : a));
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
      const stand0 = R.reduce((a, r) => a + (r.endStand['0'] ?? 0), 0),
        stand1 = R.reduce((a, r) => a + (r.endStand['1'] ?? 0), 0);
      const passed = R.flatMap((r) => r.passed as { extra: number; total: number }[]);
      const asks = R.reduce((a, r) => a + r.asks, 0);
      const minutes = (R.length * TICKS) / 600;
      rows.push({
        rate,
        stage,
        hold,
        seeds: R.length,
        served: served.length,
        waits: waits.length,
        servedMean: Math.round(served.reduce((a, b) => a + b, 0) / Math.max(1, served.length)),
        mean: Number((waits.reduce((a, b) => a + b, 0) / Math.max(1, waits.length)).toFixed(1)),
        p95: q(waits, 0.95),
        over1050: waits.filter((x) => x > 1050).length / Math.max(1, waits.length),
        over1158: waits.filter((x) => x > 1158).length / Math.max(1, waits.length),
        worst: { ...worst.worst, seed: worst.seed.toString(16) },
        seedsOver: R.filter((r) => r.worst.ticks > 1050).length,
        headway,
        holdLap: { village: Math.round(stand0 / Math.max(1, laps)), far: Math.round(stand1 / Math.max(1, laps)) },
        longest: R.reduce((a, r) => (r.longest.ticks > a.ticks ? r.longest : a), { ticks: 0 }),
        asksMin: Number((R.reduce((a, r) => a + r.acceptedAll, 0) / minutes).toFixed(1)),
        line2AsksMin: Number((R.reduce((a, r) => a + r.accepted, 0) / minutes).toFixed(1)),
        asks,
        passed: passed.length,
        passedShare: passed.length / Math.max(1, asks),
        extraMean: passed.length ? Math.round(passed.reduce((a, p) => a + p.extra, 0) / passed.length) : 0,
        extraWorst: Math.max(0, ...passed.map((p) => p.extra)),
        passedTotalWorst: Math.max(0, ...passed.map((p) => p.total)),
        tooClose: R.reduce((a, r) => a + r.tooClose, 0),
        twoPast: R.reduce((a, r) => a + r.twoPast, 0),
        lampForward: R.reduce((a, r) => a + r.lampForward, 0),
        lampOut: R.reduce((a, r) => a + r.lampOut, 0),
        // The other lines' waits (line 1 on these stages) by halt and way, and pooled: served plus still waiting.
        others: (() => {
          const P: Record<string, [number, number, number, number]> = {};
          for (const r of R)
            for (const [k, v] of Object.entries((r.others ?? {}) as Record<string, [number, number, number, number]>)) {
              const p = (P[k] ??= [0, 0, 0, 0]);
              p[0] += v[0];
              p[1] += v[1];
              p[2] += v[2];
              p[3] = Math.max(p[3], v[3]);
            }
          const all = Object.values(P).reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2], Math.max(a[3], p[3])], [0, 0, 0, 0]);
          return {
            pooled: { n: all[0], mean: Number((all[1] / Math.max(1, all[0])).toFixed(1)), over1050: all[2] / Math.max(1, all[0]), worst: all[3] },
            by: Object.fromEntries(Object.entries(P).map(([k, p]) => [k, { n: p[0], mean: Number((p[1] / Math.max(1, p[0])).toFixed(1)), over1050: p[2] / Math.max(1, p[0]), worst: p[3] }])),
          };
        })(),
      });
    }
const quiet = runs
  .filter((r) => r.kind === 'quiet')
  .map((r) => ({
    stage: r.stage,
    rideMean: Number((r.ride.reduce((a: number, b: number) => a + b, 0) / Math.max(1, r.ride.length)).toFixed(3)),
    rideWorst: Number(Math.max(0, ...r.ride).toFixed(3)),
    lapMean: Number((r.lap.reduce((a: number, b: number) => a + b, 0) / Math.max(1, r.lap.length)).toFixed(3)),
    lapWorst: Number(Math.max(0, ...r.lap).toFixed(3)),
    wagon: r.wagon,
    footing: r.footing,
    stone: r.stone,
    fares: r.fares,
    hashes: r.hashes,
  }));
const seedStages = runs.find((r) => r.kind === 'stages')?.stages ?? null;
fs.writeFileSync(
  path.join(OUT, 'sheet.json'),
  JSON.stringify({ ticks: TICKS, seeds: [S0, S1], rows, quiet, seedStages, errors }, null, 1),
);

const md: string[] = [];
md.push(`Ticks ${TICKS}; seeds ${S0.toString(16)}-${S1.toString(16)}; errors ${errors.length}`, '');
md.push(
  '| rate | stage | hold | seeds | served (+unserved) | mean (served only) | p95 | >1,050 | >1,158 | worst (halt way, tick, seed) | seeds >1,050 | asks/min (line 2) | hold a lap V/far | longest stand | passed (share) | extra mean/worst | passed total worst | too close | two past | lamp fwd | lamp out |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
);
for (const r of rows)
  md.push(
    `| ${r.rate} | ${r.stage} | ${r.hold} | ${r.seeds} | ${r.served} (+${r.waits - r.served}) | ${r.mean} (${r.servedMean}) | ${r.p95} | ${pct(r.over1050)} | ${pct(r.over1158)} | ${r.worst.ticks} (${r.worst.at}, ${r.worst.tick}, ${r.worst.seed}${r.worst.open ? ', unserved' : ''}) | ${r.seedsOver} | ${r.asksMin} (${r.line2AsksMin}) | ${r.holdLap.village}/${r.holdLap.far} | ${r.longest.ticks} | ${r.passed} (${pct(r.passedShare)}) | ${r.extraMean}/${r.extraWorst} | ${r.passedTotalWorst} | ${r.tooClose} | ${r.twoPast} | ${r.lampForward} | ${r.lampOut} |`,
  );
md.push('', 'Headway mean (CV) by halt and way:', '');
for (const r of rows)
  md.push(
    `- ${r.rate} ${r.stage} ${r.hold}%: ${Object.entries(r.headway as Record<string, { mean: number; cv: number }>)
      .map(([k, v]) => `${k} ${v.mean} (${v.cv})`)
      .join('; ')}`,
  );
if (quiet.length) {
  md.push(
    '',
    '| nothing asked | ride/non-stop mean | worst | lap/non-stop mean | worst | wagon arrivals | footing changes | stone | fares |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const r of quiet)
    md.push(
      `| ${r.stage} | ${r.rideMean} | ${r.rideWorst} | ${r.lapMean} | ${r.lapWorst} | ${r.wagon.length} | ${r.footing.length} | ${r.stone} | ${r.fares} |`,
    );
}
md.push('', 'Other lines (line 1) by halt and way: mean, share over 1,050, worst (n):', '');
for (const r of rows)
  if (r.others?.pooled.n)
    md.push(
      `- ${r.rate} ${r.stage} ${r.hold}%: pooled ${r.others.pooled.mean}, ${pct(r.others.pooled.over1050)}, ${r.others.pooled.worst} (${r.others.pooled.n}) || ${Object.entries(r.others.by as Record<string, Any>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k} ${v.mean}, ${pct(v.over1050)}, ${v.worst} (${v.n})`)
        .join('; ')}`,
    );
fs.writeFileSync(path.join(OUT, 'sheet.txt'), md.join('\n') + '\n');
console.log(md.join('\n'));
