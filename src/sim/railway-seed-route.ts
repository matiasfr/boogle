// The route's seed builders, Home to Far Head: line one, line two's Q1-Q5, the hook, the boiler and the kit train.
// Accepted sim ops only, no direct state writes. ./railway-seeds.ts is the catalog and says how to add a stage;
// ./railway-seed-works.ts builds on these for Split-rock.
import { railAccount, type Railway, type RailAction } from './railway.ts';
import {
  createRailway,
  invariant as railwayInvariant,
  need,
  railApply,
  railSession,
  railTick,
  restore,
} from './railway-live.ts';
import { RAILWAY_SOURCES } from './railway-layout.ts';
import { line2Rails, line2Schedule } from './railway-line2.ts';
import { LINE2_FORGE } from './railway-line2-layout.ts';
import { CART_PHASE, cartCycleTicks } from './railway-cart.ts';

export type World = { s: Railway; t: number };
export function act(w: World, pid: string, op: string, fields: Partial<RailAction> = {}) {
  const a = railAccount(w.s, pid)!;
  const r = railApply(w.s, pid, { op, epoch: a.epoch, request: a.request + 1, ...fields }, w.t);
  const broken = railwayInvariant(w.s);
  need(broken === null, `${op}: ${broken}`);
  return r.accepted;
}
export function advance(w: World, ticks: number) {
  for (let i = 0; i < ticks; i++) railTick(w.s, ++w.t);
}
function clear(w: World) {
  for (const pid of ['a', 'b']) {
    const a = railAccount(w.s, pid)!;
    for (const kind of [0, 2] as const) {
      const n = kind ? (a.rails ?? 0) : a.carry;
      if (n) need(act(w, pid, 'rail.drop', { x: 100000 + kind * 100, y: 2000, z: 3000, n, kind }) === n, 'clear: drop');
    }
  }
}
function chop(w: World, pid: string) {
  const a = railAccount(w.s, pid)!;
  while (a.carry + (a.stone ?? 0) + (a.rails ?? 0) < 8) {
    const k = w.s.sources.findIndex((n) => n > 0);
    need(k >= 0, 'a standing source');
    act(w, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
  }
}
export function logs(w: World, pid: string, station: string, n: number) {
  while (n > 0) {
    if (!railAccount(w.s, pid)!.carry) chop(w, pid);
    const moved = act(w, pid, 'rail.deposit', { station, n: Math.min(n, railAccount(w.s, pid)!.carry), kind: 0 });
    need(moved > 0, `${station} took logs`);
    n -= moved;
  }
}
export function rails(w: World, pid: string, station: string, n: number) {
  while (n > 0) {
    if (!railAccount(w.s, pid)!.rails) {
      if (!w.s.line2!.forge.rack) advance(w, LINE2_FORGE.pourTicks * 8);
      need(act(w, pid, 'rail.forgeTake') > 0, 'forge: rails taken');
    }
    const moved = act(w, pid, 'rail.deposit', { station, n: Math.min(n, railAccount(w.s, pid)!.rails!), kind: 2 });
    need(moved > 0, `${station} took rails`);
    n -= moved;
  }
}
/** Players `a` and `b`, at Q2 with nothing delivered there yet. */
export function railwayAtQ2(): World {
  const s = createRailway();
  for (const pid of ['a', 'b']) railSession(s, pid, 1);
  railApply(s, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  const w = { s, t: 40 };
  logs(w, 'a', 'T1', 24);
  advance(w, 300);
  for (let i = 0; i < 8;) {
    const n = act(w, 'b', 'rail.mine', { id: s.line!.rocks.findIndex((r) => r > 0) });
    need(act(w, 'b', 'rail.deposit', { station: 'T2', kind: 1, n }) === n, 'T2 took stone');
    i += n;
  }
  logs(w, 'a', 'T2', 32);
  advance(w, 300);
  logs(w, 'a', 'T3', 40);
  act(w, 'a', 'rail.axe');
  for (let i = 0; i < 12; i++) act(w, 'a', 'rail.beamChop');
  act(w, 'a', 'rail.beamTake', { revision: s.line!.beam.revision });
  need(act(w, 'a', 'rail.beamDeposit', { revision: s.line!.beam.revision, station: 'T3' }) === 1, 'T3 took the beam');
  advance(w, 600);
  logs(w, 'a', 'F', LINE2_FORGE.logs);
  advance(w, LINE2_FORGE.turnTicks);
  logs(w, 'b', 'Q1', 16);
  rails(w, 'a', 'Q1', 6);
  const q1 = s.line2!.jobs[0]!;
  advance(w, line2Schedule(0, q1).totalTicks);
  need(q1.completion === 1, 'Q1 laid');
  need(railwayInvariant(s) === null, 'railwayAtQ2: invariant');
  return w;
}
function finish(w: World, k: number) {
  const job = w.s.line2!.jobs[k]!;
  advance(w, line2Schedule(k, job).totalTicks);
  need(job.completion === 1, `Q${k + 1} laid`);
}
/** Players `a` and `b`, Q2 laid and the hook shot taken (the route's Q2, hook, Q3 order): Q3 is next. */
export function railwayAtHook(): World {
  const w = railwayAtQ2();
  logs(w, 'a', 'Q2', 24);
  rails(w, 'b', 'Q2', 12);
  finish(w, 1);
  need(act(w, 'a', 'rail.hook') === 1, 'the hook taken');
  need(railwayInvariant(w.s) === null, 'railwayAtHook: invariant');
  return w;
}
/** Players `a` and `b`, Q3 laid and the gate still up: Q4 stocks materials before the lever is pulled, its depot cart
 * runs (logs and the rails shelf). Backs empty and Q3's unused depot logs carried off. */
export function railwayAtQ4(): World {
  const w = railwayAtQ2();
  logs(w, 'a', 'Q2', 24);
  rails(w, 'b', 'Q2', 12);
  finish(w, 1);
  logs(w, 'a', 'Q3', 16);
  rails(w, 'b', 'Q3', 12);
  finish(w, 2);
  clear(w);
  while (w.s.line2!.depot) {
    act(w, 'a', 'rail.depotTake');
    clear(w);
  }
  need(railwayInvariant(w.s) === null, 'railwayAtQ4: invariant');
  return w;
}

export type RailSeedStage =
  | 'q4-done'
  | 'sea-open'
  | 'q5-stocked'
  | 'q5-finishing'
  | 'q5-done'; /** Q4 laid and Q5 active, then the accepted summit pull, cart stock, or funded trestle at the named beat. */
export function railwayAtQ5(stage: RailSeedStage): World {
  const w = railwayAtQ4();
  need(act(w, 'a', 'rail.lever') === 1, 'the lever pulled');
  need(act(w, 'a', 'rail.hook') === 1, 'the hook taken');
  logs(w, 'a', 'Q4', 16);
  rails(w, 'b', 'Q4', 16);
  advance(w, line2Schedule(3, w.s.line2!.jobs[3]!).totalTicks);
  need(w.s.line2!.jobs[3]!.completion === 1, 'Q4 laid');
  clear(w);
  if (stage !== 'q4-done') need(act(w, 'a', 'rail.seaSwitch') === 1, 'the sea switch');
  if (stage === 'q5-stocked' || stage === 'q5-finishing' || stage === 'q5-done') {
    let waited = 0;
    while (!(w.s.line2!.depot === 24 && w.s.line2!.depotRails === 24 && w.s.line2!.cart.phase === CART_PHASE.DROP)) {
      need(waited++ < 3 * cartCycleTicks(4), 'Q5 cart stock arrived');
      advance(w, 1);
    }
  }
  if (stage === 'q5-finishing' || stage === 'q5-done') {
    logs(w, 'a', 'Q5', 24);
    rails(w, 'b', 'Q5', 24);
    const total = line2Schedule(4, w.s.line2!.jobs[4]!).totalTicks;
    // Leave 45 s for broker acquisition and page mounting; the look waits near the live final pair before capture.
    advance(w, stage === 'q5-finishing' ? total - 450 : total);
    clear(w);
  }
  need(railwayInvariant(w.s) === null, `railwayAtQ5 ${stage}: invariant`);
  return w;
}

// Accepted fixtures for the boiler and kit train.
export type TrainStage = 'boiler' | 'boiler-camp' | 'trains-on' | 'q6-stocked' | 'q6-finishing' | 'q6-done';
export const TRAIN_STAGES: readonly TrainStage[] = [
  'boiler',
  'boiler-camp',
  'trains-on',
  'q6-stocked',
  'q6-finishing',
  'q6-done',
];
// Share only a serialized source fixture through restore, never a mutable world between callers.
let trainBase: World | undefined;
export function railwayAtTrains(stage: TrainStage): World {
  if (!trainBase) {
    const base = railwayAtQ5('q5-done');
    // The earlier fixture hand-fills Q5: carry off its unused depot logs so the first kit is the full 32/32.
    while (base.s.line2!.depot) {
      const n = act(base, 'a', 'rail.depotTake');
      need(n > 0, 'Q5 depot logs taken');
      need(act(base, 'a', 'rail.drop', { x: 91900, y: 1815, z: 540, n, kind: 0 }) === n, 'Q5 depot logs dropped');
    }
    trainBase = base;
  }
  const w = { s: restore(trainBase.s), t: trainBase.t };
  const l = w.s.line2!;
  need(l.boiler.state === 'pedestal', 'the boiler on its pedestal');
  if (stage !== 'boiler') {
    need(act(w, 'a', 'rail.boilerTake', { revision: l.boiler.revision }) === 1, 'the boiler taken');
    if (stage === 'boiler-camp') {
      need(
        act(w, 'a', 'rail.boilerDrop', { revision: l.boiler.revision, x: 100700, y: 3030, z: -14400 }) === 1,
        'the boiler dropped at camp',
      );
    } else {
      need(act(w, 'a', 'rail.boilerFit', { revision: l.boiler.revision }) === 1, 'the boiler fitted');
      advance(w, 20);
      need(
        l.train.every((r) => r.phase === 0),
        'both trains waiting',
      );
    }
  }
  if (stage === 'q6-stocked' || stage === 'q6-finishing' || stage === 'q6-done') {
    let ticks = 0;
    while (l.depot !== 32 || l.depotRails !== 32) {
      need(ticks++ < 4000, 'kit unloaded at Far Head');
      advance(w, 1);
      need(line2Rails(w.s) === l.forge.poured, 'rails conserved');
    }
    if (stage !== 'q6-stocked') {
      need(act(w, 'a', 'rail.pack') === 1, 'the pack');
      for (const kind of [0, 2])
        for (const pid of ['a', 'b']) {
          need(act(w, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake') === 16, 'Q6 depot taken');
          need(act(w, pid, 'rail.deposit', { station: 'Q6', kind, n: 16 }) === 16, 'Q6 took materials');
        }
      const total = line2Schedule(5, l.jobs[5]!).totalTicks;
      advance(w, stage === 'q6-done' ? total : total - 450);
    }
  }
  const broken = railwayInvariant(w.s);
  need(broken === null, `railwayAtTrains ${stage}: ${broken}`);
  return w;
}
