// The route's seed builders, Home to Far Head: line one, line two's Q1-Q5, the hook, the boiler and the kit train.
// Accepted sim ops only, no direct state writes. ./railway-seeds.ts is the catalog and says how to add a stage;
// ./railway-seed-works.ts builds on these for Split-rock. A seed is a world (./railway-drive.ts) and the rule tick it
// has reached; rows are read again after every op and tick (./railway-rows.ts), never held across one.
import type { World } from '../ecs/index.ts';
import type { RailAction } from './railway.ts';
import { apply, check, createRailway, invariant, need, restore } from './railway-drive.ts';
import { railTick } from './railway-systems.ts';
import { railSession } from './railway-sys-core.ts';
import { balanceOf, scheduleOf } from './railway-queries.ts';
import { account, beam, boiler, cart, forge, qjob, rail, rocks, trains, trees } from './railway-rows.ts';
import { RAILWAY_CAPACITY, RAILWAY_SOURCES } from './railway-layout.ts';
import { LINE1_STATIONS } from './railway-line-layout.ts';
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
/** Both backs emptied onto piles beside the line; a pile holds 8, so a back of 16 rails (the yoke) takes two drops. */
function clear(s: Seed) {
  for (const pid of ['a', 'b'])
    for (const kind of [0, 2] as const) {
      const left = () => balanceOf(account(s.w, pid)!, kind);
      for (let n = left(); n; n = left()) {
        need(act(s, pid, 'rail.drop', { x: 100000 + kind * 100, y: 2000, z: 3000, n, kind }) > 0, 'clear: drop');
      }
    }
}
function chop(s: Seed, pid: string) {
  // Until a starting back's row of logs (8), pack or not; the last chop can overshoot it (2 a hit after Station 3, the
  // proper axe's 5 to 10); `logs` deposits only what the bill takes, so any over stays on the back.
  while (account(s.w, pid)!.carry < RAILWAY_CAPACITY.logs) {
    const k = trees(s.w).findIndex((t) => t.left > 0);
    need(k >= 0, 'a standing source');
    need(act(s, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false }) > 0, 'logs chopped');
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
/** A take at the forge rail rack, waiting for a pour first if it is empty. */
function forgeTake(s: Seed, pid: string) {
  if (!forge(s.w).rack) advance(s, LINE2_FORGE.pourTicks * 8);
  need(act(s, pid, 'rail.forgeTake') > 0, 'forge: rails taken');
}
export function rails(s: Seed, pid: string, station: string, n: number) {
  while (n > 0) {
    if (!account(s.w, pid)!.rails) forgeTake(s, pid);
    const moved = act(s, pid, 'rail.deposit', { station, n: Math.min(n, account(s.w, pid)!.rails), kind: 2 });
    need(moved > 0, `${station} took rails`);
    n -= moved;
  }
}
/** Players a and b after funding Station 1, with the first stretch laid. */
export function railwayAtT1Laid(): Seed {
  const w = createRailway();
  for (const pid of ['a', 'b']) railSession(w, pid, 1);
  need(apply(w, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0).accepted === 1, 'the wake');
  const s = { w, t: 40 };
  logs(s, 'a', 'T1', 24);
  advance(s, 300);
  return s;
}
/** Players a and b, line one laid to the forge with nothing in its bill yet. */
function railwayAtForgeBill(): Seed {
  const s = railwayAtT1Laid();
  const { w } = s;
  for (let i = 0; i < 8;) {
    const n = act(s, 'b', 'rail.mine', { id: rocks(w).findIndex((r) => r.left > 0) });
    need(n > 0, 'stone mined');
    need(act(s, 'b', 'rail.deposit', { station: 'T2', kind: 1, n }) === n, 'T2 took stone');
    i += n;
  }
  logs(s, 'a', 'T2', 32);
  advance(s, 300);
  logs(s, 'a', 'T3', LINE1_STATIONS[2]!.bill[0]);
  for (let i = 0; i < 12; i++) need(act(s, 'a', 'rail.beamChop') === 1, 'the great tree chopped');
  need(act(s, 'a', 'rail.beamTake', { revision: beam(w).revision }) === 1, 'the beam taken');
  need(act(s, 'a', 'rail.beamDeposit', { revision: beam(w).revision, station: 'T3' }) === 1, 'T3 took the beam');
  advance(s, 600);
  return s;
}
/** Look only: the forge one log short of a bill, `a` carrying the log that pays it (`frame`: 23/24 of the frame's;
 * `lit`: 55/56, with the pack claimed off the frame's bill), so a look's deposit plays the live edge. */
export function railwayAtForgeLast(last: 'frame' | 'lit'): Seed {
  const s = railwayAtForgeBill();
  logs(s, 'a', 'F', (last === 'frame' ? LINE2_FORGE.bills[0] : LINE2_FORGE.logs) - 1);
  if (last === 'lit') need(act(s, 'a', 'rail.pack') === 1, 'the pack');
  need(account(s.w, 'a')!.carry > 0, 'a log on the back');
  need(invariant(s.w) === null, `railwayAtForgeLast ${last}: invariant`);
  return s;
}
/** Look and tests: the forge lit, the axe taken, Q1's logs and all but one rail in, and `a` carrying rails from
 * the rack (taken as `rails` would take them for the sixth), so a deposit plays the live edge that makes the Rail
 * yoke. */
export function railwayAtQ1Last(): Seed {
  const s = railwayAtForgeBill();
  logs(s, 'a', 'F', LINE2_FORGE.logs);
  // The proper axe is the lit forge's first made thing (railAxeAvailable, since the great beam pass, 7 November):
  // taken at its pedestal as the forge lights, as a player meets it. Until 18 November the seeds asked for it at
  // Station 3, refused, so every later seed lacked it; the works bot broke on that on 17 November, when the pedestal
  // moved onto the breaker's and the axe's "Open" took the target there.
  need(act(s, 'a', 'rail.axe') === 1, 'the proper axe taken at the lit forge');
  advance(s, LINE2_FORGE.turnTicks);
  logs(s, 'b', 'Q1', LINE2_STATIONS[0]!.bill[0]);
  rails(s, 'a', 'Q1', LINE2_STATIONS[0]!.bill[1] - 1);
  if (!account(s.w, 'a')!.rails) forgeTake(s, 'a');
  need(qjob(s.w, 0).start < 0, "Q1's bill still owed");
  need(invariant(s.w) === null, 'railwayAtQ1Last: invariant');
  return s;
}
/** railwayAtQ1Last and its last rail: Q1's bill in, its stretch laying. */
export function railwayAtQ1Funded(): Seed {
  const s = railwayAtQ1Last();
  rails(s, 'a', 'Q1', 1);
  need(qjob(s.w, 0).start >= 0, "Q1's bill in");
  return s;
}
/** Players `a` and `b`, at Q2 with nothing delivered there yet. */
export function railwayAtQ2(): Seed {
  const s = railwayAtQ1Funded(),
    w = s.w;
  // The Rail yoke is made as Q1's bill goes in and stands beside the forge rail rack: taken there, as a player meets
  // it (the axe lesson: a seed that skips a pickup breaks the bots past it). Every stage from Q2 on carries 16 rails.
  need(act(s, 'a', 'rail.yoke') === 1, 'the rail yoke');
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
    need(act(s, 'a', 'rail.depotTake') > 0, 'Q3 depot logs taken');
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
    // The route glides home from Needle Bell before the boiler, so a room has taken the glider by here: every seed built
    // on this base (the trains, the Works, the ring's) carries it, not only `glide-earned`.
    need(act(base, 'a', 'rail.glide') === 1, 'the glider taken');
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
      while (rail(w).trains < 0) advance(s, 1);
      // A fleet row (the greybox route) stays in the shed (phase 2) until its stage runs it.
      need(
        trains(w).every((r) => r.phase === 0 || r.phase === 2),
        'every train waiting',
      );
    }
  }
  if (stage === 'q6-stocked' || stage === 'q6-finishing' || stage === 'q6-done') {
    finishQ6(s, stage);
  }
  const broken = invariant(w);
  need(broken === null, `railwayAtTrains ${stage}: ${broken}`);
  return s;
}
/** The pack opened, then Q6's kit from its depot into its frame: logs 16 a back with the pack, rails 16 with the yoke,
 * a and b taking turns until the depot is empty. */
