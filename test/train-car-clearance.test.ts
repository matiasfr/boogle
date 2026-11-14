// A train's vehicles as the view stands them (src/entities/railway/train-view.ts with car-spacing.ts): each posed on
// the 2.2 m chord of its axles, spaced by metres along the track it is drawn on, the couplings stretched where a bend
// would still put one deck in the next. Owner, 14 November: "on certain stops, especially with curves, the train car
// clips the train engine". Spaced by the line's metres, an up train (drawn 4 m inside a bend) stood with its engine's
// deck 0.68 m into the first car on line 1's bend and 0.98 m into it at the Quarry's stop.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FORMATION,
  LINKS,
  UP_BEND_MIN,
  UP_LAT,
  lineAt,
  lineSmoothAt,
  upFull,
  upLat,
  type LinePoint,
} from '../src/place/layout.ts';
import { tightest } from '../src/place/track-ease.ts';
import {
  BUFFER_MIN,
  CAR_BUFFER,
  CAR_BUFFERS,
  COUPLING_MIN,
  ENGINE_BUFFERS,
  couplingCapacity,
  couplingSlack,
  deckAt,
  deckGap,
  spacedAlong,
  trainPlaces,
  type Deck,
  type TrackPoint,
  type Vehicle,
} from '../src/entities/railway/car-spacing.ts';
import {
  FLAT_RACK,
  STEEL_CAR,
  TRAIN_CARS,
  TRAIN_OFFSETS,
  ridesOn,
  steelCarOffset,
} from '../src/entities/railway/cars.ts';
import { RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import fs from 'node:fs';
import { ENGINE_LONG_AHEAD } from '../src/entities/railway/engine.ts';
import { line2At } from '../src/entities/railway/line2-path.ts';

/** Line `k`'s drawn track: today's (lat 0) or the up track, as train-view.ts's `trackAt`; `plain` is the up track
 * as it was drawn, a flat 4 m beside the line through the Quarry's bend too. */
function trackOf(k: number, up: boolean, plain = false) {
  const f = FORMATION[LINKS[k]!.id];
  const p: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  return (s: number, out: TrackPoint) => {
    // As it was: the line's stepped heading and a flat 4 m. Now: the smooth heading and its offset.
    if (plain) lineAt(LINKS[k]!.line, s, p);
    else if (k === 1) line2At(s, p, true);
    else lineSmoothAt(LINKS[k]!.line, s, p);
    const l = up ? (plain ? ((upLat(f, s) ?? 0) / upFull(f, s)) * UP_LAT : (upLat(f, s, true) ?? 0)) : 0;
    out.x = p.x - p.uz * l;
    out.z = p.z + p.ux * l;
  };
}
/** A train's vehicles, engine first, as train-view.ts makes them; `steel` is the longer boiler's train: a longer nose
 * and the steel car. `buffers` false: bare decks, as the cars were before any were drawn. */
function vehiclesOf(steel: boolean, buffers = true): Vehicle[] {
  const list: Vehicle[] = TRAIN_CARS.slice(0, 3).map((c, n) => ({
    d: TRAIN_OFFSETS[n]!,
    hx: c.hx,
    back: c.hz,
    front: c.hz + (n === 0 && steel ? ENGINE_LONG_AHEAD : 0),
    ...(buffers ? { buffers: n === 0 ? ENGINE_BUFFERS : CAR_BUFFERS } : {}),
  }));
  if (steel)
    list.push({
      d: steelCarOffset(false),
      hx: STEEL_CAR.hx,
      back: STEEL_CAR.hz,
      front: STEEL_CAR.hz,
      ...(buffers ? { buffers: CAR_BUFFERS } : {}),
    });
  return list;
}
const blank = (): Deck => ({ x: 0, z: 0, yaw: 0, hx: 0, back: 0, front: 0 });
/** The train at `along` as it stands: each vehicle and its deck. `old` is as it was: the line's metres, bare decks
 * and the plain up track on the stepped heading. */
function train(k: number, up: boolean, along: number, steel: boolean, old = false) {
  const at = trackOf(k, up, old),
    vehicles = vehiclesOf(steel, !old);
  const places = old ? vehicles.map((v) => along + v.d) : trainPlaces(at, along, vehicles, [], up);
  return vehicles.map((v, n) => ({ v, deck: deckAt(at, places[n]!, v, blank()) }));
}
/** The least gap between neighbouring decks of the train at `along`. */
function standing(k: number, up: boolean, along: number, steel: boolean, old = false) {
  const cars = train(k, up, along, steel, old);
  return Math.min(...cars.slice(1).map((c, n) => deckGap(cars[n]!.deck, c.deck)));
}
/** The least room to spare at any coupling (decks over COUPLING_MIN, buffers over BUFFER_MIN): negative is too close. */
function slack(k: number, up: boolean, along: number, steel: boolean) {
  const cars = train(k, up, along, steel);
  return Math.min(...cars.slice(1).map((c, n) => couplingSlack(cars[n]!.deck, cars[n]!.v, c.deck, c.v)));
}
/** A buffer as couplings.ts draws it: a box round one, at `side` of the end `end` of a car's deck. */
function buffer(deck: Deck, side: number, end: 1 | -1): Deck {
  const c = Math.cos(deck.yaw),
    s = Math.sin(deck.yaw);
  const lz = end * ((end > 0 ? deck.front : deck.back) + CAR_BUFFER.out / 2),
    lx = side * CAR_BUFFER.x;
  return {
    x: deck.x + lx * c + lz * s,
    z: deck.z - lx * s + lz * c,
    yaw: deck.yaw,
    hx: CAR_BUFFER.r,
    back: CAR_BUFFER.out / 2,
    front: CAR_BUFFER.out / 2,
  };
}

test('spacedAlong: metres along the drawn track, not the line', () => {
  // A line of 12 m radius; the track 4 m inside it is 8 m radius, so 4.2 m of track is 6.3 m of the line.
  const arc = (R: number) => (s: number, out: TrackPoint) => {
    out.x = R * Math.sin(s / 12);
    out.z = R * (1 - Math.cos(s / 12)) + (12 - R);
  };
  assert.ok(Math.abs(spacedAlong(arc(12), 30, 4.2) - 34.2) < 0.01);
  assert.ok(Math.abs(spacedAlong(arc(8), 30, 4.2) - 36.3) < 0.02);
  assert.ok(Math.abs(spacedAlong(arc(8), 30, -11.1) - (30 - 16.65)) < 0.05);
  assert.equal(spacedAlong(arc(8), 30, 0), 30);
});

test('on straight track nothing moves: every vehicle at its offset', () => {
  const at = (s: number, out: TrackPoint) => {
    out.x = 3;
    out.z = s;
  };
  for (const spaced of [false, true]) {
    const places = trainPlaces(at, 100, vehiclesOf(true), [], spaced);
    [...TRAIN_OFFSETS.slice(0, 3), steelCarOffset(false)].forEach((d, n) =>
      assert.ok(Math.abs(places[n]! - (100 + d)) < 1e-6, `vehicle ${n}`),
    );
  }
});

test('at every stop, on either track, with and without the longer boiler, no deck stands in the next', () => {
  for (const k of [0, 1])
    for (const up of [false, true])
      for (const steel of [false, true])
        for (const s of LINKS[k]!.stops) {
          const g = standing(k, up, s, steel);
          assert.ok(
            g > COUPLING_MIN - 0.01,
            `line ${k + 1} ${up ? 'up' : 'down'} stop ${s}${steel ? ' steel' : ''}: ${g.toFixed(3)}`,
          );
        }
  // The stop the owner saw: line 2's Quarry on the up track, the engine's deck 0.98 m into the first car.
  const was = standing(1, true, 174, false, true);
  assert.ok(was < -0.9 && was > -1.05, `the Quarry's up stop, as it was: ${was.toFixed(3)}`);
});

test('under way: decks stay clear round every bend of both lines, on both tracks', () => {
  for (const k of [0, 1])
    for (const up of [false, true]) {
      let worst = Infinity,
        was = Infinity;
      for (let s = 14; s <= (k ? 524 : 207); s += 0.25) {
        worst = Math.min(worst, standing(k, up, s, true));
        was = Math.min(was, standing(k, up, s, true, true));
      }
      assert.ok(worst > COUPLING_MIN - 0.01, `line ${k + 1} ${up ? 'up' : 'down'}: ${worst.toFixed(3)}`);
      if (up) assert.ok(was < -0.6, `line ${k + 1} up, as it was: ${was.toFixed(3)}`);
    }
});

test("the Quarry's bend: the up track is eased to 10 m and the up train stands there close coupled", () => {
  // As drawn before: 4 m inside the line's 6.5 m bend, a bend under 4 m (2.8 m at its tightest metre). Eased
  // (layout.ts upFull, track-ease.ts) it starts its turn earlier and ends it later, between 3.91 and 4.35 m from the
  // line, and is the plain 4 m outside s 156-200.
  const f = FORMATION.quarry,
    line = LINKS[1]!.line;
  const p: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  // The track as the rails read it (the stepped heading) and as a train does (the smooth one), every 0.05 m: a
  // 0.25 m walk once hid a 5.6 m bend between the offset's samples (review, 14 November).
  const path = (smooth: boolean, lat: (s: number) => number, step = 0.05) => {
    const out: TrackPoint[] = [];
    for (let s = 60; s <= 480; s += step) {
      (smooth ? lineSmoothAt : lineAt)(line, s, p);
      const l = lat(s);
      out.push({ x: p.x - p.uz * l, z: p.z + p.ux * l });
    }
    return out;
  };
  assert.ok(tightest(path(true, () => UP_LAT)) < 4, 'the plain offset was a bend under 4 m');
  for (const smooth of [false, true])
    for (const step of [0.05, 0.01, 0.25]) {
      const r = tightest(path(smooth, (s) => upLat(f, s, smooth)!, step));
      assert.ok(r >= UP_BEND_MIN, `${smooth ? 'smooth' : 'stepped'} at ${step} m: ${r.toFixed(2)}`);
    }
  // A train's point never steps back along the track (the stepped heading stood it back 0.58 m a metre here).
  const run = path(true, (s) => upLat(f, s, true)!);
  for (let i = 2; i < run.length; i++) {
    const a = run[i - 2]!,
      b = run[i - 1]!,
      c = run[i]!;
    assert.ok((b.x - a.x) * (c.x - b.x) + (b.z - a.z) * (c.z - b.z) > 0, `steps back at ${60 + i * 0.05}`);
  }
  for (let s = 60; s <= 480; s += 0.25)
    for (const smooth of [false, true]) {
      const l = upLat(f, s, smooth)!;
      if (s <= 156 || s >= 200) assert.equal(l, UP_LAT, `plain at ${s}`);
      else assert.ok(l > -4.45 && l < -3.85, `at ${s}: ${l}`);
    }
  // The up platform (s 154-174.5, outside the up track): the track stays within 0.1 m of where it was.
  for (let s = 154; s <= 174.5; s += 0.25) assert.ok(Math.abs(upLat(f, s)! - UP_LAT) < 0.1, `platform at ${s}`);
  // The up train at the Quarry's stop: no coupling out more than 0.1 m (0.06 m at the engine, for its buffers).
  const at = trackOf(1, true);
  const a = { x: 0, z: 0 },
    b = { x: 0, z: 0 };
  for (const steel of [false, true]) {
    const vehicles = vehiclesOf(steel);
    trainPlaces(at, 174, vehicles, []).forEach((s, n) => {
      at(s, a);
      at(spacedAlong(at, 174, vehicles[n]!.d), b);
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 0.1, `vehicle ${n} stretched`);
    });
  }
});

