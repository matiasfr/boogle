import assert from 'node:assert/strict';
import test from 'node:test';
import { LAP_S0, LINE2, RAIL_HALTS, RAIL_LINES, RAIL_TRAINS, WALL_LEG } from '../src/sim/railway-lines.ts';
import { lapRow, runLine, gorgeStop, lapRequests } from '../src/sim/railway-lap.ts';
import { LEG_TUNE, RAIL_GATES, ROW_LINE } from '../src/sim/railway-route.ts';
import {
  fleetOf,
  reqAdd,
  reqHas,
  trainAlong,
  trainArrives,
  trainIdle,
  trainSpeed,
  trainStopsOf,
  TRAIN_PHASE,
} from '../src/sim/railway-train.ts';
import { carAlong, carPath, mirroredLat, poseOnPath, BOTTOM } from '../src/entities/railway/car-path.ts';
import { TRAILER } from '../src/entities/railway/cars.ts';
import { endMergeM } from '../src/entities/railway/line2-path.ts';
import { rowLat, rowWorld } from '../src/entities/railway/row-path.ts';
import { Line, Train } from '../src/sim/railway-components.ts';
import { legRow } from '../src/sim/railway-queries-route.ts';
import { giftAboard } from '../src/sim/railway-queries-gift.ts';
import { railCallPlatform, runningLine } from '../src/sim/railway-queries-trains.ts';
import { laySection } from '../src/sim/railway-seed-legs.ts';
import { blockFree, endBlocks, retainedEndBlock, servingSlots } from '../src/sim/railway-trains.ts';
import {
  act,
  advance,
  buildSeedWorld,
  chopTo,
  invariant,
  line,
  rail,
  stopsOf,
  train,
  unaudited,
  type Seed,
} from './helpers/rail.ts';
import { haltStands } from '../src/entities/railway/return-halts.ts';
import { haltMap } from '../src/entities/railway/halt-map.ts';
import * as layout from '../src/place/layout.ts';
import { rowLeverCall } from '../src/entities/railway/lever-place.ts';
import { createReturnSearch, returnCandidates, haltLandings } from '../src/place/return-spot.ts';
import { lapServiceShard } from './helpers/railway-route-rules.ts';

lapServiceShard();

const cave = ROW_LINE.cave;
const slot = RAIL_TRAINS.findIndex((t) => t.line === cave);
const before = [4, 2, 2, 3, 3, 5],
  after = [4, 2, 2, 3, 3, 6];
const stops = (line: number, legs: number[]) => trainStopsOf(line, 7, { head: 6, joined: true }, legs);
const old = stops(cave, before),
  through = stops(LINE2, after);

test('the sixth lay extends the open prefix and transfers the fleet', () => {
  assert.equal(old.length, 9);
  assert.equal(gorgeStop, 9);
  assert.deepEqual(through.slice(0, 10), stops(LINE2, before));
  assert.deepEqual(
    through.slice(10),
    [8, 6, 3, 2, 0].map((k) => LAP_S0 - old[k]!),
  );
  assert.deepEqual(stops(cave, after), []);
  assert.equal(fleetOf(cave, after), 0);
  assert.equal(fleetOf(LINE2, after), 11);
  assert.equal(RAIL_TRAINS.filter((_, k) => runLine(k, true) === LINE2).length, 11);
  assert.ok(RAIL_TRAINS.every((_, k) => runLine(k, true) !== cave));
});

test('mirroring a run keeps integer position and speed for every tick through arrival', () => {
  for (const track of [0, 1])
    for (let k = 1; k < old.length; k++) {
      const at = track ? k : k - 1,
        to = track ? k - 1 : k;
      const r = { ...trainIdle(slot), phase: TRAIN_PHASE.RUN, track, at, to, from: old[at]!, dest: old[to]!, v0: 17 };
      const joined = { ...r, ...lapRow(r) };
      for (let t = 0; t <= trainArrives(r, cave); t++) {
        assert.equal(trainAlong(joined, LINE2, t), LAP_S0 - trainAlong(r, cave, t));
        assert.equal(trainSpeed(joined, LINE2, t), trainSpeed(r, cave, t));
      }
    }
});

test('a cave lever transfers its request to the same platform facing the opposite way along line 2', () => {
  for (const k of [0, 2, 3, 6, 8])
    for (const dir of k === 0 ? [1] : [-1, 1]) {
      const next = through.indexOf(LAP_S0 - old[k]!);
      const request = lapRequests(reqAdd(0, k, dir, 10));
      assert.ok(reqHas(request, next, -dir, through.length));
      assert.deepEqual(
        RAIL_LINES[LINE2]!.halts[next]!.platforms[dir > 0 ? 1 : 0],
        RAIL_LINES[cave]!.halts[k]!.platforms[dir > 0 ? 0 : 1],
      );
    }
});

