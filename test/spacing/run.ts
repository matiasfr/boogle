// Train-spacing harness, one worker (docs/plans/train-spacing.md, section 3). Scratch measurement only: no suite loads
// it (not a .test.ts), it touches no src file, and it runs only when called (test/spacing/sweep.ts spawns it):
//
//   node --import ./test/helpers/rail-no-audit.ts test/spacing/run.ts fuzz <stage> <hold> <ticks> <heavy|light> <seed0> <seed1>
//   node --import ./test/helpers/rail-no-audit.ts test/spacing/run.ts quiet <stage> <ticks> <seed>
//   node --import ./test/helpers/rail-no-audit.ts test/spacing/run.ts stages
//
// Each prints one JSON line per run. `fuzz` is the WAIT_BOUND fuzz of test/railway-trains.test.ts copied rand call for
// rand call (main's method: an ask on 5% of ticks, a rider ask on 3%, junk on 1%, a restore on 0.2%; light asks are
// main's FUZZ_LIGHT loop, one lever ask attempted every SPACING_LIGHT_MIN + [0, SPACING_LIGHT_SPAN) ticks, 200 + [0, 100)
// by default, no rider asks), so its worst and mean per seed equal the committed test's diagnostics for the same seed. On top it
// reads, never writes: headways at every line-2 platform each way, stand ticks past the dwell at the ends, and who
// serves each outstanding lever ask under the line's own rule and under the nearest-train rule (a pass, candidate A).
// `quiet` runs nothing asked and records the round trips, the wagon's arrivals, footing ticks, stone, fares and the
// world hash every 1,000 ticks. `stages` builds every seed stage and prints its tick and hash.
import { createHash } from 'node:crypto';
import { mulberry32 } from '../../src/sim/rng.ts';
import {
  RAIL_HALTS,
  RAIL_LINES,
  circuitAhead,
  circuitCm,
  circuitLen,
  trainPlaces,
} from '../../src/sim/railway-lines.ts';
import { TRAIN, TRAIN_PHASE, lineStages, trainAlong, trainDir } from '../../src/sim/railway-train.ts';
import * as trainsMod from '../../src/sim/railway-trains.ts';
import * as sysTrains from '../../src/sim/railway-sys-trains.ts';
import { LINE_SLOTS, cycleTicks, trainPose, trainSpacing } from '../../src/sim/railway-trains.ts';
import { line2Completed } from '../../src/sim/railway-queries-line2.ts';
import { trainStops } from '../../src/sim/railway-queries-trains.ts';
import { Aperture, Till, Town, Works } from '../../src/sim/railway-components.ts';
import { RAIL_TRAINS } from '../../src/sim/railway-lines.ts';
import {
  SEED_STAGES,
  act,
  buildSeedWorld,
  invariant,
  railTick,
  railwayAtTrains,
  restore,
  train,
  trains,
  unaudited,
  type Seed,
} from '../helpers/rail.ts';

const LINE2 = 1;
// SPACING_PASS=<cm>,<band>: set line 2's catalog `pass` (candidate A, docs/plans/train-spacing.md 2A) for this run,
// checked by trainPlaces as the catalog is; unset leaves the catalog as committed. A branch without A ignores it.
if (process.env.SPACING_PASS) {
  const [cm, band] = process.env.SPACING_PASS.split(',').map(Number) as [number, number];
  Object.assign(RAIL_LINES[LINE2]!, { pass: { cm, band } });
  for (const stops of lineStages(LINE2)) trainPlaces(LINE2, stops);
}
const haltId = (line: number, stop: number) => RAIL_HALTS.findIndex((h) => h.line === line && h.stop === stop);
const lever = (w: Seed, id: number, dir: number) => act(w, 'a', 'rail.call', { id, dir });
const num = (name: string, own: number) => {
  const v = process.env[name];
  return v === undefined || v === '' ? own : Number(v);
};
// Light asks: one attempt every 200 + [0, 100) ticks (20 to 30 s) at a uniformly picked halt and way, about 1 to 1.4
// accepted line-2 lever asks a minute (the designer's added run). 600 and 300 are main's FUZZ_LIGHT exactly.
const LIGHT_MIN = num('SPACING_LIGHT_MIN', 200),
  LIGHT_SPAN = num('SPACING_LIGHT_SPAN', 100);

