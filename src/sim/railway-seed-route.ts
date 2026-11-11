// The route's seed builders, Home to Far Head: line one, line two's Q1-Q5, the hook, the boiler and the kit train.
// Accepted sim ops only, no direct state writes. ./railway-seeds.ts is the catalog and says how to add a stage;
// ./railway-seed-works.ts builds on these for Split-rock. A seed is a world (./railway-drive.ts) and the rule tick it
// has reached; rows are read again after every op and tick (./railway-rows.ts), never held across one.
import type { World } from '../ecs/index.ts';
import type { RailAction } from './railway.ts';
import { apply, check, createRailway, invariant, need, restore } from './railway-drive.ts';
import { railTick } from './railway-systems.ts';
import { railSession } from './railway-sys-core.ts';
import { carried, scheduleOf } from './railway-queries.ts';
import { account, beam, boiler, cart, forge, qjob, rail, rocks, trains, trees } from './railway-rows.ts';
import { RAILWAY_SOURCES } from './railway-layout.ts';
import { LINE2_FORGE, LINE2_STATIONS } from './railway-line2-layout.ts';
import { CART_PHASE, cartCycleTicks } from './railway-cart.ts';

/** A seed in progress: the world and the rule tick it has reached. */
export type Seed = { w: World; t: number };
/** Ticks to lay line two's stretch k on its funded timing. */
export const layTicks = (w: World, k: number) => scheduleOf(LINE2_STATIONS[k]!, qjob(w, k)).totalTicks;
export function act(s: Seed, pid: string, op: string, fields: Partial<RailAction> = {}) {
  const a = account(s.w, pid)!;
  const r = apply(s.w, pid, { op, epoch: a.epoch, request: a.request + 1, ...fields }, s.t);
  const broken = invariant(s.w);
  need(broken === null, `${op}: ${broken}`);
  return r.accepted;
}
export function advance(s: Seed, ticks: number) {
  for (let i = 0; i < ticks; i++) railTick(s.w, ++s.t);
}
function clear(s: Seed) {
  for (const pid of ['a', 'b'])
    for (const kind of [0, 2] as const) {
      const a = account(s.w, pid)!;
      const n = kind ? a.rails : a.carry;
      if (n) need(act(s, pid, 'rail.drop', { x: 100000 + kind * 100, y: 2000, z: 3000, n, kind }) === n, 'clear: drop');
    }
}
function chop(s: Seed, pid: string) {
  while (carried(account(s.w, pid)!) < 8) {
    const k = trees(s.w).findIndex((t) => t.left > 0);
    need(k >= 0, 'a standing source');
    act(s, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
  }
}
export function logs(s: Seed, pid: string, station: string, n: number) {
  while (n > 0) {
    if (!account(s.w, pid)!.carry) chop(s, pid);
    const moved = act(s, pid, 'rail.deposit', { station, n: Math.min(n, account(s.w, pid)!.carry), kind: 0 });
    need(moved > 0, `${station} took logs`);
    n -= moved;
  }
}
export function rails(s: Seed, pid: string, station: string, n: number) {
  while (n > 0) {
    if (!account(s.w, pid)!.rails) {
      if (!forge(s.w).rack) advance(s, LINE2_FORGE.pourTicks * 8);
      need(act(s, pid, 'rail.forgeTake') > 0, 'forge: rails taken');
    }
    const moved = act(s, pid, 'rail.deposit', { station, n: Math.min(n, account(s.w, pid)!.rails), kind: 2 });
    need(moved > 0, `${station} took rails`);
    n -= moved;
  }
}
/** Players `a` and `b`, at Q2 with nothing delivered there yet. */
export function railwayAtQ2(): Seed {
  const w = createRailway();
  for (const pid of ['a', 'b']) railSession(w, pid, 1);
  apply(w, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  const s = { w, t: 40 };
  logs(s, 'a', 'T1', 24);
  advance(s, 300);
  for (let i = 0; i < 8;) {
    const n = act(s, 'b', 'rail.mine', { id: rocks(w).findIndex((r) => r.left > 0) });
    need(act(s, 'b', 'rail.deposit', { station: 'T2', kind: 1, n }) === n, 'T2 took stone');
    i += n;
  }
  logs(s, 'a', 'T2', 32);
  advance(s, 300);
  logs(s, 'a', 'T3', 40);
  act(s, 'a', 'rail.axe');
  for (let i = 0; i < 12; i++) act(s, 'a', 'rail.beamChop');
  act(s, 'a', 'rail.beamTake', { revision: beam(w).revision });
  need(act(s, 'a', 'rail.beamDeposit', { revision: beam(w).revision, station: 'T3' }) === 1, 'T3 took the beam');
  advance(s, 600);
  logs(s, 'a', 'F', LINE2_FORGE.logs);
  advance(s, LINE2_FORGE.turnTicks);
  logs(s, 'b', 'Q1', 16);
  rails(s, 'a', 'Q1', 6);
  advance(s, layTicks(w, 0));
  need(qjob(w, 0).completion === 1, 'Q1 laid');
  need(invariant(w) === null, 'railwayAtQ2: invariant');
  return s;
}
function finish(s: Seed, k: number) {
  advance(s, layTicks(s.w, k));
  need(qjob(s.w, k).completion === 1, `Q${k + 1} laid`);
}
/** Players `a` and `b`, Q2 laid and the hook shot taken (the route's Q2, hook, Q3 order): Q3 is next. */
export function railwayAtHook(): Seed {
  const s = railwayAtQ2();
  logs(s, 'a', 'Q2', 24);
  rails(s, 'b', 'Q2', 12);
  finish(s, 1);
  need(act(s, 'a', 'rail.hook') === 1, 'the hook taken');
  need(invariant(s.w) === null, 'railwayAtHook: invariant');
  return s;
}
/** Players `a` and `b`, Q3 laid and the gate still up: Q4 stocks materials before the lever is pulled, its depot cart
 * runs (logs and the rails shelf). Backs empty and Q3's unused depot logs carried off. */
export function railwayAtQ4(): Seed {
  const s = railwayAtQ2();
  logs(s, 'a', 'Q2', 24);
  rails(s, 'b', 'Q2', 12);
  finish(s, 1);
  logs(s, 'a', 'Q3', 16);
  rails(s, 'b', 'Q3', 12);
  finish(s, 2);
  clear(s);
  while (rail(s.w).depot) {
    act(s, 'a', 'rail.depotTake');
    clear(s);
  }
  need(invariant(s.w) === null, 'railwayAtQ4: invariant');
  return s;
}

export type RailSeedStage =
  | 'q4-done'
  | 'sea-open'
  | 'q5-stocked'
  | 'q5-finishing'
  | 'q5-done'; /** Q4 laid and Q5 active, then the accepted summit pull, cart stock, or funded trestle at the named beat. */
export function railwayAtQ5(stage: RailSeedStage): Seed {
  const s = railwayAtQ4();
  need(act(s, 'a', 'rail.lever') === 1, 'the lever pulled');
  need(act(s, 'a', 'rail.hook') === 1, 'the hook taken');
  logs(s, 'a', 'Q4', 16);
  rails(s, 'b', 'Q4', 16);
  advance(s, layTicks(s.w, 3));
  need(qjob(s.w, 3).completion === 1, 'Q4 laid');
  clear(s);
  if (stage !== 'q4-done') need(act(s, 'a', 'rail.seaSwitch') === 1, 'the sea switch');
  if (stage === 'q5-stocked' || stage === 'q5-finishing' || stage === 'q5-done') {
    let waited = 0;
    while (!(rail(s.w).depot === 24 && rail(s.w).depotRails === 24 && cart(s.w).phase === CART_PHASE.DROP)) {
      need(waited++ < 3 * cartCycleTicks(4), 'Q5 cart stock arrived');
      advance(s, 1);
    }
  }
  if (stage === 'q5-finishing' || stage === 'q5-done') {
    logs(s, 'a', 'Q5', 24);
    rails(s, 'b', 'Q5', 24);
    const total = layTicks(s.w, 4);
    // Leave 45 s for broker acquisition and page mounting; the look waits near the live final pair before capture.
    advance(s, stage === 'q5-finishing' ? total - 450 : total);
    clear(s);
  }
  need(invariant(s.w) === null, `railwayAtQ5 ${stage}: invariant`);
  return s;
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
let trainBase: Seed | undefined;
export function railwayAtTrains(stage: TrainStage): Seed {
  if (!trainBase) {
    const base = railwayAtQ5('q5-done');
    // The earlier fixture hand-fills Q5: carry off its unused depot logs so the first kit is the full 32/32.
    while (rail(base.w).depot) {
      const n = act(base, 'a', 'rail.depotTake');
      need(n > 0, 'Q5 depot logs taken');
      need(act(base, 'a', 'rail.drop', { x: 91900, y: 1815, z: 540, n, kind: 0 }) === n, 'Q5 depot logs dropped');
    }
    trainBase = base;
  }
  const s = { w: restore(trainBase.w), t: trainBase.t };
  const w = s.w;
  need(boiler(w).state === 'pedestal', 'the boiler on its pedestal');
  if (stage !== 'boiler') {
    need(act(s, 'a', 'rail.boilerTake', { revision: boiler(w).revision }) === 1, 'the boiler taken');
    if (stage === 'boiler-camp') {
      need(
        act(s, 'a', 'rail.boilerDrop', { revision: boiler(w).revision, x: 100700, y: 3030, z: -14400 }) === 1,
        'the boiler dropped at camp',
      );
    } else {
      need(act(s, 'a', 'rail.boilerFit', { revision: boiler(w).revision }) === 1, 'the boiler fitted');
      advance(s, 20);
      need(
        trains(w).every((r) => r.phase === 0),
        'every train waiting',
      );
    }
  }
  if (stage === 'q6-stocked' || stage === 'q6-finishing' || stage === 'q6-done') {
    let ticks = 0;
    while (rail(w).depot !== 32 || rail(w).depotRails !== 32) {
      need(ticks++ < 4000, 'kit unloaded at Far Head');
      advance(s, 1);
      // Rails conserved, among the rest of the load check.
      const broken = check(w);
      need(broken === null, `rails conserved: ${broken}`);
    }
    if (stage !== 'q6-stocked') {
      need(act(s, 'a', 'rail.pack') === 1, 'the pack');
      for (const kind of [0, 2])
        for (const pid of ['a', 'b']) {
          need(act(s, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake') === 16, 'Q6 depot taken');
          need(act(s, pid, 'rail.deposit', { station: 'Q6', kind, n: 16 }) === 16, 'Q6 took materials');
        }
      const total = layTicks(w, 5);
      advance(s, stage === 'q6-done' ? total : total - 450);
    }
  }
  const broken = invariant(w);
  need(broken === null, `railwayAtTrains ${stage}: ${broken}`);
  return s;
}