test('standing rows, signal holds and occupied old end blocks reflect in place', () => {
  for (const [k, s] of old.entries()) {
    for (const at of [k, -1])
      for (const track of [0, 1]) {
        const r = {
          ...trainIdle(slot),
          slot,
          phase: TRAIN_PHASE.STAND,
          track,
          at,
          to: at,
          from: s,
          dest: s,
          req: reqAdd(0, 3, 1, old.length),
          origin: track && k ? s : 0,
        };
        const next = { ...r, ...lapRow(r) };
        assert.equal(trainAlong(next, LINE2, 13), LAP_S0 - trainAlong(r, cave, 13));
        assert.equal(trainSpeed(next, LINE2, 13), 0);
        assert.equal(next.at, at === -1 ? -1 : through.indexOf(LAP_S0 - s));
        assert.equal(next.origin, r.origin ? LAP_S0 - r.origin : 0);
        assert.ok(reqHas(next.req, through.indexOf(LAP_S0 - old[3]!), -1, through.length));
        if (r.origin && RAIL_LINES[cave]!.halts[k]!.end) {
          const block = retainedEndBlock(r, cave, 13)!,
            mirrored = retainedEndBlock(next, LINE2, 13)!;
          assert.deepEqual(
            [mirrored.from, mirrored.to, mirrored.signal, mirrored.dir],
            [LAP_S0 - block.to, LAP_S0 - block.from, LAP_S0 - block.signal, -block.dir],
          );
          for (const [edge, sign] of [
            [block.from - 820, 1],
            [block.to + 1610, -1],
          ] as const) {
            for (const cm of [edge - sign, edge, edge + sign]) {
              const held = { ...r, from: cm, dest: cm };
              const occupies = cm === edge + sign;
              assert.equal(!!retainedEndBlock(held, cave, 13), occupies);
              assert.equal(!!retainedEndBlock({ ...held, ...lapRow(held) }, LINE2, 13), occupies);
            }
          }
        }
      }
  }
});

test('opposite-facing cars reserve the West landing crossover at their own leading edge', () => {
  for (const line of [LINE2, RAIL_LINES[LINE2]!]) {
    const end = endBlocks(line, through)[1];
    const native = RAIL_TRAINS.findIndex((t) => t.line === LINE2);
    const occupied = native + 1;
    for (const [approach, lead] of [
      [slot, 1610],
      [native, 820],
    ] as const) {
      const rows = RAIL_TRAINS.map((_, k) => ({ ...trainIdle(k), slot: k, phase: TRAIN_PHASE.SHED as number }));
      Object.assign(rows[occupied]!, { phase: TRAIN_PHASE.STAND, from: end.to, dest: end.to, track: 1 });
      Object.assign(rows[approach]!, {
        phase: TRAIN_PHASE.STAND,
        from: end.from - 6000,
        dest: end.from - 6000,
        track: 0,
      });
      const canEnter = (cm: number) => blockFree((k) => rows[k]!, line, through, approach, 0, cm, 0);
      assert.equal(canEnter(end.from - lead), true);
      assert.equal(canEnter(end.from - lead + 1), false);
      assert.equal(canEnter(end.signal), true);
    }
  }
});

/** A real fed frame two ticks before it lays, cloned for each occupied stand. */
function aboutToJoin() {
  const s = unaudited(buildSeedWorld('wall-deep'));
  assert.equal(act(s, 'a', 'rail.gate', { id: RAIL_GATES.findIndex((g) => g.id === 'deep-span') }), 1);
  let saved: Seed | undefined;
  laySection(s, WALL_LEG, (world, ticks) => {
    advance(world, ticks);
    const start = legRow(world.w, WALL_LEG).start;
    if (start >= 0 && world.t === start + LEG_TUNE.layTicks - 2) saved = unaudited(world);
  });
  assert.ok(saved);
  return saved;
}

function occupiedPoints(s: Seed) {
  const row = train(s.w, slot),
    running = runningLine(s.w, slot),
    mirrored = running !== cave;
  const stops = stopsOf(s.w, running);
  const path = carPath(cave, running, mirrored)!;
  const car = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, hy: (TRAILER.top - BOTTOM) / 2 };
  poseOnPath(car, path, carAlong(trainAlong(row, running, s.t), mirrored), (x) =>
    mirrored ? mirroredLat(row, x, stops, endMergeM(stops)) : rowLat(cave, row, x, stops),
  );
  // drawCar and the bench's drawn seat pitch about the rock's rail-height origin. The rideable body uses yaw only.
  const point = (x: number, y: number, z: number, pitch: number) => {
    const pivot = BOTTOM + car.hy;
    const h = (y + pivot) * Math.cos(pitch) + z * Math.sin(pitch) - pivot,
      d = z * Math.cos(pitch) - (y + pivot) * Math.sin(pitch);
    return [
      car.x + x * Math.cos(car.yaw) + d * Math.sin(car.yaw),
      car.y + h,
      car.z - x * Math.sin(car.yaw) + d * Math.cos(car.yaw),
    ];
  };
  return [
    point(TRAILER.hx, car.hy, TRAILER.hz, car.pitch),
    point(0.45, car.hy + 0.95, -0.85, car.pitch),
    point(-0.7, car.hy, 0.8, 0),
  ];
}

