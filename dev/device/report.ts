// A DeviceResult (./read.ts) as the markdown an agent reads and cites. Pure. It leads with one line to paste, says what
// the numbers are and are not, and never ranks devices or turns a missing figure into a zero.
import { launchHeadlines, launchKind } from '../../src/debug/device/launch.ts';
import { heatDrift, longTasksSupported, readyLine } from '../../src/debug/device/stats.ts';
import { LIMIT_KEYS } from '../../src/debug/device/limits.ts';
import type { Baseline, BenchEntry } from './baseline.ts';
import { browserVersion, differences, gpuName, sameHardware } from './compare.ts';
import type { DeviceResult, Raw, SceneRow } from './read.ts';

const dash = '-';
const fmt = (v: number | null | undefined, d = 1) => (typeof v === 'number' ? v.toFixed(d) : dash);
const cell = (v: unknown) => (v === null || v === undefined || v === '' ? dash : String(v));
const esc = (v: unknown) => cell(v).replace(/\|/g, '/').replace(/\n/g, ' ');

export { browserVersion } from './compare.ts';

/** The line an agent pastes into a report. */
export function pasteLine(r: DeviceResult): string {
  const scored = r.scenes.length;
  const pass = r.scenes.filter((s) => s.verdict === 'pass').length;
  const cut = r.complete ? '' : ' (cut off)';
  return (
    `Tested on a device: ${r.device || 'device'} (${gpuName(r)}), ${browserVersion(r.ua)}, build ${r.build || '?'}, ` +
    `suite ${r.suite || '?'}, ${pass}/${scored} scenes pass${cut}, run ${r.id} (.look/device/${r.id}/report.md)` +
    (r.selfMinted ? ', self-minted' : '')
  );
}

function table(head: string[], rows: string[][]) {
  return [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.map((c) => `| ${c.join(' | ')} |`),
  ];
}

function kv(rows: [string, unknown][]) {
  return table(
    ['field', 'value'],
    rows.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => [k, esc(v)]),
  );
}

function sceneRowCells(s: SceneRow, ltOk: boolean): string[] {
  const stall =
    s.stallN === null
      ? dash
      : `${s.stallN} over 100 ms, longest ${fmt(s.stallMax)}${s.progsNew ? `, +${s.progsNew} programs` : ''}`;
  return [
    s.name,
    s.verdict === 'not-measured' ? 'not measured' : s.verdict,
    cell(s.n),
    fmt(s.renderFps),
    fmt(s.p50),
    fmt(s.p95),
    fmt(s.p99),
    fmt(s.max),
    cell(s.over33),
    cell(s.over50),
    ltOk && s.longTasks !== null ? String(s.longTasks) : 'n/a',
    fmt(s.cpu, 2),
    s.gpu === null ? 'unavailable' : fmt(s.gpu, 2),
    cell(s.calls),
    cell(s.tris),
    `${fmt(s.ratio, 2)} / ${cell(s.rung)}`,
    stall,
  ];
}

export function drift(r: DeviceResult): number | null {
  const first = r.scenes.find((s) => s.name === 'spawn')?.p50 ?? null;
  const last = r.scenes.find((s) => s.name === 'heat')?.p50 ?? null;
  return heatDrift(first, last);
}

const LIMIT_NAMES = Object.entries(LIMIT_KEYS);
function limits(r: DeviceResult) {
  const rows = LIMIT_NAMES.map(([name, key]) => [name, cell(r.alim[key]), cell(r.dlim[key])]);
  return table(['limit', 'adapter', 'device (what three requested)'], rows);
}

/** What a report compares against; any may be missing. `previous` is this device's newest earlier pulled run. */
export type Context = { baseline?: Baseline | null; bench?: BenchEntry[]; previous?: DeviceResult | null };

/** `this / base` as "1.84x"; a dash when either is missing or the base is zero. */
export function ratio(v: number | null, base: number | null): string {
  return v === null || base === null || base <= 0 ? dash : `${(v / base).toFixed(2)}x`;
}
/** `this - base` signed ("+12", "-3", "0"); a dash when either is missing. */
export function diff(v: number | null, base: number | null): string {
  if (v === null || base === null) return dash;
  const d = Math.round(v - base);
  return d > 0 ? `+${d}` : String(d);
}

const same = (a: string, b: string) => a.length >= 7 && b.length >= 7 && (a.startsWith(b) || b.startsWith(a));

