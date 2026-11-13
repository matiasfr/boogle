// Where the garage's fixed pieces stand at today's table (docs/plans/garage-install-moment.md, G2 and its design
// review): inside the server's reach for the install, off the turning deck, off both lines and off the jump-in landing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DECK_R,
  GARAGE_GEO,
  STAND_LEGS,
  STAND_PART,
  installHere,
  polarAt,
  standEnds,
  type XZ,
} from '../src/entities/railway/garage-geo.ts';
import { SHED_TABLE } from '../src/sim/railway-works-layout.ts';
import { STEEL_CAR, steelCarOffset } from '../src/entities/railway/cars.ts';
import { TRAIN_STOPS } from '../src/sim/railway-train.ts';

import { LINES, ORIGIN, lineAt } from '../src/place/layout.ts';
import { TABLE } from '../src/place/home-station.ts';
import { jumpOf } from '../src/world/railway-jump.ts';

const centre = { x: SHED_TABLE.x / 100, z: SHED_TABLE.z / 100 };
const a = GARAGE_GEO.a;
const dist = (p: XZ, q: XZ) => Math.hypot(p.x - q.x, p.z - q.z);
/** Half a sleeper (track.ts lays them 2.3 m wide). */
const SLEEPER = 1.15;
/** The nearest a point comes to either line's centre over its first 16 m. */
function offLines(p: XZ) {
  const lp = { x: 0, z: 0, ux: 0, uz: 0 };
  let best = Infinity;
  for (const l of [LINES.north, LINES.east])
    for (let s = 0; s <= 16; s += 0.1) {
      lineAt(l, s, lp);
      best = Math.min(best, dist(p, { x: lp.x + ORIGIN.x, z: lp.z }));
    }
  return best;
}
/** Points along the stand's part, end to end. */
const standAxis = () => {
  const [inner, outer] = standEnds(centre, a);
  return Array.from({ length: 33 }, (_, k) => ({
    x: inner.x + ((outer.x - inner.x) * k) / 32,
    z: inner.z + ((outer.z - inner.z) * k) / 32,
  }));
};

test('a hold at today’s post reaches the install; layout B’s post does not until the flip moves the table', () => {
  assert.ok(installHere(polarAt(centre, a.post)));
  const tableB = { x: TABLE.x + ORIGIN.x, z: TABLE.z };
  assert.ok(!installHere(polarAt(tableB, GARAGE_GEO.b.post)));
});

test('nothing fixed stands within the deck’s 4.8 m: the copy sweeps it', () => {
  // The rule's own number, not whatever the constant says (design review, call 24).
  assert.equal(DECK_R, 4.8);
  for (const p of [a.post, a.jib, ...a.crew]) assert.ok(p.r >= 5.0, `${p.bearing}° at ${p.r} m`);
  for (const p of standAxis()) assert.ok(dist(p, centre) >= 4.8, 'the part on its stand');
  const [inner] = standEnds(centre, a);
  assert.ok(dist(inner, centre) >= 4.8, 'the stand’s inner end');
  // The empty stand clears a car on line 2 (design ruling on G2, R2): legs 6 m or further out, no wider than the barrel.
  assert.ok(Math.min(...STAND_LEGS.at) >= 6.0 && STAND_LEGS.half <= 0.5);
  for (const r of STAND_LEGS.at) assert.ok(Math.abs(r - a.stand.r) <= STAND_PART.half, 'a leg under the barrel');
  // The jib's arm reaches the engine's seat wherever the table has turned it (1.9 m past the centre).
  assert.ok(a.arm >= a.jib.r + 1.9);
});