test('an occupied deck, seat and rideable platform keep their world poses across the sixth lay', (t) => {
  const base = aboutToJoin();
  for (const k of [0, 3]) {
    const s = unaudited(base),
      r = s.w.mut(Train, s.w.lookup(Train, slot)!)!;
    Object.assign(r, {
      at: k,
      to: k,
      from: old[k],
      dest: old[k],
      phase: TRAIN_PHASE.STAND,
      track: 0,
      origin: 0,
      turn: false,
      depart: s.t,
      arrived: s.t,
      req: 0,
      v0: 0,
    });
    const largest = [0, 0, 0];
    let prev = occupiedPoints(s);
    for (const expected of [cave, LINE2, LINE2]) {
      advance(s, 1);
      assert.equal(runningLine(s.w, slot), expected);
      const current = occupiedPoints(s);
      for (const [i, p] of current.entries())
        largest[i] = Math.max(largest[i]!, Math.hypot(...p.map((n, j) => n - prev[i]![j]!)));
      prev = current;
    }
    assert.ok(Math.max(...largest) < 1e-8, 'standing player car moved on the join');
    t.diagnostic(
      `${RAIL_LINES[cave]!.halts[k]!.name}: largest deck, seat and platform steps (m) ${largest.join(', ')}`,
    );
  }
});

test('accepted platform calls cross the lay, and the extra train enters at the Village', () => {
  const s = aboutToJoin();
  const extra = RAIL_TRAINS.findLastIndex((t) => t.line === cave);
  assert.equal(train(s.w, extra).phase, TRAIN_PHASE.SHED);
  advance(s, 1);
  const id = RAIL_HALTS.findIndex((h) => h.line === cave && h.stop === 3);
  const way = 1,
    stop = through.indexOf(LAP_S0 - old[3]!);
  const platform = railCallPlatform(s.w, id, way, s.t);
  assert.equal(act(s, 'a', 'rail.call', { id, dir: way }), 1);
  assert.ok(reqHas(line(s.w, cave).req, 3, way, old.length));
  assert.equal(invariant(s.w), null);
  advance(s, 1);
  assert.ok(reqHas(line(s.w, LINE2).req, stop, -way, through.length));
  assert.equal(line(s.w, cave).req, 0);
  assert.deepEqual(
    railCallPlatform(
      s.w,
      RAIL_HALTS.findIndex((h) => h.line === LINE2 && h.stop === stop),
      -way,
      s.t,
    ),
    platform,
  );
  for (let i = 0; train(s.w, extra).phase === TRAIN_PHASE.SHED; i++) {
    assert.ok(i < 10000, 'the eleventh train entered service');
    advance(s, 1);
  }
  const joined = train(s.w, extra);
  assert.deepEqual([joined.phase, joined.at, joined.from], [TRAIN_PHASE.STAND, 0, through[0]]);
  assert.equal(servingSlots((k) => train(s.w, k), LINE2, through).length, 11);
  assert.equal(invariant(s.w), null);
});

test('a cave train retains its 200 cm/tick fit until it stands at the Village', () => {
  const s = aboutToJoin();
  // Use a distinct line fit so the first adoption is observable.
  s.w.mut(Line, s.w.lookup(Line, LINE2)!)!.boiler = 2;
  assert.equal(train(s.w, slot).boiler, 0);
  advance(s, 2);
  let top = 0;
  for (let i = 0; train(s.w, slot).boiler === 1; i++) {
    assert.ok(i < 20000, 'reached the Village');
    top = Math.max(top, trainSpeed(train(s.w, slot), LINE2, s.t));
    advance(s, 1);
  }
  assert.equal(top, 200);
  const adopted = train(s.w, slot);
  assert.deepEqual([adopted.at, adopted.from, adopted.boiler], [0, through[0], 2]);
});

