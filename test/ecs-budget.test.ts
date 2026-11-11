// E against today's replicated-state path at 3,000 entities (docs/plans/ecs-e.md, step 2). The same action stream
// runs twice: today's way (plain rows, a hand projection, the actions naming what they touched, structuredClone for
// the predictor) and E's (a component, an action system, world.changes() feeding the replicator, world.clone()).
// Measured per server step: actions + commit + flush to six mirrors, and the bytes allocated; per client: the
// predictor's clone and a rebuild with 8 pending actions. ECS_BUDGET=1 prints the numbers; over a bound warns, never fails.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, defineComponent, defineSystem, type World } from '../src/ecs/index.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { cellOf, GLOBAL_CELL } from '../src/world/replicate.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createMirror } from '../src/world/replicate-client.ts';
import { budgetWarning, measureWithinBudget } from './helpers/budget.ts';
import { touchChanges, worldProjections } from '../src/world/replicate-world.ts';

const N = 3000;
const CLIENTS = 6;
const Thing = defineComponent('thing', { x: 'i32', z: 'i32', left: 'u8', work: 'u8', fell: 'bool', yaw: 'q16' });
type Row = { x: number; z: number; left: number; work: number; fell: boolean; yaw: number };
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
function chopRow(t: Row, a: Act) {
  t.work = (t.work + 1) % 6;
  t.yaw = a.yaw;
  if (t.left) t.left--;
  t.fell = !t.left;
}

type Path = {
  name: string;
  act(a: Act): void;
  commit(step: number): void;
  clone(): unknown;
  predict(base: unknown, acts: Act[]): void;
};
function today(rows: Map<number, Row>, rep: ReturnType<typeof createReplicator>): Path {
  rep.define({
    schema: Thing,
    ids: () => rows.keys(),
    project: (id) => {
      const v = rows.get(id as number);
      return v ? { ...v } : null;
    },
    cell: (_id, f) => cellOf(f.x as number, f.z as number),
  });
  return {
    name: 'today: plain rows + projection',
    act(a) {
      chopRow(rows.get(a.id)!, a);
      rep.touch('thing', a.id); // the action names what it touched
    },
    commit: (step) => rep.commit(step),
    clone: () => structuredClone(rows),
    predict(base, acts) {
      const s = structuredClone(base as Map<number, Row>);
      for (const a of acts) chopRow(s.get(a.id)!, a);
    },
  };
}
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
      const s = (base as World).clone();
      for (const a of acts) s.run(chop, a);
    },
  };
}

// One full measurement of both paths on fresh state; the test keeps the best of a few (test/helpers/budget.ts).
function measureOnce() {
  const report: Record<string, number | string>[] = [];
  const ms: Record<string, number> = {};
  for (const which of ['today', 'E'] as const) {
    const rand = mulberry32(3000);
    const rows = new Map<number, Row>();
    const w = createWorld([Thing]);
    for (let k = 0; k < N; k++) {
      const row = {
        x: Math.floor(rand() * 32000) - 16000,
        z: Math.floor(rand() * 32000) - 16000,
        left: 200,
        work: 0,
        fell: false,
        yaw: 0,
      };
      rows.set(k + 1, row);
      w.spawn([Thing, row]);
    }
    const rep = createReplicator();
    const path = which === 'today' ? today(rows, rep) : onE(w, rep);
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
    // Both paths leave every mirror with the same rows for the same stream.
    const hash = JSON.stringify([...mirrors[0]!.entries('thing')].sort(([a], [b]) => Number(a) - Number(b)));
    report.push({
      path: path.name,
      stepMs: +normal.ms.toFixed(3),
      churn5StepMs: +churn5.ms.toFixed(3),
      bytesPerStep: normal.bytes,
      churn5BytesPerStep: churn5.bytes,
      cloneMs: +clone.toFixed(3),
      rebuild8Ms: +rebuild.toFixed(3),
      mirror: String(hash.length) + ':' + hashText(hash),
    });
    ms[`${which}StepMs`] = normal.ms;
    ms[`${which}Churn5StepMs`] = churn5.ms;
    ms[`${which}CloneMs`] = clone;
    ms[`${which}RebuildMs`] = rebuild;
  }
  assert.equal(report[0]!.mirror, report[1]!.mirror, 'both paths replicate the same state');
  return { report, ms };
}

// Absolute limits in ms, loose enough for CI and stretched by machine load; a real regression is tens of times slower.
const LIMITS = Object.fromEntries(
  ['today', 'E'].flatMap((w) => [
    [`${w}StepMs`, 2],
    [`${w}Churn5StepMs`, 5],
    [`${w}CloneMs`, 15],
    [`${w}RebuildMs`, 20],
  ]),
);

test(`E against today's replicated path: ${N} entities, ${CLIENTS} clients`, { timeout: 60_000 }, (t) => {
  let last!: ReturnType<typeof measureOnce>;
  const { best, limits, scale, runs } = measureWithinBudget(LIMITS, () => (last = measureOnce()).ms);
  t.diagnostic(JSON.stringify({ report: last.report, best, loadScale: +scale.toFixed(2), runs }));
  if (process.env.ECS_BUDGET) console.table(last.report);
  // A timing target guides and never fails (owner, 10 November); the state checks above still fail.
  const warning = budgetWarning('ecs budget', best, limits, scale, runs);
  if (warning) t.diagnostic(warning);
});
function time(fn: () => void) {
  const t = performance.now();
  fn();
  return performance.now() - t;
}
function hashText(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}