export function stockQ6(s: Seed) {
  const w = s.w;
  need(act(s, 'a', 'rail.pack') === 1, 'the pack');
  for (const kind of [0, 2])
    for (let guard = 0; kind ? rail(w).depotRails : rail(w).depot; guard++) {
      need(guard < 8, 'Q6 depot emptied');
      const pid = guard % 2 ? 'b' : 'a';
      const n = act(s, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake');
      need(n > 0, 'Q6 depot taken');
      need(act(s, pid, 'rail.deposit', { station: 'Q6', kind, n }) === n, 'Q6 took materials');
    }
}
/** The accepted Q6 kit sequence, also used by a town-first route before it enters the Works. */
export function finishQ6(s: Seed, stage: 'q6-stocked' | 'q6-finishing' | 'q6-done' = 'q6-done') {
  const w = s.w;
  let ticks = 0;
  while (rail(w).depot !== 32 || rail(w).depotRails !== 32) {
    need(ticks++ < 4000, 'kit unloaded at Far Head');
    advance(s, 1);
    // Rails conserved, among the rest of the load check.
    const broken = check(w);
    need(broken === null, `rails conserved: ${broken}`);
  }
  if (stage !== 'q6-stocked') {
    stockQ6(s);
    const total = layTicks(w, 5);
    advance(s, stage === 'q6-done' ? total : total - 450);
  }
}
