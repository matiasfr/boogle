// A train's vehicles as the view stands them (src/entities/railway/train-view.ts with car-spacing.ts): each posed on
// the 2.2 m chord of its axles, spaced by metres along the track it is drawn on, the couplings stretched where a bend
// would still put one deck in the next. Owner, 14 November: "on certain stops, especially with curves, the train car
// clips the train engine". Spaced by the line's metres, an up train (drawn 4 m inside a bend) stood with its engine's
// deck 0.68 m into the first car on line 1's bend and 0.98 m into it at the Quarry's stop.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMATION, LINKS, lineAt, upLat, type LinePoint } from '../src/place/layout.ts';
import {
  COUPLING_MIN,
  ENGINE_BUFFERS,
  deckAt,
  deckGap,
  spacedAlong,
  trainPlaces,
  type Deck,
  type TrackPoint,
  type Vehicle,
} from '../src/entities/railway/car-spacing.ts';
import { STEEL_CAR, TRAIN_CARS, TRAIN_OFFSETS, steelCarOffset } from '../src/entities/railway/cars.ts';
import { ENGINE_LONG_AHEAD } from '../src/entities/railway/engine.ts';
import { line2At } from '../src/entities/railway/line2-path.ts';

/** Line `k`'s drawn track: today's (lat 0) or the up track, as train-view.ts's `trackAt`. */
function trackOf(k: number, up: boolean) {
  const f = FORMATION[LINKS[k]!.id];
  const p: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  return (s: number, out: TrackPoint) => {
    if (k === 1) line2At(s, p);
    else lineAt(LINKS[k]!.line, s, p);
    const l = up ? (upLat(f, s) ?? 0) : 0;
    out.x = p.x - p.uz * l;
    out.z = p.z + p.ux * l;
  };
}
/** A train's vehicles, engine first; `steel` is the longer boiler's train: a longer nose and the steel car. */
function vehiclesOf(steel: boolean, buffers = true): Vehicle[] {
  const list = TRAIN_CARS.slice(0, 3).map((c, n) => ({
    d: TRAIN_OFFSETS[n]!,
    hx: c.hx,
    back: c.hz + (n === 0 && buffers ? ENGINE_BUFFERS : 0),
    front: c.hz + (n === 0 && steel ? ENGINE_LONG_AHEAD : 0),
  }));
  if (steel) list.push({ d: steelCarOffset(false), hx: STEEL_CAR.hx, back: STEEL_CAR.hz, front: STEEL_CAR.hz });
  return list;
}
/** The least gap between neighbours of the train at `along`; `old` is the line's metres and bare decks, as it was. */
function standing(k: number, up: boolean, along: number, steel: boolean, old = false) {
  const at = trackOf(k, up),
    vehicles = vehiclesOf(steel, !old);
  const places = old ? vehicles.map((v) => along + v.d) : trainPlaces(at, along, vehicles, [], up);
  const decks = vehicles.map((v, n): Deck =>
    deckAt(at, places[n]!, v, { x: 0, z: 0, yaw: 0, hx: 0, back: 0, front: 0 }),
  );
  return Math.min(...decks.slice(1).map((d, n) => deckGap(decks[n]!, d)));
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
