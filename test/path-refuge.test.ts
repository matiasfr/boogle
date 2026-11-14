// Where the commuters on line 1's track bed stand for a train (src/entities/railway/path-refuge.ts): every refuge along
// the whole path holds their feet and is clear of every car on either track.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FORMATION, LINKS, STUB, lineAt, railY, upLat } from '../src/place/layout.ts';
import { H } from '../src/place/terrain.ts';
import { besideLine } from '../src/entities/railway/line-geometry.ts';
import { STEEL_CAR, TRAIN_CARS } from '../src/entities/railway/cars.ts';
import { REFUGE_CLEAR, pathRefuges } from '../src/entities/railway/path-refuge.ts';

// sites.ts `outOf`, which folk.ts gives way with (that module loads the page's styles, so its arithmetic is repeated
// here): whether a point is inside the footprint grown by `r`.
type Foot = { x: number; z: number; c: number; s: number; hw: number; hd: number };
const inside = (f: Foot, p: { x: number; z: number }, r: number) => {
  const dx = p.x - f.x,
    dz = p.z - f.z;
  return f.hw + r - Math.abs(dx * f.c - dz * f.s) > 0 && f.hd + r - Math.abs(dx * f.s + dz * f.c) > 0;
};
const line = LINKS[0]!.line;
const up = (s: number) => upLat(FORMATION[LINKS[0]!.id], s) ?? 0;
const FROM = 30,
  TO = STUB.camp;
// A sample every 0.25 m: twice as fine as the view's own table.
const refuges = pathRefuges(line, FROM, TO, { H, up, beside: besideLine }, 0.25);
const over = (s: number, l: number) => {
  const at = besideLine(line, s, l);
  return railY(line, s) - H(at.x, at.z);
};

test('every refuge along the path has a support within 5 cm of the feet', () => {
  let ground = 0,
    deck = 0;
  refuges.samples.forEach((r, k) => {
    if (!r) return;
    const s = refuges.sOf(k);
    const at = besideLine(line, s, r.lat);
    // The plank deck runs where either track's bed is over a metre above the ground (track.ts `deck`): its top is 0.1 m
    // over the rail height, 3.6 m wide on one track and the whole formation's width on two.
    const ul = up(s);
    const decked = over(s, 0) > 1 || (ul <= -0.5 && over(s, ul) > 1);
    const onDeck = decked && Math.abs(r.lat - ul / 2) <= (3.6 + Math.abs(ul)) / 2;
    const support = onDeck ? railY(line, s) + 0.1 : H(at.x, at.z);
    assert.ok(
      Math.abs(r.y - support) <= 0.05,
      `s ${s.toFixed(2)}: feet ${r.y.toFixed(3)}, support ${support.toFixed(3)}`,
    );
    assert.equal(r.on, onDeck ? 'deck' : 'ground', `s ${s.toFixed(2)}`);
    if (onDeck) deck++;
    else ground++;
  });
  // Both kinds are on the path: the ridge trestle's deck and the ground either side of it.
  assert.ok(deck > 100 && ground > 100, `${deck} deck, ${ground} ground`);
});

test('a commuter at rest in a refuge needs no give-way from a car on either track', () => {
  // folk.ts clearTraffic: a car's box widened by its racks (0.15) and ends (0.25), and the 0.38 m a walker keeps.
  const cars = [...TRAIN_CARS, STEEL_CAR];
  const point = { x: 0, z: 0, ux: 0, uz: 1 };
  const foot: Foot = { x: 0, z: 0, c: 1, s: 0, hw: 0, hd: 0 };
  let checked = 0;
  refuges.samples.forEach((r, k) => {
    if (!r) return;
    const s = refuges.sOf(k);
    const here = besideLine(line, s, r.lat);
    for (const track of up(s) < -0.5 ? [0, 1] : [0])
      for (const car of cars)
        for (let d = -8; d <= 8; d += 0.25) {
          const cs = s + d;
          if (cs < 1 || cs > line.len - 1) continue;
          const lat = track ? up(cs) : 0;
          const c = besideLine(line, cs, lat);
          lineAt(line, cs, point);
          const yaw = Math.atan2(point.ux, point.uz);
          Object.assign(foot, {
            x: c.x,
            z: c.z,
            c: Math.cos(yaw),
            s: Math.sin(yaw),
            hw: car.hx + 0.15,
            hd: car.hz + 0.25,
          });
          assert.equal(
            inside(foot, here, 0.38),
            false,
            `s ${s.toFixed(2)} lateral ${r.lat.toFixed(2)}: inside a car (hx ${car.hx}) at ${cs.toFixed(2)} on track ${track}`,
          );
          checked++;
        }
    assert.ok(
      Math.abs(r.lat) >= REFUGE_CLEAR - 1e-9 && Math.abs(r.lat - up(s)) >= REFUGE_CLEAR - 1e-9,
      `s ${s.toFixed(2)}`,
    );
  });
  assert.ok(checked > 50_000);
});

test('where the path has no refuge, the nearest one is reached inside the warning', () => {
  // folk.ts: 4.5 s of warning, hurrying at 3 m/s, then a step of at most 3.6 m at 3 m/s.
  const reach = 4.5 * 3 - 3.6;
  let longest = 0;
  refuges.samples.forEach((r, k) => {
    if (r) return;
    const go = refuges.go(refuges.sOf(k));
    assert.notEqual(go, 0, `s ${refuges.sOf(k).toFixed(2)} has no refuge and none to walk to`);
    let d = 0;
    while (!refuges.samples[k + go * d]) d++;
    longest = Math.max(longest, d * 0.25);
  });
  assert.ok(
    longest > 0 && longest <= reach,
    `the farthest refuge is ${longest} m away; ${reach.toFixed(1)} m is in reach`,
  );
});
