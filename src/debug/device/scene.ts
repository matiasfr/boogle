// One scene of a suite: cut to the pose, settle (the settle window is itself measured: compile stalls), then a sample
// of real frames. Counts are exact and times are noisy (docs/research/performance.md); the device keeps its own
// adaptive resolution and detail, as a player gets it, and the row names the rung. A missing GPU timer costs only the
// GPU column. Local, debug only.
import { renderer } from '../../render/scene.ts';
import { autoRung, graphicsSnapshot } from '../../graphics-settings.ts';
import { POSES, putPlayer } from '../perf-poses.ts';
import { warmGraphics } from '../dev/performance.ts';
import { hardwareTiming } from '../prof-overlay.ts';
import { collectFrames } from './frames.ts';
import { countOver, frameStats, sceneVerdict, STALL_MS } from './stats.ts';
import type { SceneDef } from './suites.ts';
import type { Fields } from './wire.ts';

/** Where the player stood when the run started, for the `spawn` poses. */
export type Home = { x: number; y: number; z: number; yaw: number };

/** JS heap where the browser says (Chromium only). */
const heapBytes = () => (performance as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

export async function readHome(): Promise<Home | null> {
  const { me } = await import('../../player/player.ts');
  const p = me.body?.position;
  return p ? { x: p.x, y: p.y, z: p.z, yaw: me.yaw } : null;
}

async function cut(def: SceneDef, home: Home | null) {
  const pose = POSES[def.pose];
  if (pose && 'cam' in pose) {
    window.__debugCam?.set([...pose.cam], [...pose.look]);
    return;
  }
  window.__debugCam?.clear();
  if (pose && 'put' in pose) {
    const [x, y, z, yaw] = pose.put;
    await putPlayer(x, y + 1, z, yaw); // as the bench: a metre above the deck, then it falls
  } else if (home) await putPlayer(home.x, home.y, home.z, home.yaw);
}

/** The frame limit the page runs with (the player's or the device's own setting): 0 follows the display. */
function frameCap(): number | null {
  const row = graphicsSnapshot().find((g) => g.id === 'frameLimit');
  return row ? (typeof row.effective === 'number' ? row.effective : 0) : null;
}

function observeLongTasks() {
  // Safari accepts the observer and never delivers a long task: a zero there would read as "none", not "unsupported".
  if (!PerformanceObserver.supportedEntryTypes?.includes('longtask')) return () => null;
  try {
    const seen = { n: 0, ms: 0 };
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        seen.n++;
        seen.ms += e.duration;
      }
    });
    po.observe({ entryTypes: ['longtask'] });
    return () => (po.disconnect(), seen);
  } catch {
    return () => null; // Safari: no long task entries
  }
}

type Timing = Awaited<ReturnType<typeof hardwareTiming>>;

/** The row for one scene (a `dev.scene` event's fields). Never throws: a scene that cannot be measured says why. */
export async function measureScene(
  def: SceneDef,
  index: number,
  opts: { settleS: number; sampleS: number; refreshMs: number; home: Home | null },
): Promise<Fields> {
  const row: Fields = { name: def.name, idx: index };
  const programs = () => (renderer.info.memory as { programs?: number }).programs ?? 0;
  try {
    await cut(def, opts.home);
    // Settle, measured: frames over 100 ms and the slowest frame are the compile stall.
    const programsBefore = programs();
    const settle = collectFrames();
    const settleStart = performance.now();
    await warmGraphics(opts.settleS);
    const s = settle.stop();
    row.settle_ms = Math.round(performance.now() - settleStart);
    row.stall_n = countOver(s.intervals, STALL_MS);
    row.stall_max = s.intervals.length ? round(Math.max(...s.intervals)) : null;
    row.progs_new = programs() - programsBefore;

    // Sample: our own intervals for the percentiles, the profiler's timing for CPU and GPU.
    const longTasks = observeLongTasks();
    const heap0 = heapBytes();
    const sample = collectFrames();
    const start = performance.now();
    let timing: Timing | null = null;
    let timingNote = '';
    try {
      timing = await hardwareTiming(opts.sampleS);
    } catch (e) {
      timingNote = e instanceof Error ? e.message : 'unavailable';
      await sleep(opts.sampleS * 1000);
    }
    const seconds = (performance.now() - start) / 1000;
    const { intervals, hidden, rendered, draw } = sample.stop();
    const stats = frameStats(intervals);
    const verdict = sceneVerdict({ stats, seconds, hidden, refreshMs: opts.refreshMs });
    const lt = longTasks();
    const heap1 = heapBytes();
    const mem = renderer.info.memory as { programs?: number; geometries?: number; textures?: number };
    const max = Math.min(devicePixelRatio, 2);
    Object.assign(row, {
      secs: round(seconds),
      n: stats?.n ?? 0,
      p50: stats ? round(stats.p50, 2) : null,
      p95: stats ? round(stats.p95, 2) : null,
      p99: stats ? round(stats.p99, 2) : null,
      max: stats ? round(stats.max) : null,
      over33: stats?.over33 ?? null,
      over50: stats?.over50 ?? null,
      lt_n: lt?.n ?? -1,
      lt_ms: lt ? Math.round(lt.ms) : -1,
      cpu: timing?.cpu.stats ? round(timing.cpu.stats.avgMs, 2) : null,
      cpu95: timing?.cpu.stats ? round(timing.cpu.stats.p95Ms, 2) : null,
      gpu: timing?.gpu.span.stats ? round(timing.gpu.span.stats.avgMs, 2) : null,
      gpu_status: timing ? timing.gpu.span.status.slice(0, 60) : timingNote.slice(0, 60),
      calls: draw?.calls ?? null, // never a zero: no drawn frame in the sample is "not measured"
      tris: draw?.tris ?? null,
      rfps: seconds > 0 ? round(rendered / seconds) : null, // frames that drew a second (a frame limit lowers it)
      fcap: frameCap(),
      progs: mem.programs ?? null,
      geoms: mem.geometries ?? null,
      texs: mem.textures ?? null,
      ratio: round(renderer.getPixelRatio() / max, 2),
      rung: autoRung(),
      heap_mb: heap1 === null ? null : round(heap1 / 2 ** 20),
      heap_d: heap0 === null || heap1 === null ? null : round((heap1 - heap0) / 2 ** 20, 2),
      hidden,
      verdict: verdict.verdict,
      why: verdict.why,
    });
  } catch (e) {
    row.verdict = 'not-measured';
    row.why = (e instanceof Error ? e.message : String(e)).slice(0, 200);
  }
  return row;
}