const who = (o: DeviceResult) =>
  `run ${o.code}${o.label ? ` (${o.label})` : ''}, ${o.device || 'device'} (${gpuName(o)}), ${browserVersion(o.ua)}, build ${o.build || '?'}`;

/**
 * This run beside another (`name`: "the baseline", "the previous run"). On the same hardware with any condition
 * different (browser version, viewport, DPR, refresh interval, graphics settings, cold or warm) it says the runs are
 * not comparable, lists each difference and prints no frame-time ratios, only counts: a smaller window or a newer
 * browser is not a regression. On other hardware (a phone beside the Mac) the ratios are the point; the differing
 * conditions are listed beside them.
 */
export function comparison(r: DeviceResult, o: DeviceResult, name: string): string[] {
  const out: string[] = [];
  const diffs = differences(r, o);
  const hardware = sameHardware(r, o);
  const frames = !hardware || !diffs.length;
  if (hardware && diffs.length)
    out.push(
      `> **Not comparable with ${name}.** Same hardware, different conditions, so frame times are not compared (a difference here is the setting, not a regression):`,
      ...diffs.map((d) => `> - ${d}`),
      '',
    );
  else if (diffs.length)
    out.push(
      `> Other hardware than ${name}, and also: ${diffs.join('; ')}. Read the ratios as this device against ${name} under these settings.`,
      '',
    );
  if (frames) out.push(`Ratios are this run over ${name} (above 1 is slower).`, '');
  if (o.suite !== r.suite)
    out.push(`> ${name} is suite ${o.suite}, this run is suite ${r.suite}: scenes are matched by name only.`, '');
  if (o.build && r.build && o.build !== r.build)
    out.push(
      `> The builds differ (${r.build} here, ${o.build} in ${name}): a count that moved may be the code, not the device.`,
      '',
    );
  const rungs: string[] = [];
  const rows = r.scenes.map((s) => {
    const m = o.scenes.find((x) => x.name === s.name) ?? null;
    if (m && s.rung !== null && m.rung !== null && s.rung !== m.rung)
      rungs.push(
        `- **${s.name}**: detail rung ${s.rung} on this device, ${m.rung} on ${name}, so calls and triangles differ for that reason, not because of the code.`,
      );
    const timing = frames
      ? [fmt(s.p50), fmt(m?.p50), ratio(s.p50, m?.p50 ?? null), fmt(s.p95), fmt(m?.p95), ratio(s.p95, m?.p95 ?? null)]
      : [];
    return [
      s.name,
      ...timing,
      cell(s.calls),
      cell(m?.calls),
      diff(s.calls, m?.calls ?? null),
      cell(s.tris),
      cell(m?.tris),
      diff(s.tris, m?.tris ?? null),
      `${cell(s.rung)} / ${cell(m?.rung)}`,
      `${fmt(s.ratio, 2)} / ${fmt(m?.ratio, 2)}`,
    ];
  });
  const timingHead = frames ? ['p50 ms', 'base p50', 'x', 'p95 ms', 'base p95', 'x'] : [];
  out.push(
    ...table(
      [
        'scene',
        ...timingHead,
        'calls',
        'base',
        'diff',
        'triangles',
        'base',
        'diff',
        'rung (this / base)',
        'res ratio (this / base)',
      ],
      rows,
    ),
    '',
    ...rungs,
    ...(rungs.length ? [''] : []),
  );
  const missing = r.scenes.filter((s) => !o.scenes.some((x) => x.name === s.name)).map((s) => s.name);
  if (missing.length) out.push(`Not in ${name} (dashes): ${missing.join(', ')}.`, '');
  return out;
}

/** The baseline section: the device's figures beside the Mac's. Scenes the baseline lacks print dashes. */
export function baselineSection(r: DeviceResult, ctx: Context): string[] {
  const b = ctx.baseline;
  if (!b)
    return [
      '## Against the baseline',
      '',
      `No baseline for suite ${r.suite || '?'} yet. On the Mac, open the same link in your own Chrome when it is quiet, pull that run, then \`npm run device -- baseline <code>\`.`,
      '',
    ];
  const base = b.result;
  const line = `${who(base)}, saved ${b.saved.slice(0, 10)}`;
  if (base.id === r.id)
    return ['## Against the baseline', '', `This run is the baseline for suite ${r.suite}: ${line}.`, ''];
  return ['## Against the baseline', '', `Baseline: ${line}.`, '', ...comparison(r, base, 'the baseline')];
}

