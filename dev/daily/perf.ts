// The daily perf job's reading of a benchmark (dev/look/bench.ts): flat metrics, the day-over-day comparison and the
// issue comment. dev/daily/run.ts owns delivery (worktree, lock, history file, GitHub).
//
// History: one JSON line per valid run in ~/.boogle/daily/perf/history.jsonl ({ date, base, dir, metrics }). The
// baseline for a metric is the median of the last BASELINE_RUNS valid runs, so one noisy night neither flags nor hides a
// regression. A metric is flagged when it rises past both its relative and its absolute threshold.

/** Tunable policy, not engine limits. Times are the owner's M1 Max at DPR 2; mobile scales down from them. */
export const PERF_POLICY = {
  baselineRuns: 3,
  /** Rise needed to flag: [relative, absolute]. */
  thresholds: {
    calls: [0.1, 10],
    tris: [0.15, 50_000],
    shadowCalls: [0.15, 5],
    programs: [0.08, 8],
    materials: [0.15, 10],
    gpuMB: [0.1, 16],
    cpuMs: [0.15, 0.4],
    gpuMs: [0.15, 0.5],
    subsystemMs: [0.25, 0.3],
    heapMB: [0.15, 24],
    allocKBPerFrame: [0.3, 200],
    interactiveMs: [0.2, 600],
    loadMB: [0.1, 0.5],
    bundleGzipMB: [0.05, 0.15],
  } as Record<string, [number, number]>,
  /** Absolute budgets: asset-pipeline.md (owner, 6 November) and one 120 Hz frame on the Mac. */
  budget: { firstLoadMB: 25, totalMB: 100, assetMB: 4, frameMs: 8.33 },
};

type Stat = { avg: number; p95: number; max: number; n: number } | null;
type Pose = {
  calls: number;
  tris: number;
  shadowCalls: number;
  programs: number;
  gpuMB: number | null;
  scene: { materials: number; casters: number; meshes: number };
  status: string;
  frames: number;
  cpu: Stat;
  gpu: Stat;
  heapMB: number;
  allocKBPerFrame: number | null;
  subsystems: Record<string, number>;
};
export type Bench = {
  commit: string | null;
  seconds: number;
  poses: Record<string, Pose | unknown>;
  bundle?: { totalGzipMB: number; firstLoadGzipMB: number; largest: { file: string; mb: number } };
  assets?: { firstMB: number; totalMB: number; overAssetBudget: string[]; flags: string[] } | { error: string } | null;
  load?: { interactiveMs: number; firstLoadMB: number; after20sMB: number; largestFetchMB: number };
};
export type Entry = { date: string; base: string; dir: string; metrics: Record<string, number> };

const isPose = (v: unknown): v is Pose => !!v && typeof v === 'object' && 'calls' in v && 'subsystems' in v;
const key = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

/** Metric name -> value, and which threshold applies to it. */
export function metrics(b: Bench) {
  const m: Record<string, number> = {};
  const kind: Record<string, string> = {};
  const put = (name: string, value: number | null | undefined, k: string) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    m[name] = value;
    kind[name] = k;
  };
  for (const [pose, p] of Object.entries(b.poses)) {
    if (!isPose(p)) continue;
    put(`${pose}.calls`, p.calls, 'calls');
    put(`${pose}.tris`, p.tris, 'tris');
    put(`${pose}.shadowCalls`, p.shadowCalls, 'shadowCalls');
    put(`${pose}.programs`, p.programs, 'programs');
    put(`${pose}.materials`, p.scene?.materials, 'materials');
    put(`${pose}.gpuMB`, p.gpuMB, 'gpuMB');
    put(`${pose}.cpuMs`, p.cpu?.avg, 'cpuMs');
    put(`${pose}.gpuMs`, p.gpu?.avg, 'gpuMs');
    put(`${pose}.heapMB`, p.heapMB, 'heapMB');
    put(`${pose}.allocKBPerFrame`, p.allocKBPerFrame, 'allocKBPerFrame');
    for (const [s, ms] of Object.entries(p.subsystems ?? {}))
      if (s !== 'frame') put(`${pose}.cpu.${key(s)}Ms`, ms, 'subsystemMs');
  }
  put('load.interactiveMs', b.load?.interactiveMs, 'interactiveMs');
  put('load.firstLoadMB', b.load?.firstLoadMB, 'loadMB');
  put('load.after20sMB', b.load?.after20sMB, 'loadMB');
  put('bundle.totalGzipMB', b.bundle?.totalGzipMB, 'bundleGzipMB');
  put('bundle.firstLoadGzipMB', b.bundle?.firstLoadGzipMB, 'bundleGzipMB');
  return { m, kind };
}