test('a train on either up track never steps back along it, at 0.05 m', () => {
  for (const k of [0, 1]) {
    const at = trackOf(k, true),
      f = FORMATION[LINKS[k]!.id];
    const a = { x: 0, z: 0 },
      b = { x: 0, z: 0 },
      c = { x: 0, z: 0 };
    for (let s = f.from + 0.1; s < Math.min(f.to, 480) - 0.1; s += 0.05) {
      at(s - 0.05, a);
      at(s, b);
      at(s + 0.05, c);
      const made = Math.hypot(c.x - b.x, c.z - b.z);
      assert.ok((b.x - a.x) * (c.x - b.x) + (b.z - a.z) * (c.z - b.z) > 0, `line ${k + 1} steps back at ${s}`);
      assert.ok(made > 0.015 && made < 0.07, `line ${k + 1} at ${s}: ${made.toFixed(3)} m made in 0.05 m`);
    }
  }
});

test('buffers never stand in each other or in a deck: every 0.1 m of both lines, on both tracks', () => {
  // Review, 14 November: at line 1 up, s 156.9, the passenger and cargo cars' buffers met at one height though the
  // decks cleared by 0.11 m. The spacing rule counts them now (couplingSlack), and each drawn buffer is checked here.
  for (const k of [0, 1])
    for (const up of [false, true])
      for (const steel of [false, true])
        for (let s = 14; s <= (k ? 524 : 207); s += 0.1) {
          const cars = train(k, up, s, steel);
          assert.ok(slack(k, up, s, steel) > -0.005, `line ${k + 1} ${up ? 'up' : 'down'} s ${s.toFixed(1)}: slack`);
          for (let n = 2; n < cars.length; n++) {
            const a = cars[n - 1]!.deck,
              b = cars[n]!.deck;
            for (const sa of [-1, 1])
              for (const sb of [-1, 1]) {
                const g = deckGap(buffer(a, sa, -1), buffer(b, sb, 1));
                assert.ok(g > 0, `line ${k + 1} ${up ? 'up' : 'down'} s ${s.toFixed(1)} cars ${n - 1}/${n}: ${g}`);
              }
            for (const side of [-1, 1]) {
              assert.ok(deckGap(buffer(a, side, -1), b) > 0, `a buffer in the next deck at ${s.toFixed(1)}`);
              assert.ok(deckGap(a, buffer(b, side, 1)) > 0, `a buffer in the deck ahead at ${s.toFixed(1)}`);
            }
          }
        }
  assert.ok(BUFFER_MIN > 0);
});

