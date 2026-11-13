// Train-spacing harness on the grown line (docs/plans/train-spacing.md, section 3: greybox leg 1, line 2 to High
// Gorge). Scratch measurement only: no suite loads it, it touches no src file, and it runs only when called
// (test/spacing/leg1-sweep.ts spawns it):
//
//   node --import ./test/helpers/rail-no-audit.ts test/spacing/leg1.ts fuzz <where> <hold> <ticks> <heavy|light> <seeds>
//   node --import ./test/helpers/rail-no-audit.ts test/spacing/leg1.ts quiet <where> <ticks>
//
// <where>: stage0..stage4 (round 3's stage worlds: the rivet, then 1 to 4 sections laid from it and settled 3,000
// ticks), settled (stage 4 and 1,000 ticks more: 4,000 after the Gorge opens) or whole (from ring-joined, the room
// stocking the frame every 30 ticks: the whole-leg fuzz). <seeds>: hex, comma separated or a range a-b.
//
// `fuzz` at a stage or settled is test/railway-route-rules.test.ts's leverWaits copied rand call for rand call (asks
// at 5% of ticks from askPool, rider asks on 3%, junk on 1%, a restore on 0.2%; the waits are line 2's served waits
// plus each ask still waiting at the end), so its worst and mean per seed equal the gate test's diagnostics; `whole`
// is that file's leg fuzz the same way. Light asks: one attempt every SPACING_LIGHT_MIN + [0, SPACING_LIGHT_SPAN)
// ticks (200 + [0, 100)), no rider asks, as test/spacing/run.ts. On top it reads, never writes: headways at every
// line-2 platform each way, stand ticks past the dwell at every halt, the longest stand, the end-to-end rider's trip
// each way, and every wait with its ask tick. `quiet` runs nothing asked (whole: fed every tick as gate 14) and records
// laps over non-stop, the wagon's arrivals, footing and kit ticks and the world hash every 1,000 ticks.
import './catalog.ts';
import { mulberry32 } from '../../src/sim/rng.ts';
import type { World } from '../../src/ecs/index.ts';
import { Account, Aperture, Till, Town, Works } from '../../src/sim/railway-components.ts';
import { LINE2, RAIL_HALTS, RAIL_LINES, circuitAhead, circuitCm, circuitLen } from '../../src/sim/railway-lines.ts';
import { RAIL_LEGS } from '../../src/sim/railway-route.ts';
import { TRAIN, TRAIN_PHASE, trainDir, trainPassesBy } from '../../src/sim/railway-train.ts';
import {
  LINE_SLOTS,
  TRAIN_HOLD,
  cycleTicks,
  servingSlots,
  trainPose,
  trainSpacing,
} from '../../src/sim/railway-trains.ts';
import { railTick } from '../../src/sim/railway-systems.ts';
import { train, trains } from '../../src/sim/railway-rows.ts';
import { stopsOf } from '../../src/sim/railway-queries.ts';
import { legRow } from '../../src/sim/railway-queries-route.ts';
import { advance, apply, buildSeedWorld, invariant, restore, unaudited, type Seed } from '../helpers/rail.ts';

const STACK = 0;
const N = RAIL_LEGS[STACK]!.sections.length;
const haltId = (line: number, stop: number) => RAIL_HALTS.findIndex((h) => h.line === line && h.stop === stop);
const num = (name: string, own: number) => {
  const v = process.env[name];
  return v === undefined || v === '' ? own : Number(v);
};
const LIGHT_MIN = num('SPACING_LIGHT_MIN', 200),
  LIGHT_SPAN = num('SPACING_LIGHT_SPAN', 100);
const copy = (s: Seed): Seed => ({ w: restore(s.w), t: s.t });
const JOINED = buildSeedWorld('ring-joined');

