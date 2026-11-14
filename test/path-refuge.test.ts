// How the commuters on line 1's track bed keep clear of trains (src/entities/railway/path-refuge.ts), probed every
// 0.1 m of the whole path: every refuge holds their feet on something drawn (the ground from terrain.ts
// surfaceHeight, the deck from the planks the game's own buildTrack makes; neither taken from the module), no car on
// either track ever needs them to give way, and with real trains (the sim's own legs: standing, leaving, at speed,
// braking, two together, both ways on both tracks) every one of them is clear before the train is there.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three/webgpu';
import { trackBoxes } from '../dev/level/grounding-track.ts';
import { FORMATION, LINKS, STUB, lineAt, railY, upLat } from '../src/place/layout.ts';
import { surfaceHeight } from '../src/place/terrain.ts';
import { besideLine } from '../src/entities/railway/line-geometry.ts';
import { STEEL_CAR, TRAIN_CARS, TRAIN_OFFSETS } from '../src/entities/railway/cars.ts';
import {
  CAR_BUFFERS,
  ENGINE_BUFFERS,
  deckAt,
  trainPlaces,
  type Deck,
  type Vehicle,
} from '../src/entities/railway/car-spacing.ts';
import { TRAIN_PHASE, trainAlong, trainArrives, type RailTrain } from '../src/sim/railway-train.ts';
import {
  REFUGE_CLEAR,
  commuterFeet,
  pathRefuges,
  plankTops,
  stepCommuter,
  trainDue,
  type Commuter,
  type TrainAhead,
} from '../src/entities/railway/path-refuge.ts';

const line = LINKS[0]!.line;
const up = (s: number) => upLat(FORMATION[LINKS[0]!.id], s) ?? 0;
const built = trackBoxes().find((t) => t.spec.id === 'timber' && t.mode === 'panels')!;
const drawn = built.boxes.filter((_, k) => built.kinds[k] === 'plank');
const refuges = pathRefuges(line, 30, STUB.camp, {
  ground: surfaceHeight,
  deckTop: plankTops(drawn),
  up,
  beside: besideLine,
});
const FROM = refuges.first,
  TO = STUB.camp,
  LEN = TO - FROM;
const places = Array.from({ length: Math.round(LEN * 10) + 1 }, (_, k) => FROM + k / 10);

// The drawn deck, worked out here with three.js from the same boxes: the top of the plank under a point, a sole of
// `radius` bridging the gaps between boards.
const planks = drawn.map((b) => ({
  b,
  p: new THREE.Vector3(0, 1, 0).applyMatrix4(b.local).add(new THREE.Vector3(b.x, b.y, b.z)),
  n: new THREE.Vector3(0, 1, 0).transformDirection(b.local),
  inv: b.local.clone().invert(),
  w: new THREE.Vector3().setFromMatrixScale(b.local),
}));
const q = new THREE.Vector3();
function deckTop(x: number, z: number, radius: number) {
  let top = -Infinity;
  for (const { b, p, n, inv, w } of planks) {
    if (Math.abs(x - b.x) + Math.abs(z - b.z) > 12) continue;
    const y = p.y - (n.x * (x - p.x) + n.z * (z - p.z)) / n.y;
    q.set(x - b.x, y - b.y, z - b.z).applyMatrix4(inv);
    if (Math.abs(q.x) <= 0.5 + radius / w.x && Math.abs(q.z) <= 0.5 + radius / w.z) top = Math.max(top, y);
  }
  return top;
}
const supportAt = (s: number, lat: number) => {
  const at = besideLine(line, s, lat);
  return Math.max(surfaceHeight(at.x, at.z), deckTop(at.x, at.z, 0.14));
};

// folk.ts clearTraffic: a car's box widened by its racks (0.15) and ends (0.25), and the 0.38 m a walker keeps
// (sites.ts outOf, whose module loads the page's styles: its arithmetic is repeated here).
const insideCar = (car: { x: number; z: number; yaw: number; hx: number; hz: number }, p: { x: number; z: number }) => {
  const dx = p.x - car.x,
    dz = p.z - car.z,
    c = Math.cos(car.yaw),
    s = Math.sin(car.yaw);
  return car.hx + 0.15 + 0.38 - Math.abs(dx * c - dz * s) > 0 && car.hz + 0.25 + 0.38 - Math.abs(dx * s + dz * c) > 0;
};

