// What this device is and how the game loaded on it, as flat playdata fields (./wire.ts). No name, no storage, nothing
// typed: only what the browser says about itself. Local, debug only.
import { renderer, rendererReady, gfx } from '../../render/scene.ts';
import { bootTimeline } from '../../boot/timeline.ts';
import { autoRung, graphicsSnapshot } from '../../graphics-settings.ts';
import { LIMIT_KEYS, LIMITS } from './limits.ts';
import { browserName, deviceClass, fit, type Fields } from './wire.ts';
import { controlledAtStart } from './first-load.ts';

type Limits = Record<string, number | undefined>;
type Adapter = {
  info?: { vendor?: string; architecture?: string; device?: string; description?: string };
  features: Set<string>;
  limits: Limits;
};
type Gpu = {
  requestAdapter(o?: { powerPreference?: string }): Promise<Adapter | null>;
  getPreferredCanvasFormat(): string;
};
type Nav = Navigator & {
  gpu?: Gpu;
  deviceMemory?: number;
  connection?: { effectiveType?: string };
  getBattery?: () => Promise<{ level: number; charging: boolean }>;
};

const round1 = (v: number) => Math.round(v * 10) / 10;

export function deviceFields(): Fields {
  const nav = navigator as Nav;
  const coarse = matchMedia('(pointer: coarse)').matches;
  return {
    device: deviceClass(nav.maxTouchPoints, coarse, Math.min(screen.width, screen.height)),
    browser: browserName(nav.userAgent),
    ua: fit(nav.userAgent),
  };
}

/** `dev.diag.gpu`, `dev.diag.alim`, `dev.diag.dlim`: the adapter, the backend three got, the limits. */
export async function gpuDiagnostics(): Promise<{ k: string; f: Fields }[]> {
  const nav = navigator as Nav;
  await rendererReady.catch(() => {});
  const adapter = nav.gpu
    ? await nav.gpu.requestAdapter({ powerPreference: 'high-performance' }).catch(() => null)
    : null;
  const backend = renderer.backend as unknown as { device?: { limits: Limits }; trackTimestamp?: boolean };
  const info = adapter?.info;
  const out: { k: string; f: Fields }[] = [
    {
      k: 'dev.diag.gpu',
      f: {
        backend: gfx() ?? 'none',
        webgpu: !!nav.gpu,
        adapter: adapter ? 'ok' : nav.gpu ? 'null' : 'missing',
        vendor: fit(info?.vendor ?? ''),
        arch: fit(info?.architecture ?? ''),
        gpu: fit(info?.device ?? ''),
        desc: fit(info?.description ?? ''),
        format: nav.gpu?.getPreferredCanvasFormat() ?? '',
        timestamps: !!backend.trackTimestamp,
        features: adapter?.features.size ?? 0,
        transient: 'TRANSIENT_ATTACHMENT' in ((globalThis as { GPUTextureUsage?: object }).GPUTextureUsage ?? {}),
      },
    },
  ];
  const limits = (from: object | undefined): Fields =>
    Object.fromEntries(LIMITS.map((name) => [LIMIT_KEYS[name], (from as Limits | undefined)?.[name] ?? null]));
  out.push(
    { k: 'dev.diag.alim', f: limits(adapter?.limits) },
    { k: 'dev.diag.dlim', f: limits(backend.device?.limits) },
  );
  return out;
}

/** `dev.diag.env`: screen, memory, input, refresh rate, battery, connection and the graphics the game chose. */
export async function envDiagnostics(refreshMs: number | null): Promise<Fields> {
  const nav = navigator as Nav;
  const battery = await nav.getBattery?.().catch(() => null);
  const canvas = renderer.domElement;
  const gfxNow = graphicsSnapshot()
    .filter((row) => row.audience === 'player' && row.available)
    .map((row) => `${row.id}=${String(row.effective)}`)
    .join(',');
  return {
    dpr: round1(devicePixelRatio),
    sw: screen.width,
    sh: screen.height,
    vw: innerWidth,
    vh: innerHeight,
    cw: canvas.width,
    ch: canvas.height,
    mem: nav.deviceMemory ?? null,
    cores: nav.hardwareConcurrency ?? null,
    touch: nav.maxTouchPoints,
    coarse: matchMedia('(pointer: coarse)').matches,
    refresh_ms: refreshMs === null ? null : round1(refreshMs),
    net: nav.connection?.effectiveType ?? null,
    battery: battery ? Math.round(battery.level * 100) : null,
    charging: battery ? battery.charging : null,
    rung: autoRung(),
    gfx: fit(gfxNow),
    standalone: matchMedia('(display-mode: standalone)').matches,
  };
}

/** `dev.load`: the boot timeline (marks in ms since navigation) and the bytes the page fetched. */
export function loadFields(): Fields {
  const tl = bootTimeline();
  const f: Fields = {
    req: tl.req,
    net_kb: Math.round(tl.net / 1000),
    body_kb: Math.round(tl.body / 1000),
    sw_req: tl.fromSw,
  };
  // Whether a service worker already controlled the page when it loaded: a warm load, labelled so. At the start, not
  // now: by now our own worker has registered and claimed a first visit too (run ckn9ca read "warm" on a cold launch).
  f.warm = controlledAtStart() ?? !!navigator.serviceWorker?.controller;
  f.nav = tl.nav;
  let n = 0;
  for (const m of tl.marks) {
    const key = `m_${m.name.replace(/[^a-z0-9]+/gi, '_')}`.slice(0, 24);
    if (!(key in f) && n++ < 12) f[key] = m.t;
  }
  // The headline figure, always sent: the interactive mark, else the last one (the marks above are capped).
  const ready = tl.marks.find((m) => m.name === 'interactive') ?? tl.marks.at(-1);
  if (ready) f.ready = ready.t;
  f.cold_req = new URLSearchParams(location.search).get('cold') === '1';
  let big: PerformanceResourceTiming | null = null;
  for (const r of performance.getEntriesByType('resource') as PerformanceResourceTiming[])
    if (!big || (r.transferSize || r.encodedBodySize) > (big.transferSize || big.encodedBodySize)) big = r;
  if (big) {
    f.big_kb = Math.round((big.transferSize || big.encodedBodySize) / 1000);
    f.big = fit(big.name.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''), 120);
  }
  return f;
}
