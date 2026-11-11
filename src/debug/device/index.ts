// The device test (docs/plans/remote-device-tests.md): `?device=<run id>` opens a panel over the loading screen with a
// Run button. Run starts the game the way "Jump in" does (the lobby's own button), then measures the suite's scenes
// in this private jump room and uploads each result as a playdata session with the card `device` (./upload.ts), so
// `npm run device -- pull` can turn it into a report on the Mac. Nothing here sends anything to other players or
// touches a save. Loaded by src/features/device-test.ts, only when the address has `device`. Sync kind: Local.
import { bootInteractive, bootMarks, onBootMark } from '../../boot/timeline.ts';
import { shaderStats } from '../../render/precompile.ts';
import { BUILD } from '../../build-id.ts';
import { deviceFields, envDiagnostics, gpuDiagnostics, loadFields } from './diagnostics.ts';
import { refreshInterval } from './frames.ts';
import { parseDeviceLink, shortCode } from './id.ts';
import { captureFirstLoad, coldNote } from './first-load.ts';
import { launchHeadlines, markEvents } from './launch.ts';
import { createPanel } from './panel.ts';
import { measureScene, readHome } from './scene.ts';
import { heatDrift, readyLine } from './stats.ts';
import { SUITES } from './suites.ts';
import { createUploader } from './upload.ts';
import { sceneEvents, sessionEvent, type Fields } from './wire.ts';
import type { PlayEvent } from '../../../server/src/playdata.ts';

const clock = () => Math.round(performance.now() / 100) / 10;
const ev = (k: string, f: Fields): PlayEvent => ({ t: clock(), k, ...f });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const FALLBACK_REFRESH_MS = 1000 / 60;

async function enterGame() {
  document.getElementById('enter')?.click(); // the lobby's own "Jump in"
  const end = performance.now() + 60_000;
  while (!document.body.classList.contains('playing')) {
    if (performance.now() > end) throw new Error('the game never started');
    await sleep(100);
  }
  await sleep(1500); // the arrival
}

// The shader warm-up's pass 2 (src/render/precompile.ts) builds the rest of the world's pipelines after the loading
// screen. The scenes start once it is done, so their settle columns measure what it missed (the test: 0 stalls over
// 100 ms and +0 programs); dev.bg says when it finished and how long Run waited for it.
async function backgroundShaders(limitMs: number) {
  const t0 = performance.now();
  const at = () => bootMarks().find((m) => m.name === 'shaders-all');
  if (!at())
    await new Promise<void>((resolve) => {
      const off = onBootMark(() => at() && done());
      const timer = setTimeout(() => done(), limitMs);
      function done() {
        off();
        clearTimeout(timer);
        resolve();
      }
    });
  const mark = at();
  return {
    all_ms: mark?.t ?? null,
    wait_ms: Math.round(performance.now() - t0),
    pipelines: mark?.detail?.pipelines ?? null,
    late: mark?.detail?.late ?? null,
    held: mark?.detail?.held ?? null,
    building: shaderStats().building,
  };
}

export function startDeviceTest() {
  const link = parseDeviceLink(location.search);
  if (link.kind === 'none') return;
  if (link.kind === 'new') return; // the entry rewrites this before boot; never run with a made-up id
  const panel = createPanel(
    link.kind === 'run'
      ? {
          suite: link.suite,
          build: BUILD,
          label: link.label,
          code: shortCode(link.id),
          self: link.self,
          note: coldNote(link.id),
        }
      : { suite: '', build: BUILD, label: '', code: '', self: false, note: '' },
  );
  if (link.kind === 'damaged') return panel.damaged();
  const runId = link.id;

  const suite = SUITES[link.suite];
  const code = shortCode(link.id);
  let uploadNote = '';
  const uploader = createUploader(link.id, (_state, note) => (uploadNote = note));
  const session = (state: string, more: Fields = {}) =>
    sessionEvent(clock(), {
      suite: link.suite,
      build: BUILD,
      label: link.label,
      ...deviceFields(),
      self: link.self,
      state,
      ...more,
    });

  panel.ready(() => {
    run().catch((e: unknown) => panel.note(`Failed: ${e instanceof Error ? e.message : String(e)}`));
  });
  const coldAsked = new URLSearchParams(location.search).get('cold') === '1';
  // The first navigation's load, taken the moment the page is usable (and refreshed at Run, when more marks exist).
  void bootInteractive.then(() => {
    panel.enable();
    captureFirstLoad(runId, performance.now(), coldAsked);
  });

  async function run() {
    const refresh = (await refreshInterval()) ?? FALLBACK_REFRESH_MS;
    await enterGame();
    const bg = await backgroundShaders(60_000);
    const t0 = performance.now();
    const load = loadFields();
    const launch = captureFirstLoad(runId, null, coldAsked);
    uploader.send([
      session('started'),
      ...(await gpuDiagnostics()).map((d) => ev(d.k, d.f)),
      ev('dev.diag.env', await envDiagnostics(refresh)),
      ev('dev.load', load),
      ev('dev.bg', bg),
      ...(launch
        ? [
            ev('dev.first', launch.fields),
            ...markEvents(clock(), launch.marks),
            ev('dev.first.files', Object.fromEntries(launch.files.map((f, i) => [`f${i + 1}`, f]))),
          ]
        : []),
    ]);
    const home = await readHome();
    const rows: Fields[] = [];
    for (const [i, def] of suite.scenes.entries()) {
      panel.running(i, suite.scenes.length, def.name, 'measuring');
      const row = await measureScene(def, i, {
        settleS: suite.settleS,
        sampleS: suite.sampleS,
        refreshMs: refresh,
        home,
      });
      rows.push(row);
      uploader.send(sceneEvents(clock(), row));
    }
    const count = (v: string) => rows.filter((r) => r.verdict === v).length;
    const first = rows.find((r) => r.name === 'spawn')?.p50;
    const last = rows.find((r) => r.name === 'heat')?.p50;
    const drift = heatDrift(typeof first === 'number' ? first : null, typeof last === 'number' ? last : null);
    const pass = count('pass');
    uploader.send([
      ev('dev.done', {
        scenes: rows.length,
        pass,
        fail: count('fail'),
        not_measured: count('not-measured'),
        drift_pct: drift,
        ms: Math.round(performance.now() - t0),
        // built late during the scenes, after pass 2 had finished: each one a miss of the warm-up
        bg_after: shaderStats().afterAll,
      }),
      session('done', { pass, total: rows.length }),
    ]);
    const show = () =>
      panel.summary(
        {
          device: String(deviceFields().device),
          rows,
          drift,
          pass,
          total: rows.length,
          code,
          ready: launch
            ? launchHeadlines(launch.fields).join('\n')
            : readyLine(typeof load.ready === 'number' ? load.ready : null, null, coldAsked),
          upload: uploader.state(),
          uploadNote,
        },
        () => void uploader.retry().then(show),
      );
    show();
    await uploader.settled();
    show();
  }
}
