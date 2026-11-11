// Review of ring/r3a-rules (R3a-1): the branch's train rules against main's, frozen in test/helpers/main-rail/, on the
// live catalog. Both lines, every stage, long random ask streams (normal, every lever every tick), holds at 0, 75 and
// 100%, the Q6 opening at every tick offset: every train row and line row compared each tick, and every query the
// rules expose (stops, places, blocks, legs, braking, who serves, what a rider is offered, the planned leg, spacing,
// the load check on random corrupt rows). FUZZ_TICKS lengthens the runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/sim/rng.ts';
import * as BL from '../src/sim/railway-lines.ts';
import * as BT from '../src/sim/railway-train.ts';
import * as BS from '../src/sim/railway-trains.ts';
import * as ML from './helpers/main-rail/railway-lines.ts';
import * as MT from './helpers/main-rail/railway-train.ts';
import * as MS from './helpers/main-rail/railway-trains.ts';
import type { RailTrain } from '../src/sim/railway-train.ts';
import type { RailLineRow } from '../src/sim/railway-trains.ts';
import type { Railway } from '../src/sim/railway.ts';

const TICKS = Number(process.env.FUZZ_TICKS ?? 6000);
// The Q6 sweep opens at every STRIDE-th tick in `npm run check`; FUZZ_STRIDE=1 (`npm run test:long`, nightly) is every tick.
const STRIDE = Math.max(1, Number(process.env.FUZZ_STRIDE ?? 16));
const LINES = BL.RAIL_LINES.length;
const LINE2 = BL.LINE2;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const catchMsg = (f: () => void) => {
  try {
    f();
    return null;
  } catch (e) {
    return (e as Error).message;
  }
};

test('differential: the catalog, stops, places, blocks, cycles and headways are main bit for bit', () => {
  assert.deepEqual(clone(BL.RAIL_LINES), clone(ML.RAIL_LINES));
  assert.deepEqual(BL.RAIL_TRAINS, ML.RAIL_TRAINS);
  assert.deepEqual(clone(BL.RAIL_HALTS), clone(ML.RAIL_HALTS));
  assert.deepEqual(BT.TRAIN_STOPS, MT.TRAIN_STOPS);
  assert.deepEqual(BT.LINE_HALTS, MT.LINE_HALTS);
  assert.deepEqual(BS.LINE_SLOTS, MS.LINE_SLOTS);
  for (let line = 0; line < LINES; line++)
    for (const laid of [false, true, 0, 1, 2, 3, 4, 5, 6, 7, 99]) {
      const st = BT.trainStopsOf(line, laid);
      assert.deepEqual(st, MT.trainStopsOf(line, laid), `stops ${line} ${laid}`);
      if (st.length < 2) continue;
      assert.deepEqual(BL.trainPlaces(line, st), ML.trainPlaces(line, st), `places ${line} ${laid}`);
      assert.deepEqual(BS.endBlocks(line, st), MS.endBlocks(line, st), `blocks ${line} ${laid}`);
      assert.equal(BS.cycleTicks(line, st), MS.cycleTicks(line, st));
      for (const pct of [0, 1, 50, 75, 99, 100]) assert.equal(BS.headTicks(line, st, pct), MS.headTicks(line, st, pct));
    }
  // Every prefix of a line's halts (the stages the catalog can reach, and more).
  for (let line = 0; line < LINES; line++)
    for (let n = 2; n <= BT.TRAIN_STOPS[line]!.length; n++) {
      const st = BT.TRAIN_STOPS[line]!.slice(0, n);
      if (!BL.RAIL_LINES[line]!.halts[n - 1]!.end) continue;
      assert.deepEqual(BL.trainPlaces(line, st), ML.trainPlaces(line, st));
      assert.deepEqual(BS.endBlocks(line, st), MS.endBlocks(line, st));
    }
});