test('every piece is off both lines’ sleepers and off the jump-in landing, which has not moved', () => {
  const land = jumpOf('steel-home')!.land!;
  // TABLE_LAND (src/world/railway-jump.ts): 5.2 m east and 1.7 m south of the table's centre, on 18.1 m. The owner's.
  assert.deepEqual({ x: land.x, y: land.y, z: land.z }, { x: centre.x + 5.2, y: 18.1, z: centre.z + 1.7 });
  const points = [a.post, a.jib, ...a.crew].map((p) => polarAt(centre, p));
  for (const p of points) {
    assert.ok(offLines(p) > SLEEPER + 0.2, `a piece ${offLines(p).toFixed(2)} m from a line`);
    assert.ok(dist(p, land) >= 0.9, `a piece ${dist(p, land).toFixed(2)} m from the landing`);
  }
  // The stand's middle is off the sleepers. The 3.15 m barrel lying on it does not fit the wedge between line 2 and
  // the landing with its inner end off the deck: as built its side overhangs line 2's sleeper ends by 0.34 m (clear of
  // the rail; from v33 a standing wagon train's steel car covers that track, s 5.55 to 8.75: the next test) and passes
  // 0.316 m from the landing point. Both are pinned here so a move re-measures them; the plan's section 5 carries the
  // finding for the designer.
  assert.ok(offLines(polarAt(centre, a.stand)) > SLEEPER + 0.2);
  const barrel = standAxis();
  const toLine = Math.min(...barrel.map((p) => offLines(p) - STAND_PART.r)),
    toLand = Math.min(...barrel.map((p) => dist(p, land) - STAND_PART.r));
  assert.ok(toLine >= 0.8, `the barrel's side ${toLine.toFixed(2)} m from line 2's centre (the rail is at 0.68 m)`);
  assert.ok(toLand >= 0.3, `the barrel's side ${toLand.toFixed(2)} m from the landing`);
});

/** Where a point stands against line 2's first 16 m: its nearest s and its distance from the line's centre. */
function onLine2(p: XZ) {
  const lp = { x: 0, z: 0, ux: 0, uz: 0 };
  let best = { s: 0, d: Infinity };
  for (let s = 0; s <= 16; s += 0.01) {
    lineAt(LINES.east, s, lp);
    const d = dist(p, { x: lp.x + ORIGIN.x, z: lp.z });
    if (d < best.d) best = { s, d };
  }
  return best;
}
// The fourth car (docs/plans/fourth-car.md, R2 and the design review's findings 1 and 2): line 2's Village stop at
// 18.25 m puts the wagon train's steel car at s 5.55 to 8.75, beside the stand. Its side is a flatbed's half width
// out from line 2's centre.
test('the steel car clears the empty stand’s legs; a part waiting on the stand would graze it (call 26)', () => {
  const stop = TRAIN_STOPS[1]![0]! / 100,
    car = [stop + steelCarOffset(true) - STEEL_CAR.hz, stop + steelCarOffset(true) + STEEL_CAR.hz] as const;
  assert.deepEqual(
    car.map((v) => Math.round(v * 100)),
    [555, 875],
  );
  const beside = (p: XZ) => {
    const at = onLine2(p);
    return at.s >= car[0] && at.s <= car[1] ? at.d - STEEL_CAR.hx : Infinity;
  };
  // Each leg a box across the barrel: STAND_LEGS.half each side, 0.15 m deep along the radius (garage-view.ts).
  const bearing = (a.stand.bearing * Math.PI) / 180,
    across = { x: Math.cos(bearing), z: Math.sin(bearing) },
    radial = { x: Math.sin(bearing), z: -Math.cos(bearing) };
  let legs = Infinity;
  for (const r of STAND_LEGS.at) {
    const mid = polarAt(centre, { bearing: a.stand.bearing, r });
    for (let i = -10; i <= 10; i++)
      for (const j of [-1, 0, 1]) {
        const u = (STAND_LEGS.half * i) / 10,
          v = 0.075 * j;
        legs = Math.min(
          legs,
          beside({ x: mid.x + across.x * u + radial.x * v, z: mid.z + across.z * u + radial.z * v }),
        );
      }
  }
  assert.ok(legs >= 0.15, `the nearer leg ${legs.toFixed(2)} m from the steel car's side (the review measured 0.18)`);
  // The barrel's side against the car: 0.03 m inside it at the car's rear corner. No part waits on the stand when the
  // car exists today (the install that creates the car takes the one part); a second part would graze it. Pinned as
  // the known figure: whoever places a second part, or the Home flip, re-places the stand (design review, call 26).
  const barrel = Math.min(...standAxis().map((p) => beside(p) - STAND_PART.r));
  assert.ok(Math.abs(barrel - -0.03) <= 0.01, `the barrel's side ${barrel.toFixed(3)} m from the steel car's side`);
});