/** Why a run can't be compared: a page that wasn't drawing, too few frames, missing GPU times. */
export function invalid(b: Bench): string[] {
  const problems: string[] = [];
  for (const [pose, p] of Object.entries(b.poses)) {
    if (pose === 'errors' || pose === 'playDust') continue;
    if (!isPose(p)) problems.push(`${pose}: no sample`);
    else if (p.status !== 'complete') problems.push(`${pose}: ${p.status}`);
    else if (p.frames < b.seconds * 30) problems.push(`${pose}: only ${p.frames} frames in ${b.seconds} s`);
    else if (!p.gpu) problems.push(`${pose}: no GPU timestamps`);
  }
  return problems;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};

export type Change = { name: string; before: number; now: number; rise: number };
export function compare(b: Bench, history: Entry[]) {
  const { m, kind } = metrics(b);
  const recent = history.slice(-PERF_POLICY.baselineRuns);
  const regressions: Change[] = [];
  const improvements: Change[] = [];
  for (const [name, now] of Object.entries(m)) {
    const past = recent.map((e) => e.metrics[name]).filter((v): v is number => typeof v === 'number');
    if (!past.length) continue;
    const before = median(past);
    const [rel, abs] = PERF_POLICY.thresholds[kind[name]!]!;
    const rise = now - before;
    const change = { name, before, now, rise };
    if (rise > abs && rise > rel * Math.abs(before)) regressions.push(change);
    else if (-rise > abs && -rise > rel * Math.abs(before)) improvements.push(change);
  }
  const { budget } = PERF_POLICY;
  const over: string[] = [];
  const assets = b.assets && 'firstMB' in b.assets ? b.assets : null;
  if (assets && assets.firstMB > budget.firstLoadMB)
    over.push(`asset first load ${assets.firstMB} MB > ${budget.firstLoadMB} MB`);
  if (assets && assets.totalMB > budget.totalMB) over.push(`assets in all ${assets.totalMB} MB > ${budget.totalMB} MB`);
  for (const a of assets?.overAssetBudget ?? []) over.push(`asset over ${budget.assetMB} MB: ${a}`);
  if (b.load && b.load.firstLoadMB > budget.firstLoadMB)
    over.push(`first load fetched ${b.load.firstLoadMB} MB > ${budget.firstLoadMB} MB`);
  if (b.load && b.load.after20sMB > budget.totalMB)
    over.push(`fetched by 20 s ${b.load.after20sMB} MB > ${budget.totalMB} MB`);
  if (b.load && b.load.largestFetchMB > budget.assetMB)
    over.push(`largest fetch ${b.load.largestFetchMB} MB > ${budget.assetMB} MB`);
  for (const [pose, p] of Object.entries(b.poses)) {
    if (!isPose(p)) continue;
    if ((p.cpu?.avg ?? 0) > budget.frameMs) over.push(`${pose}: CPU ${p.cpu!.avg} ms/frame > ${budget.frameMs}`);
    if ((p.gpu?.avg ?? 0) > budget.frameMs) over.push(`${pose}: GPU ${p.gpu!.avg} ms/frame > ${budget.frameMs}`);
  }
  return { metrics: m, regressions, improvements, over, baselineRuns: recent.length, baselineFrom: recent[0]?.base };
}