// ---------------------------------------------------------------- the route test's drivers, copied
function stock(s: Seed, k = STACK) {
  for (const pid of ['a', 'b'])
    for (const [o, f] of [
      ['rail.depotTake', {}],
      ['rail.depotRailTake', {}],
      ['rail.legStock', { leg: k }],
    ] as const) {
      const a = s.w.get(Account, s.w.lookup(Account, pid)!)!;
      apply(s.w, pid, { op: o, epoch: a.epoch, request: a.request + 1, ...f } as never, s.t);
    }
}
function ask(s: Seed, f: Record<string, unknown>) {
  const a = s.w.get(Account, s.w.lookup(Account, 'a')!)!;
  return apply(s.w, 'a', { op: 'rail.call', epoch: a.epoch, request: a.request + 1, ...f } as never, s.t).accepted;
}
function askPool(w: World) {
  return RAIL_HALTS.flatMap((h, id) => {
    const n = stopsOf(w, h.line).length;
    return h.stop < n && !(trainPassesBy(h.line, h.stop, 1, n) && trainPassesBy(h.line, h.stop, -1, n)) ? [id] : [];
  });
}
function playTo(s: Seed, laid: number) {
  for (let guard = 0; legRow(s.w, STACK).laid < laid; guard++) {
    if (guard >= 9000) throw new Error(`the leg never reaches ${laid} laid`);
    if (legRow(s.w, STACK).start < 0) stock(s);
    advance(s, 1);
  }
  const broken = invariant(s.w);
  if (broken) throw new Error(`${laid} laid: ${broken}`);
}
let STAGES: Seed[] | undefined;
function stageWorlds(): Seed[] {
  if (STAGES) return STAGES;
  const s = unaudited(copy(JOINED));
  const out = [unaudited(copy(JOINED))];
  for (let laid = 1; laid <= N; laid++) {
    playTo(s, laid);
    const u = unaudited({ w: restore(s.w), t: s.t });
    advance(u, 3000);
    out.push(u);
  }
  return (STAGES = out);
}
// The Ring Island hold (TRAIN_HOLD, the defaults railTick runs with, the room's railTrainHoldCap and railTrainHoldPct):
// SPACING_HOLD=<cap>,<pct> sets it for the base worlds and the run (0,0 is off); SPACING_HOLD_LATE=1 builds the base
// worlds with it off and sets it for the run alone (a candidate judged from the hold-off arrival state).
const HOLD = { ...TRAIN_HOLD };
if (process.env.SPACING_HOLD) {
  const [cap, pct] = process.env.SPACING_HOLD.split(',').map(Number) as [number, number];
  Object.assign(TRAIN_HOLD, { cap, pct });
  Object.assign(HOLD, { cap, pct });
}
const LATE = process.env.SPACING_HOLD_LATE === '1';
function base(where: string): Seed {
  if (LATE) Object.assign(TRAIN_HOLD, { cap: 0, pct: 0 });
  try {
    return base0(where);
  } finally {
    Object.assign(TRAIN_HOLD, HOLD);
  }
}
function base0(where: string): Seed {
  if (where === 'whole') return unaudited(copy(JOINED));
  const st = stageWorlds();
  if (where === 'settled') {
    const settled = unaudited({ w: restore(st[N]!.w), t: st[N]!.t });
    advance(settled, 1000);
    return settled;
  }
  const k = Number(where.replace('stage', ''));
  if (!(k >= 0 && k <= N)) throw new Error(`where: ${where}`);
  return st[k]!;
}

// ---------------------------------------------------------------- what is read on top
const name = (stop: number, dir: number) => `${RAIL_HALTS[haltId(LINE2, stop)]!.name} ${dir > 0 ? 'up' : 'down'}`;
/** Line-2 platform passages this tick: a serving train's circuit position crossing a platform's point (halt, way). */
function passages(w: World, t: number, prev: Map<number, { c: number; len: number }>) {
  const stops = stopsOf(w, LINE2),
    len = circuitLen(stops),
    out: { slot: number; stop: number; dir: number }[] = [];
  for (const slot of servingSlots((j) => train(w, j), LINE2)) {
    const c = trainPose(train(w, slot), LINE2, stops, t).c,
      was = prev.get(slot);
    prev.set(slot, { c, len });
    if (!was || was.len !== len) continue;
    const moved = circuitAhead(was.c, c, len);
    if (moved === 0 || moved > TRAIN.speed + 1) continue;
    for (let stop = 0; stop < stops.length; stop++)
      for (const dir of [1, -1]) {
        if ((stop === 0 && dir < 0) || (stop === stops.length - 1 && dir > 0)) continue;
        if (trainPassesBy(LINE2, stop, dir, stops.length)) continue;
        const at = circuitCm(stops, dir > 0 ? 0 : 1, stops[stop]!) % len,
          d = circuitAhead(was.c, at, len);
        if (d > 0 && d <= moved) out.push({ slot, stop, dir });
      }
  }
  return out;
}

