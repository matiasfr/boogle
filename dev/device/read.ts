// A device run's stored session (a playdata session with the card `device`, src/debug/device/wire.ts) as one typed
// result. Pure and tolerant: events may be missing (a run that died at scene 5), repeated (a scene sent twice: the
// last wins), or junk (unknown kinds, wrong types: ignored). Batch repeats are already dropped by parseSession.
import type { Session } from '../playtest/read.ts';

export type Raw = Record<string, string | number | boolean | null>;
export type SceneRow = {
  name: string;
  idx: number;
  verdict: 'pass' | 'fail' | 'not-measured';
  why: string;
  n: number | null;
  secs: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  max: number | null;
  over33: number | null;
  over50: number | null;
  longTasks: number | null;
  cpu: number | null;
  cpu95: number | null;
  gpu: number | null;
  gpuStatus: string;
  calls: number | null;
  tris: number | null;
  progs: number | null;
  geoms: number | null;
  ratio: number | null;
  rung: number | null;
  stallN: number | null;
  stallMax: number | null;
  progsNew: number | null;
  heapMb: number | null;
  /** Frames that drew a second of the sample; below the callback rate when a frame limit skips renders. */
  renderFps: number | null;
  /** The frame limit the page ran with: 30, 60, or 0 for the display's rate; null if the run did not say. */
  frameCap: number | null;
};
export type DeviceResult = {
  id: string;
  code: string;
  suite: string;
  build: string;
  label: string;
  device: string;
  browser: string;
  ua: string;
  /** The page made its own run id (`?device=new`), not `npm run device -- new`. */
  selfMinted: boolean;
  gpu: Raw;
  alim: Raw;
  dlim: Raw;
  env: Raw;
  load: Raw;
  /** The shader warm-up's pass 2 as Run found it (`dev.bg`): when it finished, how long Run waited; empty before it. */
  bg: Raw;
  /** The first navigation's load (`dev.first`), taken before Run was tapped; null for a run that predates it. */
  first: Raw | null;
  /** Its boot marks, `m_<name>` in ms since that navigation began (every `dev.boot` event merged). */
  boot: Raw;
  /** Its largest files, as the page described them. */
  files: string[];
  scenes: SceneRow[];
  done: Raw | null;
  /** `dev.done` arrived; false for a run cut off part-way. */
  complete: boolean;
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
/** A count that is a measurement: a draw call or triangle count of 0 means nothing was drawn when it was read, which
 * is no measurement (an older page read it on a frame the frame limit skipped). */
const count = (v: unknown) => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const VERDICTS = ['pass', 'fail', 'not-measured'] as const;

function sceneRow(e: Raw): SceneRow | null {
  const name = str(e.name);
  if (!name) return null;
  const verdict = VERDICTS.find((v) => v === e.verdict) ?? 'not-measured';
  return {
    name,
    idx: num(e.idx) ?? 0,
    verdict,
    why: str(e.why) || (VERDICTS.includes(e.verdict as never) ? '' : 'no verdict in the event'),
    n: num(e.n),
    secs: num(e.secs),
    p50: num(e.p50),
    p95: num(e.p95),
    p99: num(e.p99),
    max: num(e.max),
    over33: num(e.over33),
    over50: num(e.over50),
    longTasks: num(e.lt_n) === -1 ? null : num(e.lt_n),
    cpu: num(e.cpu),
    cpu95: num(e.cpu95),
    gpu: num(e.gpu),
    gpuStatus: str(e.gpu_status),
    calls: count(e.calls),
    tris: count(e.tris),
    progs: num(e.progs),
    geoms: num(e.geoms),
    ratio: num(e.ratio),
    rung: num(e.rung),
    stallN: num(e.stall_n),
    stallMax: num(e.stall_max),
    progsNew: num(e.progs_new),
    heapMb: num(e.heap_mb),
    renderFps: num(e.rfps),
    frameCap: num(e.fcap),
  };
}

/** `minted`: whether `npm run device -- new` made this id on this Mac (its run.json exists). */
export function readDevice(session: Session, minted = false): DeviceResult {
  const out: DeviceResult = {
    id: session.id,
    code: session.id.slice(-6),
    suite: '',
    build: '',
    label: '',
    device: '',
    browser: '',
    ua: '',
    selfMinted: !minted,
    gpu: {},
    alim: {},
    dlim: {},
    env: {},
    load: {},
    bg: {},
    first: null,
    boot: {},
    files: [],
    scenes: [],
    done: null,
    complete: false,
  };
  const scenes = new Map<string, Raw>(); // a scene is `dev.scene` and `dev.scene.cost`: merged by name
  for (const e of session.events) {
    const raw = e as Raw;
    switch (e.k) {
      case 'session':
        out.suite = str(raw.suite) || out.suite;
        out.build = str(raw.build) || out.build;
        out.label = str(raw.label) || out.label;
        out.device = str(raw.device) || out.device;
        out.browser = str(raw.browser) || out.browser;
        out.ua = str(raw.ua) || out.ua;
        if (raw.self === true) out.selfMinted = true;
        break;
      case 'dev.diag.gpu':
        out.gpu = raw;
        break;
      case 'dev.diag.alim':
        out.alim = raw;
        break;
      case 'dev.diag.dlim':
        out.dlim = raw;
        break;
      case 'dev.diag.env':
        out.env = raw;
        break;
      case 'dev.load':
        out.load = raw;
        break;
      case 'dev.bg':
        out.bg = raw;
        break;
      case 'dev.first':
        out.first = raw;
        break;
      case 'dev.boot':
        out.boot = { ...out.boot, ...raw };
        break;
      case 'dev.first.files':
        out.files = Object.entries(raw)
          .filter(([k, v]) => /^f\d+$/.test(k) && typeof v === 'string')
          .sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))
          .map(([, v]) => String(v));
        break;
      case 'dev.scene':
      case 'dev.scene.cost': {
        const name = str(raw.name);
        if (!name) break;
        // A repeated `dev.scene` is a new measurement of the scene: it replaces the earlier one whole.
        scenes.set(name, e.k === 'dev.scene' ? { ...raw } : { ...scenes.get(name), ...raw, k: 'dev.scene' });
        break;
      }
      case 'dev.done':
        out.done = raw;
        out.complete = true;
        break;
      default:
        break; // junk and future kinds
    }
  }
  out.scenes = [...scenes.values()].flatMap((raw) => sceneRow(raw) ?? []).sort((a, b) => a.idx - b.idx);
  return out;
}