test('differential: every leg (ticks, along, speed) over a sweep of dist, v0 and t is main bit for bit', () => {
  const rand = mulberry32(0x1e9);
  for (let i = 0; i < 4000; i++) {
    const dist = 1 + Math.floor(rand() * 130000),
      v0 = Math.floor(rand() * 201),
      kin = BL.RAIL_LINES[Math.floor(rand() * LINES)]!;
    const T = BT.trainLegTicks(dist, v0, kin);
    assert.equal(T, MT.trainLegTicks(dist, v0, kin));
    for (let t = -1; t <= T + 1; t += 1 + Math.floor(rand() * 7)) {
      assert.equal(BT.trainLegAlong(dist, t, v0, kin), MT.trainLegAlong(dist, t, v0, kin));
      assert.equal(BT.trainLegSpeed(dist, t, v0, kin), MT.trainLegSpeed(dist, t, v0, kin));
    }
  }
});

type Side = {
  rows: RailTrain[];
  lines: RailLineRow[];
};
type Mode = { lever: number; rider: number; flags: number; corrupt: number };

/** The live catalog's trains on both lines under random asks; the Q6 opening (stage false -> true) at `q6` (-1 never),
 * through main's layLine2 hunk on main's side and endMoved on the branch's. */
function run(seed: number, headPct: number, q6: number, ticks: number, mode: Mode, laid0 = false) {
  const rand = mulberry32(seed);
  let laid = laid0;
  const stopsB = (line: number) => BT.trainStopsOf(line, laid),
    stopsM = (line: number) => MT.trainStopsOf(line, laid);
  const rows0: RailTrain[] = [];
  for (let line = 0; line < LINES; line++) {
    const st = stopsM(line);
    ML.trainPlaces(line, st).forEach((p, k) => {
      const slot = MS.LINE_SLOTS[line]![k]!,
        s = st[p.stop]!;
      rows0[slot] = { ...MT.trainIdle(slot), at: p.stop, to: p.stop, track: p.track, from: s, dest: s };
    });
  }
  const lines0: RailLineRow[] = BL.RAIL_LINES.map(() => ({ req: 0, left0: -1, left1: -1 }));
  const M: Side = { rows: clone(rows0), lines: clone(lines0) },
    B: Side = { rows: clone(rows0), lines: clone(lines0) };
  // Shared per-tick flags (read by both sides; drawn before either steps).
  let svc: Set<number>[] = [],
    hold: boolean[] = [],
    exempt: boolean[] = [];
  const io = (x: Side, stops: (l: number) => readonly number[]): BS.TrainIO => ({
    row: (slot) => x.rows[slot]!,
    set: (slot, p) => void Object.assign(x.rows[slot]!, p),
    line: (l) => x.lines[l]!,
    setLine: (l, p) => void Object.assign(x.lines[l]!, p),
    stops,
    awake: 0,
    headPct,
    service: (slot) => (k, dir) => svc[slot]!.has(k * 2 + (dir > 0 ? 1 : 0)),
    arrive: () => {},
    standing: (slot) => (hold[slot] ? 'hold' : 'on'),
    headExempt: (slot) => exempt[slot]!,
  });
  /** rail.call on one side, as railway-sys-trains.ts's call; returns accepted. */
  const call = (
    x: Side,
    stops: readonly number[],
    line: number,
    stop: number,
    dir: number,
    tick: number,
    tr?: number,
  ) => {
    const n = stops.length;
    if (stop >= n || (stop === 0 && dir < 0) || (stop === n - 1 && dir > 0)) return 0;
    const wait = (slot: number) => {
      const r = x.rows[slot]!;
      if (r.phase === MT.TRAIN_PHASE.STAND && r.at === stop && MT.trainDir(r) === dir && tick > r.depart)
        r.depart = tick;
    };
    if (tr !== undefined) {
      const r = x.rows[tr]!;
      if (MS.atEnd(stop, stops) || MT.trainDir(r) !== dir || MT.reqHas(r.req, stop, dir, n)) return 0;
      r.req = MT.reqAdd(r.req, stop, dir, n);
      wait(tr);
      return 1;
    }
    const l = x.lines[line]!;
    if (MT.reqHas(l.req, stop, dir, n)) return 0;
    l.req = MT.reqAdd(l.req, stop, dir, n);
    MS.LINE_SLOTS[line]!.forEach(wait);
    return 1;
  };
  const railwayOf = (x: Side, rows = x.rows) =>
    ({ trains: rows, lines: x.lines, line2: { trains: 0 } }) as unknown as Railway;
  let compared = 0,
    running = 0,
    q6hits = 0;
  for (let t = 1; t <= ticks; t++) {
    if (t === q6) {
      laid = true;
      // main's layLine2 hunk (railway-sys-line2.ts), verbatim in effect.
      const far = MT.TRAIN_STOPS[LINE2]!.length - 2,
        n = MT.TRAIN_STOPS[LINE2]!.length,
        crossover = ML.RAIL_LINES[LINE2]!.halts[far]!.end!.mergeCm;
      for (const slot of MS.LINE_SLOTS[LINE2]!) {
        const r = M.rows[slot]!;
        if (r.phase !== MT.TRAIN_PHASE.RUN || r.track !== 0 || r.to !== far) continue;
        if (MT.trainAlong(r, LINE2, t) + ML.TRAIN_EXTENT.aheadCm > crossover) r.turn = true;
        else r.req = MT.reqAdd(r.req, far, 1, n);
      }
      q6hits += M.rows.filter((r) => r.turn || r.req).length;
      BS.endMoved(io(B, stopsB), LINE2, far, t);
      assert.deepEqual(B.rows, M.rows, `Q6 opening at ${t}`);
    }
    svc = M.rows.map(() => {
      const s = new Set<number>();
      if (rand() < mode.flags) s.add(Math.floor(rand() * 10));
      return s;
    });
    hold = M.rows.map(() => rand() < mode.flags / 4);
    exempt = M.rows.map(() => rand() < mode.flags);
    if (t > MT.TRAIN.wakeTicks) {
      for (let line = 0; line < LINES; line++) {
        const st = stopsM(line),
          n = st.length;
        for (let stop = 0; stop < n; stop++)
          for (const dir of [-1, 1])
            if (rand() < mode.lever) {
              const a = call(M, st, line, stop, dir, t),
                b = call(B, stopsB(line), line, stop, dir, t);
              assert.equal(b, a);
              if (!BT.trainPassesBy(line, stop, dir, n)) continue;
              assert.fail(`a catalog halt refuses ${line}/${stop}/${dir}`);
            }
        for (const slot of MS.LINE_SLOTS[line]!)
          if (n > 2 && rand() < mode.rider) {
            const stop = 1 + Math.floor(rand() * (n - 2)),
              dir = MT.trainDir(M.rows[slot]!);
            assert.equal(call(B, stopsB(line), line, stop, dir, t, slot), call(M, st, line, stop, dir, t, slot));
          }
      }
    }
    for (let line = 0; line < LINES; line++) {
      MS.trainStepLine(io(M, stopsM), line, t);
      BS.trainStepLine(io(B, stopsB), line, t);
    }
    assert.deepEqual(B.rows, M.rows, `rows at ${t} (seed ${seed.toString(16)}, ${headPct}%)`);
    assert.deepEqual(B.lines, M.lines, `lines at ${t}`);
    running += M.rows.filter((r) => r.phase === MT.TRAIN_PHASE.RUN).length;
    // The queries, every tick.
    const rowM = (k: number) => M.rows[k]!;
    for (let line = 0; line < LINES; line++) {
      const st = stopsM(line),
        n = st.length;
      for (const slot of MS.LINE_SLOTS[line]!) {
        const r = M.rows[slot]!;
        assert.equal(BT.trainAlong(r, line, t), MT.trainAlong(r, line, t));
        assert.equal(BT.trainSpeed(r, line, t), MT.trainSpeed(r, line, t));
        assert.equal(BT.trainArrives(r, line), MT.trainArrives(r, line));
        const want = MT.trainRequestable(r, line, n, t);
        assert.deepEqual(BT.trainRequestable(r, line, n, t), want, `requestable ${slot} at ${t}`);
        assert.deepEqual(BT.trainRequestable(r, line, st, t), want, `requestable (stops) ${slot} at ${t}`);
        const pose = MS.trainPose(r, line, st, t);
        for (let k = 0; k < n; k++)
          for (const dir of [-1, 1]) {
            assert.equal(BS.trainServes(rowM, line, st, k, dir, t), MS.trainServes(rowM, line, st, k, dir, t));
          }
        const noSvc = () => false;
        const rm = MS.trainReasons(rowM, line, st, slot, M.lines[line]!.req, t, noSvc),
          rb = BS.trainReasons(rowM, line, st, slot, M.lines[line]!.req, t, noSvc);
        for (let k = 0; k < n; k++) for (const dir of [-1, 1]) assert.equal(rb(k, dir), rm(k, dir));
        for (const track of [0, 1])
          for (const v of [0, pose.v, Math.floor(rand() * 201)]) {
            const p = { s: pose.s, v, track };
            assert.deepEqual(
              BS.planLeg(rowM, line, st, slot, p, t, rb),
              MS.planLeg(rowM, line, st, slot, p, t, rm),
              `planLeg ${slot} ${JSON.stringify(p)} at ${t}`,
            );
          }
      }
    }
    assert.equal(BS.trainSpacing(rowM, stopsB, t), MS.trainSpacing(rowM, stopsM, t));
    assert.equal(
      catchMsg(() => BS.validateRailTrains(railwayOf(B), stopsB)),
      catchMsg(() => MS.validateRailTrains(railwayOf(M), stopsM)),
    );
    // The load check on a corrupt copy: one field of one row (or the line's req) set to something random.
    if (rand() < mode.corrupt) {
      const rows = clone(M.rows),
        lines = clone(M.lines),
        slot = Math.floor(rand() * rows.length),
        keys = ['phase', 'at', 'to', 'track', 'depart', 'req', 'from', 'dest', 'v0', 'turn', 'logs', 'rails'] as const;
      const key = keys[Math.floor(rand() * keys.length)]!;
      const pick = [-1, 0, 1, 2, 3, 4, 5, 9, 33, 1700, 52400, 72650, 100000, Math.floor(rand() * 200000)];
      const val = pick[Math.floor(rand() * pick.length)]!;
      if (key === 'turn') rows[slot]!.turn = !rows[slot]!.turn;
      else if (rand() < 0.15) lines[Math.floor(rand() * lines.length)]!.req = Math.floor(rand() * 4000);
      else (rows[slot] as Record<string, unknown>)[key] = key === 'req' ? Math.floor(rand() * 6000) : val;
      const x = { trains: rows, lines, line2: { trains: rand() < 0.2 ? -1 : 0 } } as unknown as Railway;
      assert.equal(
        catchMsg(() => BS.validateRailTrains(x, stopsB)),
        catchMsg(() => MS.validateRailTrains(x, stopsM)),
        `load check on ${key}=${val} slot ${slot}`,
      );
      compared++;
    }
  }
  return { compared, running, q6hits };
}