const OUTWARD = new Set(['Village, line 2', 'Quarry', 'Far Head', 'Railhead']);
const GORGE = RAIL_LINES[LINE2]!.halts.findIndex((h) => h.name === 'High Gorge');
/** The serving trains' circuit gaps (each to the train ahead), in circuit order from the Village, and their CV. */
export function gapsOf(s: Seed) {
  const stops = stopsOf(s.w, LINE2),
    len = circuitLen(stops);
  const cs = servingSlots((j) => train(s.w, j), LINE2)
    .map((j) => trainPose(train(s.w, j), LINE2, stops, s.t).c)
    .sort((x, y) => x - y);
  const gaps = cs.map((c, j) => circuitAhead(c, cs[(j + 1) % cs.length]!, len) || (cs.length === 1 ? len : 0));
  const m = len / Math.max(1, cs.length),
    sd = Math.sqrt(gaps.reduce((a, g) => a + (g - m) ** 2, 0) / Math.max(1, gaps.length));
  return { gaps, cv: Number((sd / m).toFixed(3)) };
}
export function fuzz(where: string, seed: number, headPct: number, ticks: number, light: boolean) {
  const b = base(where),
    whole = where === 'whole';
  let s = unaudited({ w: restore(b.w), t: b.t });
  const t0 = b.t;
  const journeys: { asked: number; slot: number; from: string; done: number }[] = [];
  const rand = mulberry32(seed),
    asked = new Map<string, number>(),
    waits: { v: number; at: string; asked: number; served: number }[] = [];
  const note = (id: number, dir: number, since: number, served: number | null) =>
    waits.push({
      v: (served ?? s.t) - since,
      at: name(RAIL_HALTS[id]!.stop, dir),
      asked: since - t0,
      served: served === null ? -1 : served - t0,
    });
  const head = new Map<string, { n: number; sum: number; sq: number; last: number }>(),
    prevC = new Map<number, { c: number; len: number }>(),
    stand = new Map<string, number>(), // halt name -> ticks stood past the dwell (any halt)
    standSince = new Map<number, number>(),
    standAt = new Map<number, string>(), // slot -> where its current stand is (halt name or 'signal')
    longStands: { ticks: number; at: string }[] = [], // every stand (dwell included) over 600 ticks, by place
    pastBy = new Map<string, number>(), // halt name -> the longest stand past the dwell there, from `arrived`
    leftEnd = new Map<number, { t: number; end: number }>(),
    trips: { up: number[]; down: number[] } = { up: [], down: [] };
  let midPast = { ticks: 0, at: '', tick: 0 };
  let longest = { ticks: 0, at: '', tick: 0 },
    nextAsk = s.t,
    gorgeAt = -1,
    restores = 0,
    laps = 0;
  for (let k = 0; k < ticks; k++) {
    if (whole && k % 30 === 0) stock(s);
    const n2 = stopsOf(s.w, LINE2).length;
    if (light ? s.t >= nextAsk : rand() < 0.05) {
      if (light) nextAsk = s.t + LIGHT_MIN + Math.floor(rand() * LIGHT_SPAN);
      const id = askPool(s.w)[Math.floor(rand() * askPool(s.w).length)]!,
        dir = rand() < 0.5 ? -1 : 1;
      const h = RAIL_HALTS[id]!;
      if (h.stop < stopsOf(s.w, h.line).length && ask(s, { id, dir }) && !asked.has(`${id}/${dir}`))
        asked.set(`${id}/${dir}`, s.t);
    }
    if (!light && rand() < 0.03 && n2 > 2) {
      const serving = servingSlots((j) => train(s.w, j), LINE2);
      const slot = serving[Math.floor(rand() * serving.length)]!,
        stop = 1 + Math.floor(rand() * (n2 - 2));
      ask(s, { id: haltId(LINE2, stop), dir: trainDir(train(s.w, slot)), train: slot });
    }
    if (rand() < 0.01) {
      const tr = [-1, 5, 99, 1.5, -0, Number.NaN, 2 ** 60, '1', null][Math.floor(rand() * 9)];
      ask(s, { id: Math.floor(rand() * 12) - 1, dir: rand() < 0.5 ? -1 : 2, train: tr } as never);
    }
    const before = trains(s.w).map((r) => ({ phase: r.phase, at: r.at }));
    railTick(s.w, ++s.t, headPct);
    if (gorgeAt < 0 && legRow(s.w, STACK).laid === N) gorgeAt = s.t - t0;
    const stops = stopsOf(s.w, LINE2),
      last = stops.length - 1;
    // Stands past the dwell by halt, the longest stand, laps and the end-to-end trip each way.
    for (const slot of servingSlots((j) => train(s.w, j), LINE2)) {
      const r = train(s.w, slot),
        was = before[slot]!;
      if (r.phase === TRAIN_PHASE.STAND && r.at >= 0 && s.t >= r.depart + TRAIN.dwellTicks) {
        const key = RAIL_HALTS[haltId(LINE2, r.at)]!.name;
        stand.set(key, (stand.get(key) ?? 0) + 1);
        // The longest stand past the dwell at a middle halt (Ring Island's hold: its cap runs from `arrived`).
        const past = s.t - r.arrived - TRAIN.dwellTicks;
        if (past > (pastBy.get(key) ?? 0)) pastBy.set(key, past);
        if (r.at > 0 && r.at < last && s.t - r.arrived - TRAIN.dwellTicks > midPast.ticks)
          midPast = { ticks: s.t - r.arrived - TRAIN.dwellTicks, at: key, tick: s.t - t0 };
      }
      if (was.phase === TRAIN_PHASE.STAND && r.phase === TRAIN_PHASE.RUN && (was.at === 0 || was.at === last)) {
        if (was.at === 0) laps++;
        leftEnd.set(slot, { t: s.t, end: was.at });
      }
      if (was.phase === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND && (r.at === 0 || r.at === last)) {
        const l = leftEnd.get(slot);
        if (l && l.end !== r.at) (r.at === last ? trips.up : trips.down).push(s.t - l.t);
        leftEnd.delete(slot);
      }
      if (r.phase !== TRAIN_PHASE.STAND) {
        const since = standSince.get(slot);
        if (since !== undefined && s.t - 1 - since > 600)
          longStands.push({ ticks: s.t - 1 - since, at: standAt.get(slot)! });
        standSince.delete(slot);
      } else {
        if (!standSince.has(slot)) {
          standSince.set(slot, s.t);
          standAt.set(slot, r.at >= 0 ? RAIL_HALTS[haltId(LINE2, r.at)]!.name : 'signal');
        }
        const d = s.t - standSince.get(slot)!;
        if (d > longest.ticks)
          longest = { ticks: d, at: r.at >= 0 ? RAIL_HALTS[haltId(LINE2, r.at)]!.name : 'signal', tick: s.t - t0 };
      }
    }
    for (const p of passages(s.w, s.t, prevC)) {
      const key = name(p.stop, p.dir),
        h = head.get(key);
      if (h) {
        const g = s.t - h.last;
        h.n++;
        h.sum += g;
        h.sq += g * g;
        h.last = s.t;
      } else head.set(key, { n: 0, sum: 0, sq: 0, last: s.t });
    }
    for (const [key, since] of asked) {
      const [id, dir] = key.split('/').map(Number) as [number, number];
      const h = RAIL_HALTS[id]!;
      if (askPool(s.w).indexOf(id) < 0) {
        asked.delete(key); // withdrawn: its head closed behind
        continue;
      }
      const there = LINE_SLOTS[h.line]!.some((j) => {
        const r = train(s.w, j);
        return r.phase === TRAIN_PHASE.STAND && r.at === h.stop && trainDir(r) === dir;
      });
      if (there) {
        if (h.line === LINE2) note(id, dir, since, s.t);
        // The Gorge-bound journey (short-turn review, E): an outward lever pull at the Village, the Quarry, Far Head or
        // the Railhead with High Gorge open, on the first train that stands there that way, to it standing at the Gorge.
        const n = stopsOf(s.w, LINE2).length;
        if (h.line === LINE2 && dir > 0 && OUTWARD.has(h.name) && n === GORGE + 1) {
          const j = LINE_SLOTS[LINE2]!.find((q) => {
            const r = train(s.w, q);
            return r.phase === TRAIN_PHASE.STAND && r.at === h.stop && trainDir(r) === dir;
          })!;
          journeys.push({ asked: since, slot: j, from: h.name, done: -1 });
        }
        asked.delete(key);
      }
    }
    for (const jr of journeys)
      if (jr.done < 0) {
        const r = train(s.w, jr.slot);
        if (r.phase === TRAIN_PHASE.STAND && r.at === GORGE) jr.done = s.t - jr.asked;
      }
    if (k % 10 === 0) {
      const broken = trainSpacing(
        (j) => train(s.w, j),
        (l) => stopsOf(s.w, l),
        s.t,
      );
      if (broken) throw new Error(`spacing at ${s.t}: ${broken}`);
    }
    if (k % 250 === 0) {
      const broken = invariant(s.w);
      if (broken) throw new Error(`invariant at ${s.t}: ${broken}`);
    }
    if (rand() < 0.002) {
      s = unaudited({ w: restore(s.w), t: s.t });
      restores++;
    }
  }
  for (const [key, since] of asked) {
    const [id, dir] = key.split('/').map(Number) as [number, number];
    if (RAIL_HALTS[id]!.line === LINE2) note(id, dir, since, null);
  }
  for (const [slot, since] of standSince)
    if (s.t - since > 600) longStands.push({ ticks: s.t - since, at: standAt.get(slot)! });
  const broken = invariant(s.w);
  if (broken) throw new Error(`invariant at the end: ${broken}`);
  const v = waits.map((x) => x.v);
  const plat: Record<string, [number, number, number, number]> = {}; // n, sum, over 1,050, worst
  for (const x of waits) {
    const p = (plat[x.at] ??= [0, 0, 0, 0]);
    p[0]++;
    p[1] += x.v;
    if (x.v > 1050) p[2]++;
    p[3] = Math.max(p[3], x.v);
  }
  return {
    kind: 'fuzz',
    where,
    seed,
    headPct,
    ticks,
    light,
    restores,
    gorgeAt,
    laid: legRow(s.w, STACK).laid,
    worst: Math.max(0, ...v),
    mean: Math.round(v.reduce((a, c) => a + c, 0) / Math.max(1, v.length)),
    waits: v,
    long: waits.filter((x) => x.v > 1050),
    headway: Object.fromEntries([...head].map(([k, h]) => [k, { n: h.n, sum: h.sum, sq: h.sq }])),
    stand: Object.fromEntries(stand),
    laps,
    longest,
    trips,
    plat,
    midPast,
    pastBy: Object.fromEntries(pastBy),
    longStands,
    hold: { ...TRAIN_HOLD, late: LATE },
    railheadUp: waits.filter((x) => x.at === 'Railhead up').map((x) => x.v),
    journeys: journeys.filter((j) => j.done >= 0).map((j) => j.done),
    journeysOpen: journeys.filter((j) => j.done < 0).length,
    startGaps: gapsOf(b),
  };
}