test('the path starts at its first refuge, and every refuge every 0.1 m stands on something drawn', () => {
  assert.ok(FROM > 30 && FROM < 40, `the first refuge is at s ${FROM.toFixed(1)}`);
  let ground = 0,
    deck = 0,
    worst = 0;
  for (const s of places) {
    const r = refuges.at(s);
    assert.ok(r, `s ${s.toFixed(1)} has no refuge`);
    const support = supportAt(s, r.lat);
    worst = Math.max(worst, Math.abs(r.y - support));
    assert.ok(
      Math.abs(r.y - support) <= 0.05,
      `s ${s.toFixed(1)}: feet ${r.y.toFixed(3)}, drawn ${support.toFixed(3)}`,
    );
    assert.ok(Math.abs(r.lat) >= REFUGE_CLEAR - 1e-9 && Math.abs(r.lat - up(s)) >= REFUGE_CLEAR - 1e-9);
    if (r.on === 'deck') deck++;
    else ground++;
  }
  // Both kinds are on the path: the ridge trestle's deck and the ground either side of it.
  assert.ok(deck > 100 && ground > 100, `${deck} deck, ${ground} ground`);
  // The reviewer's three places: past the drawn deck's end, on the rendered triangles, and off a table's sample.
  for (const s of [115, 72.7, 84.2]) {
    const r = refuges.at(s)!;
    assert.ok(Math.abs(r.y - supportAt(s, r.lat)) <= 0.05, `s ${s}`);
  }
  assert.ok(worst <= 0.05);
});

test('a commuter at rest in a refuge needs no give-way from a car standing or passing on either track', () => {
  const sizes = [...new Map([...TRAIN_CARS, STEEL_CAR].map((c) => [`${c.hx}:${c.hz}`, c])).values()];
  const point = { x: 0, z: 0, ux: 0, uz: 1 };
  let checked = 0;
  for (const s of places) {
    const r = refuges.at(s)!;
    const here = besideLine(line, s, r.lat);
    for (const track of up(s) < -0.5 ? [0, 1] : [0])
      for (const size of sizes)
        for (let d = -8; d <= 8; d += 0.25) {
          const cs = s + d;
          if (cs < 1 || cs > line.len - 1) continue;
          const c = besideLine(line, cs, track ? up(cs) : 0);
          lineAt(line, cs, point);
          const car = { x: c.x, z: c.z, yaw: Math.atan2(point.ux, point.uz), hx: size.hx, hz: size.hz };
          assert.equal(insideCar(car, here), false, `s ${s.toFixed(1)}: a car at ${cs.toFixed(2)} on track ${track}`);
          checked++;
        }
  }
  assert.ok(checked > 300_000, `${checked} sweeps`);
});

// ---------------------------------------------------------------- real trains
const VILLAGE = 1400,
  CAMP = 20700;
/** A line 1 train standing at its halt until `depart` (ticks), then on the sim's own leg to the other halt. */
const train = (dir: 1 | -1, depart: number) => {
  const run: RailTrain = {
    ...({} as RailTrain),
    phase: TRAIN_PHASE.RUN,
    from: dir > 0 ? VILLAGE : CAMP,
    dest: dir > 0 ? CAMP : VILLAGE,
    track: dir > 0 ? 0 : 1,
    to: dir > 0 ? 1 : 0,
    depart,
    v0: 0,
    boiler: 0,
  };
  const arrives = trainArrives(run, 0);
  return {
    arrives,
    along: (tick: number) => (tick < depart ? run.from : tick >= arrives ? run.dest : trainAlong(run, 0, tick)) / 100,
  };
};
const made: Vehicle[] = TRAIN_CARS.slice(0, 3).map((spec, n) => ({
  d: TRAIN_OFFSETS[n]!,
  hx: spec.hx,
  back: spec.hz,
  front: spec.hz,
  buffers: n === 0 ? ENGINE_BUFFERS : CAR_BUFFERS,
}));
const LO = TRAIN_OFFSETS[2]! - TRAIN_CARS[2]!.hz,
  HI = TRAIN_OFFSETS[0]! + TRAIN_CARS[0]!.hz;

/** A commuter starting every 0.1 m of the path (the two outer lanes and both ways by turns) through one timetable:
 * returns how many were ever inside a car's give-way box, and how many stood in a refuge. */