const NORMAL: Mode = { lever: 0.01, rider: 0.01, flags: 0.02, corrupt: 0.3 };
const STORM: Mode = { lever: 1, rider: 1, flags: 0.1, corrupt: 0.3 };
for (const seed of [0xc0ffee, 0x777, 0x15a4d, 0x5eed, 0xbee])
  for (const pct of [0, 75, 100])
    test(`differential ${seed.toString(16)} at ${pct}%: both lines, before Q6, the Q6 opening mid-run, and after`, () => {
      const q6 = 600 + (seed % 2000);
      const n = run(seed, pct, q6, TICKS, NORMAL);
      assert.ok(n.compared > 0 && n.running > TICKS, JSON.stringify(n));
      run(seed ^ 0xabc, pct, -1, Math.floor(TICKS / 2), STORM, true);
      run(seed ^ 0xdef, pct, Math.floor(TICKS / 4), Math.floor(TICKS / 2), STORM);
    });

test('differential: the Q6 opening at every tick offset over a train running up to Far Head (endMoved = v26 hunk)', () => {
  // A fixed stream; the opening tick swept over every tick from 200 to 1700 (the first trains' runs to Far Head).
  let hits = 0;
  for (let q6 = 200; q6 <= 1700; q6 += STRIDE)
    hits += run(0x9e6 + (q6 % 7), 75, q6, q6 + 80, { lever: 0.02, rider: 0.02, flags: 0, corrupt: 0 }).q6hits;
  assert.ok(hits > 100 / STRIDE, `${hits} trains turned or asked at the opening`);
});
