// Whether two device runs can be compared frame for frame. Pure. On 10 November two runs on the same MacBook were read
// as a frame-cost regression when Safari 27.0 had become 27.2, the window had shrunk from 1489x974 to 1128x730 and the
// refresh interval had gone from 17 to 21 ms: the report now names every condition that differs and, on the same
// hardware, prints no frame-time ratios at all while any does.
import { launchKind } from '../../src/debug/device/launch.ts';
import type { DeviceResult } from './read.ts';

/** "Safari 27.2", "Chrome 142.0", "Firefox 140.0.1" from a user agent: major and minor always, later parts only when
 * they are not zero (Chrome's reduced agent sends 142.0.0.0). The browser's name alone when no version shows. */
export function browserVersion(ua: string, fallback = 'browser'): string {
  const pick = (re: RegExp, name: string) => {
    const m = re.exec(ua);
    if (!m) return null;
    const parts = m[1]!.split('.');
    while (parts.length > 2 && parts.at(-1) === '0') parts.pop();
    if (parts.length === 1) parts.push('0');
    return `${name} ${parts.join('.')}`;
  };
  return (
    pick(/Edg\/([\d.]+)/, 'Edge') ??
    pick(/(?:CriOS|Chrome)\/([\d.]+)/, 'Chrome') ??
    pick(/(?:FxiOS|Firefox)\/([\d.]+)/, 'Firefox') ??
    (/Safari\//.test(ua) ? pick(/Version\/([\d.]+)/, 'Safari') : null) ??
    fallback
  );
}

export const gpuName = (r: DeviceResult): string =>
  String(
    [r.gpu.desc, [r.gpu.vendor, r.gpu.arch].filter(Boolean).join(' ')].find((s) => typeof s === 'string' && s) ||
      'GPU unknown',
  );

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Cold, warm or unknown: the first navigation's record, else the load event's service-worker flag. */
export function launchOf(r: DeviceResult): 'cold' | 'warm' | 'unknown' {
  if (r.first) return r.first.later === true ? 'unknown' : launchKind(r.first);
  return r.load.warm === true ? 'warm' : r.load.warm === false ? 'cold' : 'unknown';
}

/** The conditions a frame time depends on besides the code, as printed. Null where the run did not say. */
export function conditions(r: DeviceResult) {
  const e = r.env;
  const vw = num(e.vw);
  const vh = num(e.vh);
  const launch = launchOf(r);
  return {
    browser: r.ua ? browserVersion(r.ua) : null,
    viewport: vw !== null && vh !== null ? `${vw}x${vh}` : null,
    dpr: num(e.dpr),
    refresh: num(e.refresh_ms),
    graphics: typeof e.gfx === 'string' && e.gfx ? e.gfx : null,
    launch: launch === 'unknown' ? null : launch,
  };
}

/** Refresh intervals within 10% are the same display rate (a measured 16.7 against 17.1); 17 against 21 is not. */
const sameRefresh = (a: number, b: number) => Math.abs(a - b) <= 0.1 * Math.min(a, b);

/** Each condition that differs between `a` (this run) and `b` (the one compared with), as "browser Safari 27.2 here,
 * Safari 27.0 there". A condition one run did not record is not counted as a difference. */
export function differences(a: DeviceResult, b: DeviceResult): string[] {
  const x = conditions(a);
  const y = conditions(b);
  const out: string[] = [];
  const add = (name: string, here: unknown, there: unknown) => out.push(`${name} ${here} here, ${there} there`);
  if (x.browser && y.browser && x.browser !== y.browser) add('browser', x.browser, y.browser);
  if (x.viewport && y.viewport && x.viewport !== y.viewport) add('viewport', x.viewport, y.viewport);
  if (x.dpr !== null && y.dpr !== null && x.dpr !== y.dpr) add('DPR', x.dpr, y.dpr);
  if (x.refresh !== null && y.refresh !== null && !sameRefresh(x.refresh, y.refresh))
    add('refresh interval', `${x.refresh} ms`, `${y.refresh} ms`);
  if (x.graphics && y.graphics && x.graphics !== y.graphics) add('graphics settings', x.graphics, y.graphics);
  if (x.launch && y.launch && x.launch !== y.launch) add('launch', x.launch, y.launch);
  return out;
}

/** The same machine as far as a run can tell: device class, GPU and core count (when both sent one). */
export function sameHardware(a: DeviceResult, b: DeviceResult): boolean {
  const ca = num(a.env.cores);
  const cb = num(b.env.cores);
  return a.device === b.device && gpuName(a) === gpuName(b) && (ca === null || cb === null || ca === cb);
}

/** A pulled run on disk, with when it was pulled (ms), for `previousRun`. */
export type Pulled = { result: DeviceResult; at: number };

/** The newest earlier run of the same suite on the same hardware (and the same label, when this run has one), or
 * null. `at` is this run's own pull time: only runs pulled before it count. */
export function previousRun(r: DeviceResult, at: number, pulled: readonly Pulled[]): DeviceResult | null {
  let best: Pulled | null = null;
  for (const p of pulled) {
    const o = p.result;
    if (o.id === r.id || o.suite !== r.suite || p.at >= at || !o.scenes.length) continue;
    if (r.label && o.label !== r.label) continue;
    if (!sameHardware(r, o)) continue;
    if (!best || p.at > best.at) best = p;
  }
  return best?.result ?? null;
}