/** Nothing asked: the laps over non-stop, the wagon's arrivals, footing and kit ticks, the hash every 1,000 ticks. */
export function quiet(where: string, ticks: number, headPct = 75) {
  const b = base(where),
    whole = where === 'whole';
  const s = unaudited({ w: restore(b.w), t: b.t }),
    t0 = b.t;
  const sum = (c: Parameters<World['ids']>[0], f: (r: never) => number) =>
    [...s.w.ids(c)].reduce((a, id) => a + f(s.w.get(c, id) as never), 0);
  const footNow = () =>
    [
      sum(Works, (r: { rack: number }) => r.rack),
      sum(Works, (r: { pierRack: number }) => r.pierRack),
      sum(Works, (r: { pierSet: number }) => r.pierSet),
      sum(Aperture, (r: { rack: number }) => r.rack),
      sum(Aperture, (r: { set: number }) => r.set),
    ].join('/');
  const kitNow = () => {
    const g = legRow(s.w, STACK);
    return `${g.laid}/${g.loadedLogs}/${g.loadedRails}/${g.logs}/${g.rails}/${g.start}`;
  };
  let foot = footNow(),
    kit = kitNow();
  const stone0 = sum(Town, (r: { stone: number }) => r.stone),
    fares0 = sum(Till, (r: { landed: number }) => r.landed);
  const wagon: string[] = [],
    footing: string[] = [],
    kits: string[] = [],
    hashes: string[] = [],
    left: number[] = [];
  const slot0 = LINE_SLOTS[LINE2]![0]!;
  let laps: number[] = [],
    stopsLen = stopsOf(s.w, LINE2).length;
  for (let k = 0; k < ticks; k++) {
    if (whole && legRow(s.w, STACK).start < 0 && legRow(s.w, STACK).laid < N) stock(s);
    const before = trains(s.w).map((r) => ({ phase: r.phase, at: r.at }));
    railTick(s.w, ++s.t, headPct);
    const stops = stopsOf(s.w, LINE2);
    if (stops.length !== stopsLen) [left.length, stopsLen] = [0, stops.length];
    for (const slot of servingSlots((j) => train(s.w, j), LINE2)) {
      const r = train(s.w, slot),
        was = before[slot]!;
      if (slot === slot0 && was.phase === TRAIN_PHASE.STAND && was.at === 0 && r.phase === TRAIN_PHASE.RUN) {
        left.push(s.t);
        if (left.length >= 2) laps.push((s.t - left.at(-2)!) / cycleTicks(LINE2, stops));
      }
      if (was.phase === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND && r.wagon) wagon.push(`${s.t - t0}@${r.at}`);
    }
    const f = footNow();
    if (f !== foot) footing.push(`${s.t - t0}:${f}`);
    foot = f;
    const g = kitNow();
    if (g !== kit) kits.push(`${s.t - t0}:${g}`);
    kit = g;
    if ((k + 1) % 1000 === 0) hashes.push(String(s.w.hash()));
  }
  laps = laps.map((x) => Number(x.toFixed(3)));
  return {
    kind: 'quiet',
    where,
    headPct,
    ticks,
    laps,
    wagon,
    footing,
    kits,
    hashes,
    stone: sum(Town, (r: { stone: number }) => r.stone) - stone0,
    fares: sum(Till, (r: { landed: number }) => r.landed) - fares0,
  };
}

