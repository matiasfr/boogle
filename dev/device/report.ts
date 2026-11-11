// A DeviceResult (./read.ts) as the markdown an agent reads and cites. Pure. It leads with one line to paste, says what
// the numbers are and are not, and never ranks devices or turns a missing figure into a zero.
import { heatDrift } from '../../src/debug/device/stats.ts';
import { LIMIT_KEYS } from '../../src/debug/device/limits.ts';
import type { DeviceResult, Raw, SceneRow } from './read.ts';

const dash = '-';
const fmt = (v: number | null | undefined, d = 1) => (typeof v === 'number' ? v.toFixed(d) : dash);
const cell = (v: unknown) => (v === null || v === undefined || v === '' ? dash : String(v));
const esc = (v: unknown) => cell(v).replace(/\|/g, '/').replace(/\n/g, ' ');

/** "Safari 26", "Chrome 142", "Firefox 140" from a user agent; the browser's name alone when no version shows. */
export function browserVersion(ua: string, fallback = 'browser'): string {
  const pick = (re: RegExp, name: string) => {
    const m = re.exec(ua);
    return m ? `${name} ${m[1]!.split('.')[0]}` : null;
  };
  return (
    pick(/Edg\/([\d.]+)/, 'Edge') ??
    pick(/(?:CriOS|Chrome)\/([\d.]+)/, 'Chrome') ??
    pick(/(?:FxiOS|Firefox)\/([\d.]+)/, 'Firefox') ??
    (/Safari\//.test(ua) ? pick(/Version\/([\d.]+)/, 'Safari') : null) ??
    fallback
  );
}

const gpuName = (r: DeviceResult) =>
  [r.gpu.desc, [r.gpu.vendor, r.gpu.arch].filter(Boolean).join(' ')].find((s) => typeof s === 'string' && s) ||
  'GPU unknown';

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

function sceneRowCells(s: SceneRow): string[] {
  const stall =
    s.stallN === null
      ? dash
      : `${s.stallN} over 100 ms, longest ${fmt(s.stallMax)}${s.progsNew ? `, +${s.progsNew} programs` : ''}`;
  return [
    s.name,
    s.verdict === 'not-measured' ? 'not measured' : s.verdict,
    cell(s.n),
    fmt(s.p50),
    fmt(s.p95),
    fmt(s.p99),
    fmt(s.max),
    cell(s.over33),
    cell(s.over50),
    s.longTasks === null ? 'n/a' : String(s.longTasks),
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

export function report(r: DeviceResult): string {
  const out: string[] = [`# Device run ${r.code}${r.label ? ` (${r.label})` : ''}`, '', pasteLine(r), ''];
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
    `## Scenes (${r.scenes.length})`,
    '',
    ...table(
      [
        'scene',
        'verdict',
        'frames',
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
      r.scenes.map(sceneRowCells),
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
    '- GPU ms is missing on Safari and iOS (no timestamp queries there today); frame intervals stand in. `unavailable` is never a number.',
    '- Timers are coarse (cross-origin isolation headers are not available to a page on the live site): CPU ms are in 0.1 ms steps, 1 ms on Safari. Frame percentiles are unaffected.',
    '- Long tasks are Chromium only (`n/a` elsewhere); frames over 50 ms exist everywhere.',
    '- The railway bot cannot run on a device; this suite plays no route and sends no input. No stills: numbers only.',
    '- One 5 s sample per scene on a phone that may be warm, charging or backgrounded varies widely.',
    '',
  );
  return out.join('\n');
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