/** This device's newest earlier run, when there is one and it is not the baseline (already compared above). */
export function previousSection(r: DeviceResult, ctx: Context): string[] {
  const p = ctx.previous;
  if (!p || p.id === r.id || p.id === ctx.baseline?.result.id) return [];
  return [
    "## Against this device's previous run",
    '',
    `Previous: ${who(p)}.`,
    '',
    ...comparison(r, p, 'the previous run'),
  ];
}

/** One line comparing exact draw calls and triangles with the bench's, when its history has this build. Null if not. */
export function benchLine(r: DeviceResult, history: BenchEntry[] = []): string | null {
  const entry = [...history].reverse().find((e) => same(e.base, r.build));
  if (!entry) return null;
  const parts = r.scenes.flatMap((s) => {
    const calls = entry.metrics[`${s.name}.calls`];
    const tris = entry.metrics[`${s.name}.tris`];
    if (calls === undefined || tris === undefined || s.calls === null || s.tris === null) return [];
    return [
      `${s.name} ${calls} calls / ${tris} tris on the Mac, ${s.calls} / ${s.tris} here (${diff(s.calls, calls)} / ${diff(s.tris, tris)})`,
    ];
  });
  if (!parts.length) return null;
  return `Bench counts at this commit (${entry.base.slice(0, 8)}, the Mac's daily perf run of ${entry.date.slice(0, 10)}, \`?dpr=fixed\`): ${parts.join('; ')}. Exact counts match only at the same detail rung.`;
}

/** Whether this run's long task counts mean anything: the browser delivers them and the page said so. */
const longTasksOk = (r: DeviceResult) => longTasksSupported(r.ua) && r.scenes.some((s) => s.longTasks !== null);

/** The headlines of the run's first launch: cold and warm, never a warm number under the cold label. A run that
 * predates the first-load record falls back to the load event, and says it cannot tell cold from warm. */
export function launchLines(r: DeviceResult): string[] {
  if (r.first) return launchHeadlines(r.first);
  const old = typeof r.load.ready === 'number' ? r.load.ready : null;
  return [
    'Cold launch: unknown (this run did not record its first load; the load below is the one measured when Run was tapped)',
    `Warm launch: unknown${old === null ? '' : ` (the load measured when Run was tapped: ${readyHeadline(r)})`}`,
  ];
}

/** Where the launch went: the boot marks in order with the step from the one before, then bytes, the largest files and
 * the shader warm-up. Empty when the run recorded no first load. */
/** The shader warm-up's pass 2 (src/render/precompile.ts): after the loading screen, before the scenes. */
function backgroundShaderRows(r: DeviceResult): string[] {
  const b = r.bg;
  if (!Object.keys(b).length) return [];
  return [
    '### Pipelines built after the loading screen',
    '',
    ...kv([
      ['all built at (ms since the navigation)', b.all_ms ?? 'not finished when Run waited 60 s'],
      ['Run waited for them (ms)', b.wait_ms],
      ['pipelines in all', b.pipelines],
      ['built late, first needed in a frame (pipelines)', b.late],
      ['held out of a frame until compiled (objects)', b.held],
      ['still building when the scenes started', b.building],
      ['built late during the scenes (misses of the warm-up)', r.done?.bg_after],
    ]),
    '',
  ];
}

export function launchBreakdown(r: DeviceResult): string[] {
  const f = r.first;
  if (!f) return [];
  const marks = Object.entries(r.boot)
    .filter(([k, v]) => k.startsWith('m_') && typeof v === 'number')
    .map(([k, v]) => [k.slice(2), v as number] as const)
    .sort((a, b) => a[1] - b[1]);
  const kind = launchKind(f);
  let prev = 0;
  const rows = marks.map(([name, t]) => {
    const row = [name, String(t), `+${t - prev}`];
    prev = t;
    return row;
  });
  const out = [
    `### Launch breakdown (${f.later === true ? 'a later navigation' : kind === 'unknown' ? 'first navigation' : `${kind} launch`})`,
    '',
    ...kv([
      ['service worker controlled the page at the start', f.sw0],
      ['HTML served from a cache', f.html_cached],
      ['navigation type', f.nav],
      ['time to first byte (ms)', f.ttfb],
      ['dns and connect (ms)', f.conn],
      ['HTML parsed (ms)', f.html],
      ['game interactive (ms)', f.ready],
      ['Run usable (ms)', f.usable],
      ['requests', f.req],
      ['transferred KB', f.net_kb],
      ['decoded KB', f.body_kb],
      ['requests served by the service worker', f.sw_req],
      ['shader warm-up (ms)', f.shaders_ms],
      [
        'programs / pipelines',
        f.programs === null || f.programs === undefined ? '' : `${cell(f.programs)} / ${cell(f.pipelines)}`,
      ],
      ['wgsl generation (ms)', f.wgsl_ms],
      ['cold run asked for', f.cold_req === true ? `yes (${cell(f.cold_did)})` : ''],
    ]),
    '',
  ];
  if (rows.length) out.push(...table(['phase', 'at ms', 'step ms'], rows), '');
  if (r.files.length) out.push('Largest files:', '', ...r.files.map((x) => `- ${x}`), '');
  return out;
}

