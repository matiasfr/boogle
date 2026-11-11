// Replication budget at 3,000 entities (docs/plans/replication.md, red-team revision 5): the server's per-step diff
// and flush, the fallback full re-projection, the late-join size, and the client's mirror clone and predicted
// rebuild. Over a bound is a printed warning, never a failure (owner, 10 November); the numbers are printed for the record.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/sim/rng.ts';
import { defineReplicated, cellOf, cellsNear, type EntityId, type Fields } from '../src/world/replicate.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createMirror, createPredictor } from '../src/world/replicate-client.ts';
import { budgetWarning, measureWithinBudget } from './helpers/budget.ts';

const N = 3000;
const CLIENTS = 6;
const thing = defineReplicated('thing', { x: 'i32', z: 'i32', left: 'u8', work: 'u8', fell: 'bool', yaw: 'q16' });
type Thing = { x: number; z: number; left: number; work: number; fell: boolean; yaw: number };

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}
function time(fn: () => void) {
  const t = performance.now();
  fn();
  return performance.now() - t;
}

// One full measurement on fresh state; the test keeps the best of a few (test/helpers/budget.ts).
function measureOnce() {
  const rand = mulberry32(3000);
  const things = new Map<number, Thing>();
  // A big island: 3,000 entities over ~25 cells of 64 m.
  for (let k = 0; k < N; k++)
    things.set(k, {
      x: Math.floor(rand() * 32000) - 16000,
      z: Math.floor(rand() * 32000) - 16000,
      left: 10,
      work: 0,
      fell: false,
      yaw: 0,
    });
  const rep = createReplicator();
  rep.define({
    schema: thing,
    ids: () => things.keys(),
    project: (id) => {
      const v = things.get(id as number);
      return v ? { ...v } : null;
    },
    cell: (_id, f) => cellOf(f.x as number, f.z as number),
  });
  const mirrors = Array.from({ length: CLIENTS }, () => createMirror([thing]));
  let joinChars = 0;
  rep.touchAll('thing');
  const spawn = time(() => rep.commit(0));
  for (let c = 0; c < CLIENTS; c++) rep.addClient(`c${c}`);
  rep.flush(0, (cid, p) => {
    if (cid === 'c0') joinChars += JSON.stringify(p).length;
    mirrors[Number(cid.slice(1))]!.apply(p);
  });
  assert.equal(mirrors[0]!.size(), N);

  // One step's work: churn entities touched by actions/rules this step, then flush to every client.
  let step = 0;
  const stepMs = (churn: number, steps: number) => {
    const out: number[] = [];
    let chars = 0;
    for (let k = 0; k < steps; k++) {
      const s = ++step;
      for (let n = 0; n < churn; n++) {
        const id = Math.floor(rand() * N);
        const v = things.get(id)!;
        v.work = (v.work + 1) % 6;
        v.yaw = Math.floor(rand() * 65536);
        rep.touch('thing', id);
      }
      out.push(
        time(() => {
          rep.commit(s);
          chars += rep.flush(s, (cid, p) => mirrors[Number(cid.slice(1))]!.apply(p)).chars;
        }),
      );
    }
    return { ms: median(out), p95: [...out].sort((a, b) => a - b)[Math.floor(steps * 0.95)]!, chars };
  };
  stepMs(20, 200); // warm up
  const normal = stepMs(5, 600); // ~5 entity changes per step: a busy co-op grove
  const churn5 = stepMs(25, 600); // 5x churn
  const full = median(Array.from({ length: 20 }, () => time(() => (rep.touchAll('thing'), rep.commit(++step)))));

  // Client: clone the confirmed mirror (the predictor's base) and rebuild predicted state with 8 pending actions.
  const mirror = mirrors[0]!;
  const clone = median(Array.from({ length: 50 }, () => time(() => mirror.clone())));
  const predictor = createPredictor<Map<string, Map<EntityId, Fields>>, number>({
    confirmed: () => mirror.clone(),
    clone: (s) => s, // confirmed() already returns a fresh copy
    apply: (s, id) => {
      const f = s.get('thing')!.get(id)!;
      f.work = ((f.work as number) + 1) % 6;
    },
  });
  predictor.session(1, 1);
  for (let k = 0; k < 8; k++) predictor.act(k);
  const rebuild = median(
    Array.from({ length: 50 }, () =>
      time(() => {
        predictor.invalidate();
        predictor.state();
      }),
    ),
  );
  for (const m of mirrors) assert.equal(m.size(), N, 'every mirror still whole');
  // A late joiner subscribed by relevancy (cells within 64 m of it) instead of to the whole island.
  let nearChars = 0;
  rep.addClient('near', cellsNear(0, 0, 6400));
  rep.flush(++step, (cid, p) => void (cid === 'near' && (nearChars += JSON.stringify(p).length)));

  // Bytes per client: 60 steps a second, chars over 600 steps across CLIENTS clients.
  const kbit = (chars: number) => (chars * 8 * 60) / 600 / CLIENTS / 1000;
  const report = {
    entities: N,
    spawnCommitMs: +spawn.toFixed(2),
    stepMs: +normal.ms.toFixed(3),
    stepP95Ms: +normal.p95.toFixed(3),
    churn5StepMs: +churn5.ms.toFixed(3),
    churn5P95Ms: +churn5.p95.toFixed(3),
    fullReprojectMs: +full.toFixed(2),
    lateJoinKB: +(joinChars / 1024).toFixed(1),
    lateJoinNearKB: +(nearChars / 1024).toFixed(1),
    bytesPerChange: +(normal.chars / (600 * 5 * CLIENTS)).toFixed(1),
    normalKbitPerClient: +kbit(normal.chars).toFixed(1),
    churn5KbitPerClient: +kbit(churn5.chars).toFixed(1),
    clientCloneMs: +clone.toFixed(2),
    clientRebuildMs: +rebuild.toFixed(2),
  };
  return { report, normalMs: normal.ms, churn5Ms: churn5.ms, fullMs: full, cloneMs: clone, rebuildMs: rebuild };
}

// Absolute limits in ms, loose enough for a slow CI runner (several times slower than the M1 Max these were measured on)
// and stretched by machine load; they still catch a real regression, which is tens of times slower.
const LIMITS = { normalMs: 2, churn5Ms: 5, fullMs: 30, cloneMs: 10, rebuildMs: 15 };

test(`budget: ${N} entities, ${CLIENTS} clients`, { timeout: 60_000 }, (t) => {
  let last!: ReturnType<typeof measureOnce>;
  const { best, limits, scale, runs } = measureWithinBudget(LIMITS, () => {
    last = measureOnce();
    return {
      normalMs: last.normalMs,
      churn5Ms: last.churn5Ms,
      fullMs: last.fullMs,
      cloneMs: last.cloneMs,
      rebuildMs: last.rebuildMs,
    };
  });
  t.diagnostic(JSON.stringify({ ...last.report, best, loadScale: +scale.toFixed(2), runs }));
  if (process.env.REPLICATION_BUDGET) console.log(last.report, best);
  // A timing target guides and never fails (owner, 10 November); the size and state checks above still fail.
  const warning = budgetWarning('replication budget', best, limits, scale, runs);
  if (warning) t.diagnostic(warning);
});
