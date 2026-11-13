// Where the garage's fixed pieces stand at today's table (docs/plans/garage-install-moment.md, G2 and its design
// review): inside the server's reach for the install, off the turning deck, off both lines and off the jump-in landing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DECK_R,
  GARAGE_GEO,
  STAND_LEGS,
  STAND_PART,
  garageRow,
  installHere,
  polarAt,
  standEnds,
  type XZ,
} from '../src/entities/railway/garage-geo.ts';
import { SHED_TABLE } from '../src/sim/railway-works-layout.ts';
import { STEEL_CAR, steelCarOffset } from '../src/entities/railway/cars.ts';
import { TRAIN_STOPS } from '../src/sim/railway-train.ts';

import { LINES, ORIGIN, lineAt } from '../src/place/layout.ts';
import { HEADS, STALLS, TABLE, roadAt, spurPoints, stallFrame } from '../src/place/home-station.ts';
import { jumpOf } from '../src/world/railway-jump.ts';

const centre = { x: SHED_TABLE.x / 100, z: SHED_TABLE.z / 100 };
const geo = GARAGE_GEO;
const dist = (p: XZ, q: XZ) => Math.hypot(p.x - q.x, p.z - q.z);
/** Half a sleeper (track.ts lays them 2.3 m wide). */
const SLEEPER = 1.15;
/** Points along the stand's part, end to end. */
const standAxis = () => {
  const [inner, outer] = standEnds(centre, geo);
  return Array.from({ length: 33 }, (_, k) => ({
    x: inner.x + ((outer.x - inner.x) * k) / 32,
    z: inner.z + ((outer.z - inner.z) * k) / 32,
  }));
};

test('a hold at the garage post reaches the install; its table and landing match the rules', () => {
  const row = garageRow();
  assert.equal(row.geo, geo);
  assert.deepEqual(row.table, { x: TABLE.x + ORIGIN.x, z: TABLE.z });
  assert.ok(
    Math.abs(row.table.x - centre.x) <= 0.005 && Math.abs(row.table.z - centre.z) <= 0.005,
    'same table to the centimetre',
  );
  assert.ok(installHere(polarAt(row.table, geo.post)));
  const land = jumpOf('steel-home')!.land!;
  assert.deepEqual({ x: land.x, y: land.y, z: land.z }, { x: centre.x + 5.2, y: 18.1, z: centre.z + 1.7 });
});

// Home's sweep, legs and landing rules, against both heads, the spur and the three stall roads.
test('nothing within the deck’s sweep, legs under the barrel, off every track and the landing', () => {
  const b = geo,
    tableB = { x: TABLE.x, z: TABLE.z };
  const track: XZ[] = [];
  for (const road of [0, 1] as const) for (let s = -6; s <= HEADS[road].join; s += 0.1) track.push(roadAt(road, s));
  track.push(...spurPoints());
  for (const bearing of STALLS.bearings) {
    const f = stallFrame(bearing);
    for (let k = 0; k <= 40; k++)
      track.push({ x: f.rim.x + ((f.back.x - f.rim.x) * k) / 40, z: f.rim.z + ((f.back.z - f.rim.z) * k) / 40 });
  }
  const offTrack = (p: XZ) => Math.min(...track.map((t) => dist(t, p)));
  // The sweep: the post, jib and crew 5 m or further out; the part on its radial stand wholly outside 4.8 m.
  assert.equal(DECK_R, 4.8);
  assert.equal(b.standAlong, 'radius');
  assert.ok(Math.min(...STAND_LEGS.at) >= 6.0 && STAND_LEGS.half <= 0.5);
  for (const p of [b.post, b.jib, ...b.crew]) assert.ok(p.r >= 5.0, `${p.bearing}° at ${p.r} m`);
  const [inner, outer] = standEnds(tableB, b);
  const barrel = Array.from({ length: 33 }, (_, k) => ({
    x: inner.x + ((outer.x - inner.x) * k) / 32,
    z: inner.z + ((outer.z - inner.z) * k) / 32,
  }));
  for (const p of barrel) assert.ok(dist(p, tableB) >= DECK_R, 'the part on its stand');
  assert.ok(Math.abs(dist(inner, tableB) - 4.925) < 0.01, 'the stand’s inner end, 4.93 m out');
  for (const r of STAND_LEGS.at) assert.ok(Math.abs(r - b.stand.r) <= STAND_PART.half, 'a leg under the barrel');
  assert.ok(b.arm >= b.jib.r + 1.9, 'the arm reaches the engine’s seat past the centre');
  // The jib and the crew stand behind the stand, on its bearing or within 4° of it.
  assert.ok(b.jib.r > b.stand.r + STAND_PART.half && b.jib.bearing === b.stand.bearing);
  for (const p of b.crew) assert.ok(p.r > b.stand.r + STAND_PART.half && Math.abs(p.bearing - b.stand.bearing) <= 4);
  // The landing follows the table at the flip (TABLE_LAND: 5.2 m east, 1.7 m south of the centre).
  const land = { x: tableB.x + 5.2, z: tableB.z + 1.7 };
  for (const p of [b.post, b.jib, ...b.crew].map((q) => polarAt(tableB, q))) {
    assert.ok(offTrack(p) > SLEEPER + 0.2, `a piece ${offTrack(p).toFixed(2)} m from a track`);
    assert.ok(dist(p, land) >= 0.9, `a piece ${dist(p, land).toFixed(2)} m from the landing`);
  }
  const toTrack = Math.min(...barrel.map((p) => offTrack(p) - STAND_PART.r)),
    toLand = Math.min(...barrel.map((p) => dist(p, land) - STAND_PART.r));
  assert.ok(toTrack >= 5, `the barrel's side ${toTrack.toFixed(2)} m from the nearest track`);
  assert.ok(toLand >= 1.5, `the barrel's side ${toLand.toFixed(2)} m from the landing`);
});

