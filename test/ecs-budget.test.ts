// E's replicated-state path at 3,000 entities (docs/plans/ecs-e.md, step 2): a component, an action system,
// world.changes() feeding the replicator, world.clone() for the predictor. Measured per server step: actions + commit
// + flush to six mirrors, and the bytes allocated; per client: the predictor's clone and a rebuild with 8 pending
// actions. ECS_BUDGET=1 prints the numbers; over a bound warns, over a hard limit far above it fails. (The pre-E path
// it was first measured against, plain rows with a hand projection, is gone from the game and from this test.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, defineComponent, defineSystem, type World } from '../src/ecs/index.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { cellOf, GLOBAL_CELL } from '../src/world/replicate.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createMirror } from '../src/world/replicate-client.ts';
import { budgetWarning, hardLimitFailure, measureWithinBudget } from './helpers/budget.ts';
import { touchChanges, worldProjections } from '../src/world/replicate-world.ts';

const N = 3000;
const CLIENTS = 6;
const Thing = defineComponent('thing', { x: 'i32', z: 'i32', left: 'u8', work: 'u8', fell: 'bool', yaw: 'q16' });
type Act = { id: number; yaw: number };
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1]!;
const heap = () => process.memoryUsage().heapUsed;

const chop = defineSystem('chop', { writes: [Thing], phase: 'act', order: 0 }, (w, a: Act) => {
  const t = w.mut(Thing, a.id);
  if (!t) return 0;
  t.work = (t.work + 1) % 6;
  t.yaw = a.yaw;
  if (t.left) t.left--;
  t.fell = !t.left;
  return 1;
});
type Path = {
  name: string;
  act(a: Act): void;
  commit(step: number): void;
  clone(): World;
  predict(base: World, acts: Act[]): void;
};
function onE(w: World, rep: ReturnType<typeof createReplicator>): Path {
  for (const p of worldProjections(() => w, { thing: (_id, f) => cellOf(f.x as number, f.z as number) }, GLOBAL_CELL))
    rep.define(p);
  return {
    name: 'E: component + system + changes()',
    act: (a) => void w.run(chop, a),
    commit(step) {
      touchChanges(w, rep.touch);
      rep.commit(step);
    },
    clone: () => w.clone(),
    predict(base, acts) {
      const s = base.clone();
      for (const a of acts) s.run(chop, a);
    },
  };
}

// One full measurement on fresh state; the test keeps the best of a few (test/helpers/budget.ts).
function measureOnce() {
  const report: Record<string, number | string>[] = [];
  const ms: Record<string, number> = {};
  {
    const rand = mulberry32(3000);
    const w = createWorld([Thing]);
    for (let k = 0; k < N; k++)
      w.spawn([
        Thing,
        {
          x: Math.floor(rand() * 32000) - 16000,
          z: Math.floor(rand() * 32000) - 16000,
          left: 200,
          work: 0,
          fell: false,
          yaw: 0,
        },
      ]);
    const rep = createReplicator();
    const path = onE(w, rep);
    rep.touchAll('thing');
    path.commit(0);
    const mirrors = Array.from({ length: CLIENTS }, () => createMirror([Thing]));
    for (let c = 0; c < CLIENTS; c++) rep.addClient(`c${c}`);
    rep.flush(0, (cid, p) => mirrors[Number(cid.slice(1))]!.apply(p));
    let step = 0;
    const run = (churn: number, steps: number) => {
      const ms: number[] = [];
      let bytes = 0;
      for (let k = 0; k < steps; k++) {
        const acts = Array.from({ length: churn }, () => ({
          id: 1 + Math.floor(rand() * N),
          yaw: Math.floor(rand() * 65536),
        }));
        const h = heap();
        const t0 = performance.now();
        for (const a of acts) path.act(a);
        path.commit(++step);
        rep.flush(step, (cid, p) => mirrors[Number(cid.slice(1))]!.apply(p));
        ms.push(performance.now() - t0);
        const d = heap() - h;
        if (d > 0) bytes += d; // a collection inside the step reads negative: skipped
      }
      return { ms: median(ms), bytes: Math.round(bytes / steps) };
    };
    run(20, 200); // warm up
    const normal = run(5, 600);
    const churn5 = run(25, 600);
    const base = path.clone();
    const clone = median(Array.from({ length: 50 }, () => time(() => path.clone())));
    const acts = Array.from({ length: 8 }, (_, k) => ({ id: 1 + k * 7, yaw: k }));
    const rebuild = median(Array.from({ length: 50 }, () => time(() => path.predict(base, acts))));
    for (const m of mirrors) assert.equal(m.size(), N);
    report.push({
      path: path.name,
      stepMs: +normal.ms.toFixed(3),
      churn5StepMs: +churn5.ms.toFixed(3),
      bytesPerStep: normal.bytes,
      churn5BytesPerStep: churn5.bytes,
      cloneMs: +clone.toFixed(3),
      rebuild8Ms: +rebuild.toFixed(3),
    });
    ms.EStepMs = normal.ms;
    ms.EChurn5StepMs = churn5.ms;
    ms.ECloneMs = clone;
    ms.ERebuildMs = rebuild;
  }
  return { report, ms };
}

// Absolute limits in ms, loose enough for CI and stretched by machine load; a real regression is tens of times slower.
const LIMITS = { EStepMs: 2, EChurn5StepMs: 5, ECloneMs: 15, ERebuildMs: 20 };
// Hard limits that fail, 2x the warning limits (test/helpers/budget.ts). Measured 11 November on HOTBOX (i9-10900K,
// Node 26; as slow as or slower than the M1 Max's 7 November numbers in docs/plans/ecs-e.md), best per copy: idle step
// 0.13, churn5 0.30, clone 0.0016, rebuild 0.14 ms; worst with 20 budget-test copies beside npm run check: step 0.33,
// churn5 0.93, clone 0.0045, rebuild 0.47 ms. So each hard limit is 17x or more idle and 2.2x or more that worst run.
const HARD = Object.fromEntries(Object.entries(LIMITS).map(([k, v]) => [k, v * 2]));

test(`E's replicated path: ${N} entities, ${CLIENTS} clients`, { timeout: 60_000 }, (t) => {
  let last!: ReturnType<typeof measureOnce>;
  const { best, limits, scale, runs } = measureWithinBudget(LIMITS, () => (last = measureOnce()).ms);
  t.diagnostic(JSON.stringify({ report: last.report, best, loadScale: +scale.toFixed(2), runs }));
  if (process.env.ECS_BUDGET) console.table(last.report);
  // A timing target guides and never fails (owner, 10 November); the state checks above still fail, and so does a hard
  // limit far above it (owner, 11 November).
  const warning = budgetWarning('ecs budget', best, limits, scale, runs);
  if (warning) t.diagnostic(warning);
  const failure = hardLimitFailure('ecs budget', best, HARD, scale, runs);
  assert.equal(failure, '', failure);
});
function time(fn: () => void) {
  const t = performance.now();
  fn();
  return performance.now() - t;
}