/** "Ready in 2.8 s (warm load)" from the load event (the load measured when Run was tapped). */
export function readyHeadline(r: DeviceResult): string {
  const ms = typeof r.load.ready === 'number' ? r.load.ready : null;
  const warm = typeof r.load.warm === 'boolean' ? r.load.warm : null;
  return readyLine(ms, warm, r.load.cold_req === true);
}

/** The GPU ms line of the limits, by what this run reported. */
export function gpuLimit(r: DeviceResult): string {
  return r.scenes.some((s) => s.gpu !== null)
    ? '- GPU ms came from timestamp queries this browser reported (`gpu timestamps` above); one 5 s sample per scene. A scene whose queries failed says `unavailable`, never a number.'
    : '- GPU ms is `unavailable` in this run: the browser reported no timestamp queries, so frame intervals stand in. `unavailable` is never a number.';
}

/** The long task line of the limits, by what this run reported. */
export function longTaskLimit(r: DeviceResult): string {
  return longTasksOk(r)
    ? '- Long tasks are counted with the `longtask` API (Chromium); frames over 50 ms exist everywhere.'
    : '- Long tasks are `n/a` in this run: this browser does not deliver `longtask` entries (Chromium only), so a zero would mean nothing. Frames over 50 ms exist everywhere.';
}

/** The frame limit the page ran with: the scenes' own record, else the graphics string. Null if unknown. */
export function frameCapOf(r: DeviceResult): number | null {
  const seen = r.scenes.find((s) => s.frameCap !== null)?.frameCap;
  if (seen !== undefined && seen !== null) return seen;
  const m = /frameLimit=(\w+)/.exec(String(r.env.gfx ?? ''));
  if (!m) return null;
  return m[1] === 'display' ? 0 : Number.isFinite(Number(m[1])) ? Number(m[1]) : null;
}

/** What frame limit the page ran at, whether the suite changed it (it never does) and what the frame columns time. */
export function frameLimitLines(r: DeviceResult): string[] {
  const cap = frameCapOf(r);
  if (!cap) return [];
  const rates = r.scenes.flatMap((s) => (s.renderFps === null ? [] : [s.renderFps]));
  const drew = rates.length
    ? `the scenes drew ${fmt(Math.min(...rates), 0)} to ${fmt(Math.max(...rates), 0)} frames a second`
    : 'this run did not record how many frames drew';
  const refresh = typeof r.env.refresh_ms === 'number' ? ` (${r.env.refresh_ms} ms)` : '';
  return [
    `> **Frame limit ${cap}.** The page ran with the device's own frame limit of ${cap} a second; the suite does not change it, so this is what a player on this setting gets. The frame columns time the game loop's callbacks, which keep the display's rate${refresh} when the limit skips renders: ${drew}. Read smoothness from the drawn rate and hitches from p95 and max.`,
    '',
  ];
}