function run(trains: { dir: 1 | -1; depart: number; upTrack: boolean }[]) {
  const sims = trains.map((t) => ({ ...t, ...train(t.dir, t.depart) }));
  const end = Math.max(...sims.map((t) => t.arrives)) / 10 + 2;
  const commuters = places.map((s, k) => {
    const lane = k % 2 ? 1.15 : -1.15,
      way = k % 4 < 2 ? 1 : -1;
    return {
      lane,
      c: { u: (s - FROM) / LEN, way, lat: lane, refLat: lane, refY: 0 } as Commuter,
      hit: false,
      stood: false,
    };
  });
  const pathS = (u: number) => FROM + u * LEN;
  const stand: number[] = [],
    deck: Deck = { x: 0, z: 0, yaw: 0, hx: 0, back: 0, front: 0 },
    dt = 1 / 60;
  let feet = 0,
    worstFeet = 0;
  for (let t = 0; t <= end; t += dt) {
    // Each train's ends for the look-ahead, sampled once a step, and its cars as the view places them.
    const ahead: TrainAhead[] = sims.map((sim) => {
      const at = Array.from({ length: 52 }, (_, k) => sim.along(t * 10 + k));
      return (sec: number) => {
        const f = sec * 10,
          k = Math.min(50, Math.floor(f)),
          a = at[k]! + (at[k + 1]! - at[k]!) * (f - k);
        return { lo: a + LO, hi: a + HI };
      };
    });
    const cars = sims.flatMap((sim) => {
      const lat = sim.upTrack ? up : () => 0;
      const trackAt = (s: number, out: { x: number; z: number }) => Object.assign(out, besideLine(line, s, lat(s)));
      trainPlaces(trackAt, sim.along(t * 10), made, stand, sim.upTrack);
      return made.map((v, n) => {
        deckAt(trackAt, stand[n]!, v, deck);
        return { x: deck.x, z: deck.z, yaw: deck.yaw, hx: v.hx, hz: v.front, s: stand[n]! };
      });
    });
    for (const m of commuters) {
      const { aside } = stepCommuter(m.c, m.lane, dt, {
        len: LEN,
        speed: 1.7 * 1.3,
        across: 1.7,
        due: (u) => trainDue(pathS(u), ahead),
        refuge: (u) => refuges.at(pathS(u)),
        go: (u) => refuges.go(pathS(u)),
      });
      const s = pathS(m.c.u);
      const near = cars.filter((car) => Math.abs(car.s - s) < 6);
      if (near.length) {
        const here = besideLine(line, s, m.c.lat);
        if (near.some((car) => insideCar(car, here))) m.hit = true;
      }
      if (aside && m.c.lat === m.c.refLat) {
        m.stood = true;
        // Feet at rest: now and then, against what is drawn there.
        if (feet++ % 97 === 0) {
          const gap = Math.abs(commuterFeet(m.c, m.lane, railY(line, s) + 0.2) - supportAt(s, m.c.lat));
          worstFeet = Math.max(worstFeet, gap);
        }
      }
    }
  }
  return {
    commuters: commuters.length,
    hit: commuters.filter((m) => m.hit).length,
    stood: commuters.filter((m) => m.stood).length,
    worstFeet,
  };
}

test('with real trains every commuter is in a refuge before the train is there', () => {
  // One train, each way on each track: standing at its halt, leaving, at speed along the path, braking, standing.
  // Then two together: 28 m apart the same way on the real track, and one each way passing on the path.
  const timetables: Parameters<typeof run>[0][] = [
    ...([1, -1] as const).flatMap((dir) => [false, true].map((upTrack) => [{ dir, depart: 20, upTrack }])),
    ...([1, -1] as const).map((dir) => [
      { dir, depart: 20, upTrack: dir > 0 },
      { dir, depart: 34, upTrack: dir > 0 },
    ]),
    [
      { dir: 1 as const, depart: 20, upTrack: true },
      { dir: -1 as const, depart: 20, upTrack: false },
    ],
  ];
  for (const timetable of timetables) {
    const result = run(timetable);
    const label = JSON.stringify(timetable);
    assert.equal(result.hit, 0, `${result.hit} of ${result.commuters} had to give way: ${label}`);
    assert.equal(result.stood, result.commuters, `${result.commuters - result.stood} never stood aside: ${label}`);
    assert.ok(result.worstFeet <= 0.05, `feet ${result.worstFeet.toFixed(3)} m off a support: ${label}`);
  }
});