test('the couplings batch holds every train of the fleet, and the seated rider and the rack are found', () => {
  // Review, 14 November: a capacity of 12 dropped later trains' couplings; the fleet's seven trains can show 21 and
  // more (four a train with the footing wagon and the steel car).
  assert.equal(RAIL_TRAINS.length, 7);
  assert.equal(couplingCapacity(RAIL_TRAINS.length), 28);
  assert.ok(couplingCapacity(RAIL_TRAINS.length) >= 21);
  const view = fs.readFileSync('src/entities/railway/train-view.ts', 'utf8');
  assert.match(view, /createCouplings\(owner, couplingCapacity\(RAIL_TRAINS\.length\)\)/);
  // A seated rider is aboard by their chair's platform, not by the deck under their feet (#1783 let a sitter ask
  // for a stop; the bell that answers them still looked at the deck).
  const deck = {},
    other = {};
  assert.equal(ridesOn(deck, [{ platform: other }, { platform: deck }]), true);
  assert.equal(ridesOn(null, [{ platform: deck }]), false);
  assert.equal(ridesOn(other, [{ platform: deck }]), false);
  assert.match(view, /function riderOf[\s\S]{0,400}ridesOn\(aboard\(\), carsOf\(tr\)\)/);
  const platforms = fs.readFileSync('src/physics/platforms.ts', 'utf8');
  assert.match(platforms, /export const aboard = \(\) => carry\.on \?\? carry\.seat;/);
  // The passenger car leaves the flatbed's rack undrawn by its name, not its place among the flatbed's pieces.
  const kit = fs.readFileSync('src/place/look-kit.ts', 'utf8');
  assert.match(kit, /add\(flatbed, 'flat_black', BLACK\)\.name = FLAT_RACK;/);
  assert.match(fs.readFileSync('src/entities/railway/car-kit.ts', 'utf8'), /getObjectByName\(FLAT_RACK\)/);
  assert.match(view, /carKit\.passengerCar\(PASSENGER_CAR_UPGRADED, car\.rock\)/);
  assert.equal(FLAT_RACK, 'flat_rack');
});