export function report(r: DeviceResult, ctx: Context = {}): string {
  const out: string[] = [
    `# Device run ${r.code}${r.label ? ` (${r.label})` : ''}`,
    '',
    pasteLine(r),
    '',
    ...launchLines(r).map((l) => `**${l}**`),
    '',
  ];
  if (r.selfMinted)
    out.push(
      '> **Self-minted.** This run id was not made by `npm run device -- new` on this Mac (a `?device=new` link, or one made elsewhere). The endpoint is public: these are the numbers the page sent, nothing checked them.',
      '',
    );
  else
    out.push(
      '> The endpoint is public: these are the numbers the page sent. Check the run id above against the one the owner gave.',
      '',
    );
  if (!r.complete)
    out.push(
      '> **Incomplete.** No `dev.done` event: the run was cut off (tab closed, page hidden, network lost). The scenes below are the ones that arrived.',
      '',
    );

  const env = r.env;
  out.push(
    '## Device',
    '',
    ...kv([
      ['class', r.device],
      ['browser', browserVersion(r.ua)],
      ['user agent', r.ua],
      ['gpu', gpuName(r)],
      ['backend', r.gpu.backend],
      ['webgpu adapter', r.gpu.adapter],
      ['canvas format', r.gpu.format],
      ['gpu timestamps', r.gpu.timestamps],
      ['adapter features', r.gpu.features],
      ['screen', env.sw ? `${env.sw}x${env.sh}` : ''],
      ['viewport', env.vw ? `${env.vw}x${env.vh}` : ''],
      ['canvas', env.cw ? `${env.cw}x${env.ch} at dpr ${cell(env.dpr)}` : ''],
      ['refresh interval ms', env.refresh_ms],
      ['device memory GB', env.mem],
      ['cores', env.cores],
      ['touch points', env.touch],
      ['coarse pointer', env.coarse],
      ['connection', env.net],
      ['battery %', env.battery],
      ['charging', env.charging],
      ['detail rung at start', env.rung],
      ['graphics', env.gfx],
    ]),
    '',
    '<details><summary>WebGPU limits</summary>',
    '',
    ...limits(r),
    '',
    '</details>',
    '',
    '## Load',
    '',
    ...kv(loadRows(r.load)),
    '',
    ...backgroundShaderRows(r),
    ...launchBreakdown(r),
    `## Scenes (${r.scenes.length})`,
    '',
    ...frameLimitLines(r),
    ...table(
      [
        'scene',
        'verdict',
        'frames',
        'drawn/s',
        'p50 ms',
        'p95 ms',
        'p99 ms',
        'max ms',
        '>33 ms',
        '>50 ms',
        'long tasks',
        'cpu ms',
        'gpu ms',
        'calls',
        'triangles',
        'res ratio / rung',
        'settle (compile stalls)',
      ],
      r.scenes.map((s) => sceneRowCells(s, longTasksOk(r))),
    ),
    '',
  );
  const bad = r.scenes.filter((s) => s.verdict !== 'pass');
  if (bad.length)
    out.push(
      ...bad.map(
        (s) => `- **${s.name}**: ${s.verdict === 'fail' ? 'fail' : 'not measured'}: ${s.why || 'no reason sent'}`,
      ),
      '',
    );
  const d = drift(r);
  out.push(
    ...baselineSection(r, ctx),
    ...previousSection(r, ctx),
    ...benchBlock(r, ctx),
    '## Heat check',
    '',
    d === null
      ? 'Not available: the first spawn or the heat scene has no p50.'
      : `p50 moved ${d > 0 ? '+' : ''}${d}% from the first spawn to the last (a proxy: the web has no thermal reading). One 5 s sample each; a claim of a regression needs two runs on the same device.`,
    '',
    '## Limits of this report',
    '',
    '- The device kept its own adaptive resolution and detail, as a player gets it, not `?dpr=fixed`: the last column names the resolution ratio and detail rung at the end of each sample, and draw calls and triangles differ from the Mac bench only when the rung does.',
    '- A scene passes when it drew at least 30 frames a second of sample, the page stayed visible and p95 is under two refresh intervals of this device. The Mac bench budgets are not applied. Never ranks devices.',
    '- No thermal reading exists on the web; the heat check is a proxy. Battery is Chromium only.',
    gpuLimit(r),
    '- Timers are coarse (cross-origin isolation headers are not available to a page on the live site): CPU ms are in 0.1 ms steps, 1 ms on Safari. Frame percentiles are unaffected.',
    longTaskLimit(r),
    '- The railway bot cannot run on a device; this suite plays no route and sends no input. No stills: numbers only.',
    '- One 5 s sample per scene on a phone that may be warm, charging or backgrounded varies widely.',
    '',
  );
  return out.join('\n');
}

function benchBlock(r: DeviceResult, ctx: Context): string[] {
  const line = benchLine(r, ctx.bench);
  return line ? [line, ''] : [];
}

function loadRows(l: Raw): [string, unknown][] {
  const marks = Object.entries(l)
    .filter(([k]) => k.startsWith('m_'))
    .map(([k, v]): [string, unknown] => [`mark ${k.slice(2)} (ms)`, v]);
  return [
    ['warm load (service worker controlled the page)', l.warm],
    ['navigation', l.nav],
    ['requests', l.req],
    ['transferred KB', l.net_kb],
    ['decoded KB', l.body_kb],
    ['requests served by the service worker', l.sw_req],
    ['largest file', l.big ? `${l.big} (${cell(l.big_kb)} KB)` : ''],
    ...marks,
  ];
}