/** trainServes as the line's rule has it (candidate A's branch passes the world's errand predicate, which opts the
 * pass in), and the nearest-train rule (no predicate: today's answer on every branch). */
type Serves = (...a: unknown[]) => number;
const serves = trainsMod.trainServes as unknown as Serves;
const errandOf = (sysTrains as Record<string, unknown>).trainErrand as
  ((w: Seed['w'], slot: number) => boolean) | undefined;

function fundQ6(w: Seed) {
  if (act(w, 'a', 'rail.pack') !== 1) throw new Error('fundQ6: pack');
  for (const kind of [0, 2])
    for (const pid of ['a', 'b']) {
      if (act(w, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake') !== 16) throw new Error('fundQ6: take');
      if (act(w, pid, 'rail.deposit', { station: 'Q6', kind, n: 16 }) !== 16) throw new Error('fundQ6: deposit');
    }
}
function start(stage: string, headPct: number) {
  const w = unaudited(stage === 'q6-stocked' ? railwayAtTrains('q6-stocked') : buildSeedWorld(stage as never));
  for (let k = 0; k < TRAIN.wakeTicks; k++) railTick(w.w, ++w.t, headPct);
  return w;
}
const row = (w: Seed, k: number) => train(w.w, k);
const along = (w: Seed, k: number) => trainAlong(row(w, k), RAIL_TRAINS[k]!.line, w.t);
/** The committed test's step: one rule tick, no pose jumps, the spacing invariants. */
function step(w: Seed, headPct: number) {
  const before = trains(w.w).map((_r, k) => along(w, k));
  railTick(w.w, ++w.t, headPct);
  trains(w.w).forEach((_r, k) => {
    if (Math.abs(along(w, k) - before[k]!) > TRAIN.speed + 1) throw new Error(`train ${k} jumps at tick ${w.t}`);
  });
  const broken = trainSpacing(
    (k) => train(w.w, k),
    (line) => trainStops(w.w, line),
    w.t,
  );
  if (broken) throw new Error(`${broken} at tick ${w.t}`);
}
const standingAt = (w: Seed, s: number, stop: number, dir: number) => {
  const r = row(w, s);
  return r.phase === TRAIN_PHASE.STAND && r.at === stop && trainDir(r) === dir;
};

/** Line-2 platform passages: a train's circuit position crossing a platform's point (halt, way) this tick. */
type Pass = { slot: number; stop: number; dir: number };
function passages(w: Seed, prev: Map<number, { c: number; len: number }>): Pass[] {
  const stops = trainStops(w.w, LINE2),
    len = circuitLen(stops),
    out: Pass[] = [];
  for (const slot of LINE_SLOTS[LINE2]!) {
    const c = trainPose(row(w, slot), LINE2, stops, w.t).c,
      was = prev.get(slot);
    prev.set(slot, { c, len });
    if (!was || was.len !== len) continue;
    const moved = circuitAhead(was.c, c, len);
    if (moved === 0 || moved > TRAIN.speed + 1) continue;
    for (let stop = 0; stop < stops.length; stop++)
      for (const dir of [1, -1]) {
        if ((stop === 0 && dir < 0) || (stop === stops.length - 1 && dir > 0)) continue;
        const at = circuitCm(stops, dir > 0 ? 0 : 1, stops[stop]!) % len,
          d = circuitAhead(was.c, at, len);
        if (d > 0 && d <= moved) out.push({ slot, stop, dir });
      }
  }
  return out;
}

export function fuzz(stage: string, seed: number, headPct: number, ticks: number, light: boolean) {
  let w = start(stage, headPct);
  const rand = mulberry32(seed);
  const packAt = Math.floor(rand() * Math.min(3000, ticks / 2));
  let pierAt = -1,
    restores = 0,
    nextAsk = w.t,
    accepted = 0,
    acceptedAll = 0;
  const asked = new Map<string, number>(),
    worst = new Map<string, { ticks: number; tick: number }>(),
    riderAsk = new Map<string, number>(),
    standSince = new Map<number, number>(),
    waits: { wait: number; key: string; tick: number; passed: number }[] = [],
    waitsAll: number[] = [], // every line's served lever waits
    unserved: number[] = [], // line 2's asks still waiting at the end, how long so far
    others: Record<string, [number, number, number, number]> = {}; // the other lines' waits by halt and way: n, sum, over 1,050, worst
  const other = (id: number, dir: number, wt: number) => {
    const h = RAIL_HALTS[id]!,
      p = (others[`${RAIL_LINES[h.line]!.name}: ${h.name} ${dir > 0 ? 'up' : 'down'}`] ??= [0, 0, 0, 0]);
    p[0]++;
    p[1] += wt;
    if (wt > 1050) p[2]++;
    p[3] = Math.max(p[3], wt);
  };
  let longest = { slot: -1, ticks: 0, at: -1, tick: 0 };
  // Per outstanding line-2 ask: the trains named under the nearest rule while it waited, the server under the line's
  // rule last tick (and how long), and the trains that ran through its platform its way.
  type Track = {
    base: Set<number>;
    cur: number;
    curSince: number;
    curDist: number;
    prevB: number;
    through: number[];
    passedAt: number;
    lampOut: number;
    forward: number;
  };
  const track = new Map<string, Track>();
  const head = new Map<string, { n: number; sum: number; sq: number; last: number }>();
  const prevC = new Map<number, { c: number; len: number }>();
  const endStand = new Map<number, number>(); // stop -> ticks stood past the dwell
  let laps = 0,
    tooClose = 0,
    passedBack = 0,
    twoPast = 0,
    lampOut = 0,
    lampForward = 0,
    lampBack = 0,
    askedN = 0;
  const passed: { extra: number; total: number }[] = [];
  const rows = (k: number) => train(w.w, k);
  const servedBy = (stop: number, dir: number, withRule: boolean) => {
    const stops = trainStops(w.w, LINE2);
    return withRule && errandOf
      ? serves(rows, LINE2, stops, stop, dir, w.t, (slot: number) => errandOf(w.w, slot))
      : serves(rows, LINE2, stops, stop, dir, w.t);
  };
  for (let k = 0; k < ticks; k++) {
    if (k === packAt && stage === 'q6-stocked') fundQ6(w);
    if (pierAt < 0 && line2Completed(w.w) >= 6) pierAt = w.t;
    const n2 = trainStops(w.w, LINE2).length;
    if (light ? w.t >= nextAsk : rand() < 0.05) {
      nextAsk = w.t + LIGHT_MIN + Math.floor(rand() * LIGHT_SPAN);
      const id = Math.floor(rand() * RAIL_HALTS.length),
        dir = rand() < 0.5 ? -1 : 1;
      const h = RAIL_HALTS[id]!;
      if (h.stop < trainStops(w.w, h.line).length && lever(w, id, dir)) {
        acceptedAll++;
        if (h.line === LINE2) accepted++;
        if (!asked.has(`${id}/${dir}`)) asked.set(`${id}/${dir}`, w.t);
      }
    }
    if (!light && rand() < 0.03) {
      const slot = LINE_SLOTS[LINE2]![Math.floor(rand() * 2)]!,
        stop = 1 + Math.floor(rand() * (n2 - 2));
      if (
        act(w, 'a', 'rail.call', { id: haltId(LINE2, stop), dir: trainDir(row(w, slot)), train: slot }) &&
        !riderAsk.has(`${slot}/${stop}`)
      )
        riderAsk.set(`${slot}/${stop}`, w.t);
    }
    if (rand() < 0.01) {
      const tr = [-1, 3, 99, 1.5, -0, Number.NaN, 2 ** 60, '1', null][Math.floor(rand() * 9)];
      act(w, 'a', 'rail.call', { id: Math.floor(rand() * 8) - 1, dir: rand() < 0.5 ? -1 : 2, train: tr } as never);
    }
    const phases = trains(w.w).map((r) => ({ phase: r.phase, at: r.at }));
    step(w, headPct);
    // Laps (departures from the Village) and stand ticks past the dwell at the ends.
    const stops2 = trainStops(w.w, LINE2);
    for (const slot of LINE_SLOTS[LINE2]!) {
      const r = row(w, slot),
        was = phases[slot]!;
      if (was.phase === TRAIN_PHASE.STAND && was.at === 0 && r.phase === TRAIN_PHASE.RUN) laps++;
      const end = r.at === 0 || r.at === stops2.length - 1;
      if (r.phase === TRAIN_PHASE.STAND && end && w.t >= r.depart + TRAIN.dwellTicks)
        endStand.set(r.at === 0 ? 0 : 1, (endStand.get(r.at === 0 ? 0 : 1) ?? 0) + 1);
    }
    // Headways and run-throughs at line-2 platforms.
    for (const p of passages(w, prevC)) {
      const key = `${p.stop}/${p.dir}`,
        h = head.get(key);
      if (h) {
        const g = w.t - h.last;
        h.n++;
        h.sum += g;
        h.sq += g * g;
        h.last = w.t;
      } else head.set(key, { n: 0, sum: 0, sq: 0, last: w.t });
      const id = haltId(LINE2, p.stop),
        t = track.get(`${id}/${p.dir}`);
      const r = row(w, p.slot),
        bound = r.to === p.stop; // arriving (at an end, either way): the pose reaches the stop a tick early
      if (t && !bound && !standingAt(w, p.slot, p.stop, p.dir) && r.phase === TRAIN_PHASE.RUN) {
        t.through.push(p.slot);
        if (t.base.has(p.slot) && t.passedAt < 0) t.passedAt = w.t;
      }
    }
    trains(w.w).forEach((r, slot) => {
      if (r.phase !== TRAIN_PHASE.STAND) return void standSince.delete(slot);
      if (!standSince.has(slot)) standSince.set(slot, w.t);
      const d = w.t - standSince.get(slot)!;
      if (RAIL_TRAINS[slot]!.line === LINE2 && d > longest.ticks) longest = { slot, ticks: d, at: r.at, tick: w.t };
    });
    for (const [key, since] of asked) {
      const [id, dir] = key.split('/').map(Number) as [number, number];
      const h = RAIL_HALTS[id]!;
      if (LINE_SLOTS[h.line]!.some((s) => standingAt(w, s, h.stop, dir))) {
        const wt = w.t - since;
        if (wt > (worst.get(key)?.ticks ?? -1)) worst.set(key, { ticks: wt, tick: w.t });
        waitsAll.push(wt);
        if (h.line !== LINE2) other(id, dir, wt);
        if (h.line === LINE2) {
          const t = track.get(key);
          let pass = 0;
          if (t) {
            const through = t.through.length;
            const back = t.passedAt >= 0;
            if (back) {
              passedBack++;
              pass = 1;
              passed.push({ extra: w.t - t.passedAt, total: wt });
            }
            if (through > (back ? 1 : 0)) tooClose++;
            if (through >= 2) twoPast++;
            lampOut += t.lampOut;
            lampForward += t.forward;
            track.delete(key);
          }
          waits.push({ wait: wt, key, tick: w.t, passed: pass });
        }
        asked.delete(key);
      } else if (h.line === LINE2) {
        // Who is named now, under each rule.
        let t = track.get(key);
        if (!t) {
          askedN++;
          t = {
            base: new Set(),
            cur: -1,
            curSince: w.t,
            curDist: 0,
            prevB: -1,
            through: [],
            passedAt: -1,
            lampOut: 0,
            forward: 0,
          };
          track.set(key, t);
        }
        const b = servedBy(h.stop, dir, false),
          a = servedBy(h.stop, dir, true);
        if (b >= 0) t.base.add(b);
        const stops = trainStops(w.w, LINE2),
          len = circuitLen(stops),
          at = circuitCm(stops, dir > 0 ? 0 : 1, stops[h.stop]!) % len;
        const dist = (s: number) => circuitAhead(trainPose(row(w, s), LINE2, stops, w.t).c, at, len);
        if (a !== t.cur) {
          if (t.cur >= 0) {
            // The lamp left train t.cur: forward (to a train between it and the platform; t.cur has not run past
            // it) or back; out while it could brake (still named by the nearest rule) after 10 ticks lit.
            // Only moves the nearest rule did not make too (that rule's own flicker at an end is main's).
            const own = a !== b || t.cur !== t.prevB;
            if (own && a >= 0 && dist(t.cur) <= t.curDist && dist(a) < dist(t.cur)) t.forward++;
            else if (own) lampBack++;
            if (own && w.t - t.curSince >= 10 && b === t.cur) t.lampOut++;
          }
          t.cur = a;
          t.curSince = w.t;
        }
        if (t.cur >= 0) t.curDist = dist(t.cur);
        t.prevB = b;
      }
    }
    for (const [key, since] of riderAsk) {
      const [slot, stop] = key.split('/').map(Number) as [number, number];
      const r = row(w, slot);
      if (r.phase === TRAIN_PHASE.STAND && r.at === stop) riderAsk.delete(key);
      else if (r.at === 0 || r.at === trainStops(w.w, LINE2).length - 1) riderAsk.delete(key);
      void since;
    }
    if (k % 50 === 0) {
      const broken = invariant(w.w);
      if (broken) throw new Error(`invariant at ${w.t}: ${broken}`);
    }
    if (rand() < 0.002) {
      w = unaudited({ w: restore(w.w), t: w.t });
      restores++;
    }
  }
  for (const [key, since] of asked) {
    const wt = w.t - since;
    if (wt > (worst.get(key)?.ticks ?? -1)) worst.set(key, { ticks: wt, tick: w.t });
    if (RAIL_HALTS[Number(key.split('/')[0])]!.line === LINE2) unserved.push(wt);
    else other(Number(key.split('/')[0]), Number(key.split('/')[1]), wt);
  }
  let top = { key: '', ticks: -1, tick: 0, open: false };
  for (const [key, v] of worst)
    if (RAIL_HALTS[Number(key.split('/')[0])]!.line === LINE2 && v.ticks > top.ticks)
      top = { key, ticks: v.ticks, tick: v.tick, open: asked.has(key) };
  const name = (key: string) => {
    const [id, dir] = key.split('/').map(Number) as [number, number];
    return `${RAIL_HALTS[id]!.name} ${dir > 0 ? 'up' : 'down'}`;
  };
  return {
    kind: 'fuzz',
    stage,
    seed,
    headPct,
    ticks,
    light,
    pierAt,
    restores,
    accepted,
    acceptedAll,
    waits: waits.map((x) => x.wait),
    waitsAll,
    unserved,
    others,
    worst: { ticks: top.ticks, at: top.key ? name(top.key) : '', tick: top.tick, open: top.open },
    longest,
    headway: Object.fromEntries(
      [...head].map(([k, v]) => {
        const [stop, dir] = k.split('/').map(Number) as [number, number];
        return [
          `${RAIL_HALTS[haltId(LINE2, stop)]!.name} ${dir > 0 ? 'up' : 'down'}`,
          { n: v.n, sum: v.sum, sq: v.sq },
        ];
      }),
    ),
    endStand: Object.fromEntries(endStand),
    laps,
    asks: askedN,
    tooClose,
    passedBack,
    twoPast,
    lampOut,
    lampForward,
    lampBack,
    passed,
  };
}

/** Nothing asked: round trips, the wagon, footings, stone, fares, and the hash every 1,000 ticks. */
export function quiet(stage: string, seed: number, ticks: number, headPct = 75) {
  const w = start(stage, headPct);
  const rand = mulberry32(seed);
  const packAt = Math.floor(rand() * Math.min(3000, ticks / 2));
  const dep = new Map<number, { t: number; cycle: number }>();
  const ride: number[] = [],
    lap: number[] = [],
    wagon: string[] = [],
    footing: string[] = [],
    hashes: string[] = [];
  const sum = <T>(c: Parameters<typeof w.w.ids>[0], f: (r: T) => number) =>
    [...w.w.ids(c)].reduce((a, id) => a + f(w.w.get(c, id) as T), 0);
  const stone0 = sum<{ stone: number }>(Town, (r) => r.stone),
    fares0 = sum<{ landed: number }>(Till, (r) => r.landed);
  // Footing deliveries and placings: the Works rack, the pier rack and set, the railhead rack and set.
  const footNow = () =>
    [
      sum<{ rack: number }>(Works, (r) => r.rack),
      sum<{ pierRack: number }>(Works, (r) => r.pierRack),
      sum<{ pierSet: number }>(Works, (r) => r.pierSet),
      sum<{ rack: number }>(Aperture, (r) => r.rack),
      sum<{ set: number }>(Aperture, (r) => r.set),
    ].join('/');
  let foot = footNow();
  const lastDep = new Map<number, number>();
  for (let k = 0; k < ticks; k++) {
    if (k === packAt && stage === 'q6-stocked') fundQ6(w);
    const before = trains(w.w).map((r) => ({ phase: r.phase, at: r.at, wagon: r.wagon }));
    step(w, headPct);
    const stops = trainStops(w.w, LINE2);
    for (const slot of LINE_SLOTS[LINE2]!) {
      const r = row(w, slot),
        was = before[slot]!;
      if (was.phase === TRAIN_PHASE.STAND && was.at === 0 && r.phase === TRAIN_PHASE.RUN) {
        const prev = lastDep.get(slot);
        const cyc = cycleTicks(LINE2, stops);
        if (prev !== undefined) lap.push((w.t - prev) / dep.get(slot)!.cycle);
        lastDep.set(slot, w.t);
        dep.set(slot, { t: w.t, cycle: cyc });
      }
      if (was.phase === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND) {
        if (r.at === 0 && dep.has(slot)) ride.push((w.t - dep.get(slot)!.t) / dep.get(slot)!.cycle);
        if (r.wagon) wagon.push(`${w.t}@${r.at}`);
      }
    }
    const f = footNow();
    if (f !== foot) footing.push(`${w.t}:${f}`);
    foot = f;
    if ((k + 1) % 1000 === 0) hashes.push(String(w.w.hash()));
  }
  return {
    kind: 'quiet',
    stage,
    seed,
    ticks,
    ride,
    lap,
    wagon,
    footing,
    stone: sum<{ stone: number }>(Town, (r) => r.stone) - stone0,
    fares: sum<{ landed: number }>(Till, (r) => r.landed) - fares0,
    hashes,
  };
}

export function stages() {
  return SEED_STAGES.map((stage) => {
    const s = buildSeedWorld(stage);
    return {
      stage,
      t: s.t,
      hash: String(s.w.hash()),
      snap: createHash('sha256').update(JSON.stringify(s.w.snapshot())).digest('hex').slice(0, 16),
    };
  });
}

const [cmd, ...a] = process.argv.slice(2);
if (cmd === 'fuzz') {
  const [stage, hold, ticks, rate, s0, s1] = a as [string, string, string, string, string, string];
  for (let seed = Number.parseInt(s0, 16); seed <= Number.parseInt(s1, 16); seed++) {
    try {
      console.log(JSON.stringify(fuzz(stage, seed, Number(hold), Number(ticks), rate === 'light')));
    } catch (e) {
      console.log(JSON.stringify({ kind: 'error', stage, seed, hold: Number(hold), rate, error: String(e) }));
    }
  }
} else if (cmd === 'quiet') {
  const [stage, ticks, seed] = a as [string, string, string];
  console.log(JSON.stringify(quiet(stage, Number.parseInt(seed, 16), Number(ticks))));
} else if (cmd === 'stages') console.log(JSON.stringify({ kind: 'stages', stages: stages() }));
