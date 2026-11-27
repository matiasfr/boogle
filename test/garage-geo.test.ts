// Where the garage's fixed pieces stand at today's table (docs/plans/garage-install-moment.md, G2 and its design
// review): inside the server's reach for the install, off the turning deck, off both lines and off the jump-in landing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceFunction } from '../dev/level/source.ts';
import {
  DECK_R,
  GARAGE_GEO,
  STAND_LEGS,
  STAND_PART,
  garageFlip,
  garageRow,
  installHere,
  polarAt,
  standEnds,
  type XZ,
} from '../src/entities/railway/garage-geo.ts';
import { QUAY_TABLE, SHED_TABLE } from '../src/sim/railway-works-layout.ts';

import { ROTUNDA_KIT } from '../src/place/rotunda.ts';
import { STEEL_CAR, steelCarOffset } from '../src/entities/railway/cars.ts';
import { ENGINE, ENGINE_BOILER, ENGINE_LONG_AHEAD } from '../src/entities/railway/engine.ts';
import { TRAILER, TRAIN_OFFSETS } from '../src/entities/railway/cars.ts';
import { TRAIN_STOPS } from '../src/sim/railway-train.ts';

import { LINES, ORIGIN, lineAt } from '../src/place/layout.ts';
import { HEADS, STALLS, TABLE, roadAt, spurPoints, stallFrame } from '../src/place/home-station.ts';
import { jumpOf } from '../src/world/railway-jump.ts';

const centre = { x: SHED_TABLE.x / 100, z: SHED_TABLE.z / 100 };
const geo = GARAGE_GEO;
test('Port Quay turns the Home pieces together and keeps the post within install reach', () => {
  const home = garageRow();
  const quay = garageRow(1);
  const post = polarAt(quay.table, quay.geo.post);
  assert.ok(installHere(post, 1));
  assert.equal(installHere(post, 0), false);
  assert.equal(quay.geo.camBearing, 140);
  assert.equal(quay.geo.park, home.geo.park + 125);
  assert.ok(Math.hypot(post.x * 100 - QUAY_TABLE.x, post.z * 100 - QUAY_TABLE.z) <= QUAY_TABLE.reach - 40);
  for (const key of ['post', 'jib', 'stand', 'crew'] as const) {
    const old = [home.geo[key]].flat();
    const turned = [quay.geo[key]].flat();
    assert.deepEqual(
      turned,
      old.map((p) => ({ bearing: p.bearing + 125, r: p.r })),
    );
  }
});
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
  assert.deepEqual({ x: land.x, y: land.y, z: land.z }, { x: centre.x + 9.2, y: 18.1, z: centre.z + 1.7 });
  assert.ok(dist(land, centre) > DECK_R + ROTUNDA_KIT.rim);
  assert.ok(installHere(land));
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
  // Every fixed piece and the whole part clear the future kerb as well as today's disc.
  const kerb = DECK_R + ROTUNDA_KIT.rim;
  assert.equal(DECK_R, 8);
  assert.equal(b.standAlong, 'radius');
  assert.ok(Math.min(...STAND_LEGS.at) > kerb && STAND_LEGS.half <= 0.5);
  for (const p of [b.post, b.jib, ...b.crew]) assert.ok(p.r > kerb, `${p.bearing}° at ${p.r} m`);
  const [inner, outer] = standEnds(tableB, b);
  const barrel = Array.from({ length: 33 }, (_, k) => ({
    x: inner.x + ((outer.x - inner.x) * k) / 32,
    z: inner.z + ((outer.z - inner.z) * k) / 32,
  }));
  for (const p of barrel) assert.ok(dist(p, tableB) >= kerb, 'the part on its stand');
  assert.ok(Math.abs(dist(inner, tableB) - 8.725) < 0.01, 'the stand’s inner end, 8.725 m out');
  for (const r of STAND_LEGS.at) assert.ok(Math.abs(r - b.stand.r) <= STAND_PART.half, 'a leg under the barrel');
  const shift = (TRAIN_OFFSETS[0]! + ENGINE.hz - TRAILER.hz) / 2;
  // Execute the actual nose choice: the retained camera chooses a different closed pose from the old plan's 130°.
  // A bystander's accepted install uses that pose; the installer uses the camera pose. Both need a supported hook.
  const cams = sourceFunction<{ engine: { pos: number[] } }>('src/entities/railway/garage-view.ts', 'CAMS', {});
  const camPhi = Math.atan2(cams.engine.pos[0]!, cams.engine.pos[2]! - shift);
  const camYaw = (s: number) => Math.PI - (b.camBearing * Math.PI) / 180 - s * camPhi;
  const rest = stallFrame(STALLS.open).yaw;
  const pose = rest + garageFlip(rest, camYaw(1));
  const hookAlong = TRAIN_OFFSETS[0]! - shift + (ENGINE_BOILER.zBack + ENGINE_BOILER.zFront + ENGINE_LONG_AHEAD) / 2;
  const jib = polarAt({ x: 0, z: 0 }, b.jib);
  for (const yaw of [pose, camYaw(1)]) {
    const dx = Math.sin(yaw) * hookAlong - jib.x,
      dz = Math.cos(yaw) * hookAlong - jib.z;
    const reach = Math.hypot(dx, dz);
    // The beam ends 0.2 m before its nominal length; the 0.3 m trolley remains world-axis aligned.
    const trolleyHalf = (0.15 * (Math.abs(dx) + Math.abs(dz))) / reach;
    assert.ok(reach + trolleyHalf <= b.arm - 0.2, `hook ${reach.toFixed(3)} m plus trolley must stay on the arm`);
  }
  // The jib and the crew stand behind the stand, on its bearing or within 4° of it.
  assert.ok(b.jib.r > b.stand.r + STAND_PART.half && b.jib.bearing === b.stand.bearing);
  for (const p of b.crew) assert.ok(p.r > b.stand.r + STAND_PART.half && Math.abs(p.bearing - b.stand.bearing) <= 4);
  // The landing stays outside the enlarged kerb, on the same side.
  const land = { x: tableB.x + 9.2, z: tableB.z + 1.7 };
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