// The fourth car (docs/plans/fourth-car.md, R2 and the design review's findings 1 and 2): line 2's Village stop at
// 18.25 m puts the wagon train's steel car at s 5.55 to 8.75. The new station moves the stand clear of it.
test('the steel car clears the empty stand’s legs and a part waiting on the stand', () => {
  const stop = TRAIN_STOPS[1]![0]! / 100,
    car = [stop + steelCarOffset(true) - STEEL_CAR.hz, stop + steelCarOffset(true) + STEEL_CAR.hz] as const;
  assert.deepEqual(
    car.map((v) => Math.round(v * 100)),
    [555, 875],
  );
  // Exact planar distance to the standing car's rectangular footprint, including its ends. The Home head
  // is straight over this span; all samples use the same world frame as the stand and the sim table.
  const carCentre = { x: 0, z: 0, ux: 0, uz: 0 };
  lineAt(LINES.east, (car[0] + car[1]) / 2, carCentre);
  const beside = (p: XZ) => {
    const dx = p.x - carCentre.x - ORIGIN.x,
      dz = p.z - carCentre.z;
    const along = dx * carCentre.ux + dz * carCentre.uz,
      across = -dx * carCentre.uz + dz * carCentre.ux;
    return Math.hypot(Math.max(0, Math.abs(along) - STEEL_CAR.hz), Math.max(0, Math.abs(across) - STEEL_CAR.hx));
  };
  // Each leg a box across the barrel: STAND_LEGS.half each side, 0.15 m deep along the radius (garage-view.ts).
  const bearing = (geo.stand.bearing * Math.PI) / 180,
    across = { x: Math.cos(bearing), z: Math.sin(bearing) },
    radial = { x: Math.sin(bearing), z: -Math.cos(bearing) };
  let legs = Infinity;
  for (const r of STAND_LEGS.at) {
    const mid = polarAt(centre, { bearing: geo.stand.bearing, r });
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
  assert.ok(Number.isFinite(legs) && legs >= 0.15, `the nearer leg ${legs.toFixed(2)} m from the steel car`);
  // A part's radius grows its centreline into the full barrel footprint; require positive clearance rather than
  // the old Home's known 0.03 m overlap. Finite distance also rules out a vacuous pass when no sample is abeam.
  const barrel = Math.min(...standAxis().map((p) => beside(p) - STAND_PART.r));
  assert.ok(Number.isFinite(barrel) && barrel > 0, `the barrel's side ${barrel.toFixed(3)} m from the steel car`);
});