/** Nothing asked from a place: the gaps' CV every `every` ticks and the ticks each end held a train past its dwell
 * (the headway hold and the balanced hold), with the trains' halts, so stage 4 can be traced into settled. */
export function gapsTrace(where: string, ticks: number, every: number) {
  const s = unaudited({ w: restore(base(where).w), t: base(where).t });
  const out: { t: number; cv: number; gaps: number[]; hold: Record<string, number>; at: string[] }[] = [];
  let hold: Record<string, number> = {};
  for (let k = 0; k <= ticks; k++) {
    if (k % every === 0) {
      const g = gapsOf(s);
      const at = servingSlots((j) => train(s.w, j), LINE2).map((j) => {
        const r = train(s.w, j);
        return r.phase === TRAIN_PHASE.STAND && r.at >= 0 ? `${RAIL_HALTS[haltId(LINE2, r.at)]!.name}` : `run>${r.to}`;
      });
      out.push({ t: k, cv: g.cv, gaps: g.gaps, hold, at });
      hold = {};
    }
    if (k === ticks) break;
    railTick(s.w, ++s.t);
    const last = stopsOf(s.w, LINE2).length - 1;
    for (const j of servingSlots((q) => train(s.w, q), LINE2)) {
      const r = train(s.w, j);
      if (r.phase === TRAIN_PHASE.STAND && (r.at === 0 || r.at === last) && s.t >= r.depart + TRAIN.dwellTicks) {
        const key = r.at === 0 ? 'Village' : 'far end';
        hold[key] = (hold[key] ?? 0) + 1;
      }
    }
  }
  return { kind: 'gaps', where, out };
}
const seedsOf = (spec: string) =>
  spec.includes('-')
    ? (() => {
        const [a, b] = spec.split('-').map((h) => Number.parseInt(h, 16)) as [number, number];
        return Array.from({ length: b - a + 1 }, (_v, j) => a + j);
      })()
    : spec.split(',').map((h) => Number.parseInt(h, 16));
const [cmd, ...a] = process.argv.slice(2);
if (cmd === 'fuzz') {
  const [where, hold, ticks, rate, seeds] = a as [string, string, string, string, string];
  for (const seed of seedsOf(seeds)) {
    try {
      console.log(JSON.stringify(fuzz(where, seed, Number(hold), Number(ticks), rate === 'light')));
    } catch (e) {
      console.log(JSON.stringify({ kind: 'error', where, seed, hold: Number(hold), rate, error: String(e) }));
    }
  }
} else if (cmd === 'gaps') {
  const [where, ticks, every] = a as [string, string, string];
  console.log(JSON.stringify(gapsTrace(where, Number(ticks), Number(every))));
} else if (cmd === 'quiet') {
  const [where, ticks, hold] = a as [string, string, string | undefined];
  console.log(JSON.stringify(quiet(where, Number(ticks), hold === undefined ? 75 : Number(hold))));
}