const fmt = (v: number) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en') : String(+v.toFixed(2)));
const change = (c: Change) =>
  `${fmt(c.before)} → ${fmt(c.now)} (${c.rise > 0 ? '+' : ''}${fmt(c.rise)}, ${c.before ? `${c.rise > 0 ? '+' : ''}${Math.round((c.rise / Math.abs(c.before)) * 100)}%` : 'new'})`;
/** One line per metric: the same rise at several poses is one cause, shown at its largest. */
function lines(changes: Change[]) {
  const by = new Map<string, Change[]>();
  for (const c of changes) {
    const dot = c.name.indexOf('.');
    const metric = c.name.startsWith('load.') || c.name.startsWith('bundle.') ? c.name : c.name.slice(dot + 1);
    by.set(metric, [...(by.get(metric) ?? []), c]);
  }
  return [...by].map(([metric, cs]) => {
    const worst = cs.reduce((a, c) =>
      Math.abs(c.rise / (c.before || 1)) > Math.abs(a.rise / (a.before || 1)) ? c : a,
    );
    const where =
      cs.length > 1
        ? ` at ${cs.map((c) => c.name.split('.')[0]).join(', ')}; largest at ${worst.name.split('.')[0]}`
        : '';
    return `- \`${cs.length > 1 ? metric : worst.name}\`${where}: ${change(worst)}`;
  });
}

export function report(
  b: Bench,
  result: ReturnType<typeof compare>,
  { base, range, dir, problems }: { base: string; range: string; dir: string; problems: string[] },
) {
  const rows = Object.entries(b.poses)
    .filter((e): e is [string, Pose] => isPose(e[1]))
    .map(([pose, p]) => {
      const s = p.subsystems;
      return `| ${pose} | ${p.calls} | ${(p.tris / 1e6).toFixed(2)} M | ${p.shadowCalls} | ${p.programs} | ${p.scene.materials} | ${p.cpu?.avg ?? '-'} | ${p.gpu?.avg ?? '-'} | ${s.render ?? '-'} / ${s.physics ?? '-'} / ${s['room clock + replication'] ?? '-'} / ${s['view updates'] ?? '-'} | ${p.heapMB} | ${p.allocKBPerFrame ?? '-'} |`;
    });
  const verdict = problems.length
    ? `**Not comparable** (${problems.join('; ')}); kept out of the baseline.`
    : result.regressions.length
      ? `**${result.regressions.length} regression${result.regressions.length > 1 ? 's' : ''}** against the median of the last ${result.baselineRuns} run${result.baselineRuns > 1 ? 's' : ''}.`
      : result.baselineRuns
        ? `No regressions against the median of the last ${result.baselineRuns} run${result.baselineRuns > 1 ? 's' : ''}.`
        : 'First run: this is the baseline.';
  return [
    `Daily benchmark of ${base.slice(0, 8)} (dev/look/bench.ts, M1 Max, 1280x800 at DPR 2, ${b.seconds} s real frames per pose). ${verdict}`,
    '',
    ...(result.regressions.length ? ['**Regressions**', ...lines(result.regressions), ''] : []),
    ...(result.over.length ? ['**Over budget**', ...result.over.map((o) => `- ${o}`), ''] : []),
    ...(result.improvements.length ? ['**Improvements**', ...lines(result.improvements), ''] : []),
    ...(range
      ? ['<details><summary>Commits since the baseline</summary>', '', '```', range, '```', '</details>', '']
      : []),
    '| pose | calls | tris | shadow | programs | materials | CPU ms | GPU ms | render / physics / room clock / view ms | heap MB | alloc KB/frame |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    b.load
      ? `First load (vite preview, local): ${b.load.firstLoadMB} MB fetched, "Jump in" at ${b.load.interactiveMs} ms, ${b.load.after20sMB} MB by 20 s.`
      : '',
    b.bundle
      ? `Bundle: ${b.bundle.totalGzipMB} MB gzip in all, first-load list ${b.bundle.firstLoadGzipMB} MB gzip; largest file ${b.bundle.largest.file} ${b.bundle.largest.mb} MB.`
      : '',
    '',
    `Mac run: ${dir} (bench.json holds every number; history in ~/.boogle/daily/perf/history.jsonl).`,
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');
}