test('a gift aboard a Wall kit survives the last lay and returns to its original Home rack', () => {
  const s = unaudited(buildSeedWorld('wall-deep'));
  chopTo(s, 'a', 8);
  assert.equal(act(s, 'a', 'rail.haltPut', { yard: 0, kind: 0 }), 8);
  for (let i = 0; !giftAboard(s.w, cave); i++) {
    assert.ok(i < 10000, 'a cave kit loaded the gift');
    advance(s, 1);
  }
  const gift = giftAboard(s.w, cave);
  assert.equal(gift, 8);
  assert.equal(act(s, 'a', 'rail.gate', { id: RAIL_GATES.findIndex((g) => g.id === 'deep-span') }), 1);
  laySection(s, WALL_LEG, (world, ticks) => {
    const row = legRow(world.w, WALL_LEG);
    if (row.start >= 0 && world.t + ticks === row.start + LEG_TUNE.layTicks) {
      assert.equal(invariant(world.w), null);
      assert.equal(giftAboard(world.w, cave), gift);
    }
    advance(world, ticks);
  });
  assert.equal(invariant(s.w), null);
  assert.equal(giftAboard(s.w, cave), gift);
  for (let i = 0; giftAboard(s.w, cave); i++) {
    assert.ok(i < 20000, 'residual gift came home');
    advance(s, 1);
  }
  assert.equal(rail(s.w).rack, gift);
  assert.equal(rail(s.w).giftOut, 0);
  assert.equal(invariant(s.w), null);
});

test('the physical Port Quay and Saltpan handles call their joined platforms in both directions', () => {
  const s = unaudited(buildSeedWorld('wall-closed'));
  for (const name of ['Port Quay', 'Saltpan Halt']) {
    const id = RAIL_HALTS.findIndex((h) => h.line === cave && h.name === name);
    for (const up of [false, true]) {
      const call = rowLeverCall(id, up, true)!;
      assert.equal(RAIL_HALTS[call.id]!.line, LINE2);
      assert.equal(RAIL_HALTS[call.id]!.name, name);
      assert.equal(call.dir, up ? 1 : -1);
      assert.equal(act(s, 'a', 'rail.call', { id: call.id, dir: call.dir }), 1);
      assert.ok(reqHas(line(s.w, LINE2).req, call.stop, call.dir, through.length));
      assert.deepEqual(RAIL_HALTS[call.id]!.platforms[up ? 0 : 1], RAIL_HALTS[id]!.platforms[up ? 1 : 0]);
    }
  }
});
test('a saved Port Quay ride keeps its destination after the sixth lay', () => {
  const s = aboutToJoin();
  const ride = { ...rowWorld(cave, 150, 0, { x: 0, z: 0 }), y: 4, halt: 'cave:3' };
  const saved = { ...ride, yaw: 0, at: 0, x: ride.x + 100, ride };
  const candidates = haltLandings();
  const first = () =>
    returnCandidates(saved, candidates, (p) => haltStands(p.line!, p.stop!, stopsOf(s.w, p.line!).length))[0]!.halt;
  assert.equal(first(), 'cave:3');
  advance(s, 2);
  assert.equal(first(), 'line2:12');
  const port = candidates.find((p) => p.halt === 'line2:12' && p.checked)!;
  const search = createReturnSearch(saved, candidates, (p) =>
    haltStands(p.line!, p.stop!, stopsOf(s.w, p.line!).length),
  );
  const probes = { settled: () => true, standable: () => true, near: () => null };
  for (let i = 0; i < 80; i++) {
    const result = search.step(i / 10, probes);
    if (result.kind === 'hold') continue;
    assert.equal(result.kind, 'land');
    assert.deepEqual(result.from, port);
    return;
  }
  assert.fail('return search did not land at Port Quay');
});
test('the arrived passenger coach passes the Gorge without a request', () => {
  const s = unaudited(buildSeedWorld('arrived'));
  let passed = false;
  for (let i = 0; i < 6000; i++) {
    const r = train(s.w, 6);
    assert.ok(!(r.phase === TRAIN_PHASE.STAND && r.at === gorgeStop), 'unrequested Gorge arrival');
    if (r.from < through[gorgeStop]! && r.dest > through[gorgeStop]!) {
      passed = true;
      break;
    }
    advance(s, 1);
  }
  assert.ok(passed, 'slot 6 runs through the Gorge');
});

test('the joined island map reaches West landing and keeps every halt in marker order', () => {
  const mapped = haltMap(layout, { open: through.length, head: 6 }).lines[LINE2]!;
  assert.deepEqual(mapped.stops.map((s) => s.s * 100).map(Math.round), through);
  assert.equal(mapped.laid, mapped.stops.at(-1)!.s);
  assert.ok(mapped.stops.every((s) => !s.hide));
  const gorge = mapped.stops[gorgeStop]!;
  assert.ok(mapped.stops.slice(gorgeStop + 1).every((s) => Math.hypot(s.x - gorge.x, s.z - gorge.z) > 1));
});
