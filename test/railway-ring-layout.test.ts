// Ring Island build 1's layout (src/sim/railway-ring-layout.ts; docs/plans/ring-island-build1.md, step 1): the bow, the
// path on from the pier, the railheads, recovery, the hook's reach and the walkway. The level envelopes (jumps, glides,
// ramp grades) are dev/level/ring.ts's report.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CROSSING_BENTS, CROSSING_DECK_Y } from '../src/sim/railway-works-layout.ts';
import { RAIL_LINES, TRAIN_EXTENT, TURNOUT_CM } from '../src/sim/railway-lines.ts';
import { TRAIN } from '../src/sim/railway-train.ts';
import { ringHeight } from '../src/proto/greybox/ring-cones.ts';
import { FORMATION, ORIGIN } from '../src/place/layout.ts';

import {
  RING_BENTS,
  RING_BRACE_PLATFORM,
  RING_END,
  RING_GAP,
  RING_HALT,
  RING_HEAD,
  RING_HOOK,
  RING_PATH,
  RING_PIER_UP,
  RING_Q7_FRAME,
  RING_RECOVERY,
  RING_S_HEAD,
  RING_WALK,
  ringAt,
  ringDeckY,
} from '../src/sim/railway-ring-layout.ts';

const dist = (ax: number, az: number, bx: number, bz: number) =>
  Math.sqrt((ax - bx) * (ax - bx) + (az - bz) * (az - bz));
// Line 2's path up to the pier head (v26's): from v27 the catalog's path runs on with RING_PATH appended.
const line2 = RAIL_LINES[1]!.path.slice(0, RAIL_LINES[1]!.path.length - RING_PATH.length);
/** Line 2's path at s cm, lat cm east of it (its 10 m chords, as railLinePoint reads them). */
function onLine2(s: number, lat: number) {
  const k = Math.floor(s / 1000),
    t = s / 1000 - k;
  const dx = line2[2 * k + 2]! - line2[2 * k]!,
    dz = line2[2 * k + 3]! - line2[2 * k + 1]!,
    n = Math.sqrt(dx * dx + dz * dz);
  return { x: line2[2 * k]! + dx * t - (dz / n) * lat, z: line2[2 * k + 1]! + dz * t + (dx / n) * lat };
}

test('the bow: the crossing at bents 1-6, 4% between bents, 8.0 m from u 428 m', () => {
  for (let n = 1; n <= 6; n++) assert.equal(ringDeckY(2000 * n), CROSSING_DECK_Y[n - 1]);
  for (let n = 1; n <= 6; n++) {
    const c = ringAt(2000 * n, -200);
    assert.ok(dist(c.x, c.z, CROSSING_BENTS[n - 1]!.x, CROSSING_BENTS[n - 1]!.z) <= 1, `bent ${n} on the datum`);
  }
  for (let n = 1; n < 13; n++) {
    const drop = ringDeckY(2000 * n) - ringDeckY(2000 * (n + 1));
    assert.ok(Math.abs(drop - 80) <= 1, `bent ${n} to ${n + 1}: ${drop} cm in 20 m`);
  }
  assert.deepEqual(
    RING_BENTS.map((b) => b.y),
    [1950, 1870, 1790, 1710, 1630, 1550, 1470],
  );
  for (let u = 42800; u <= 50000; u += 100) assert.equal(ringDeckY(u), 800);
  assert.ok(ringDeckY(42700) > 800);
});

test('the path runs on from line 2 every 10 m of s', () => {
  const n = line2.length / 2;
  // Line 2's path ends at s (n - 1) * 10 m; the ring's first point is the next 10 m sample, on the ring's track.
  const next = (n - 1) * 1000 + 1000,
    first = ringAt(next - RING_S_HEAD);
  assert.ok(dist(RING_PATH[0]!, RING_PATH[1]!, first.x, first.z) <= 1);
  for (let i = 1; i < RING_PATH.length / 2; i++) {
    const d = dist(RING_PATH[2 * i - 2]!, RING_PATH[2 * i - 1]!, RING_PATH[2 * i]!, RING_PATH[2 * i + 1]!);
    assert.ok(Math.abs(d - 1000) <= 5, `point ${i}: ${d.toFixed(1)} cm`);
  }
  // The joint chord from line 2's last point: 11.55 m, the pier's 1.55 m datum offset (its path ends 3.55 m short
  // of the pier head at s 740 m, which is 2 m short of RING_S_HEAD).
  const j = dist(line2[2 * n - 2]!, line2[2 * n - 1]!, RING_PATH[0]!, RING_PATH[1]!);
  assert.ok(j > 1000 && j < 1200, `joint chord ${j.toFixed(0)} cm`);
  const end = ringAt(RING_HALT.u1);
  assert.deepEqual(RING_PATH.slice(-2), [end.x, end.z]);
});

test('the pier up platform and Q7 frame stand on line 2 where planned', () => {
  const up = onLine2(72050, -690),
    frame = onLine2(71000, 450);
  assert.ok(dist(up.x, up.z, RING_PIER_UP.x, RING_PIER_UP.z) <= 1);
  assert.ok(dist(frame.x, frame.z, RING_Q7_FRAME.x, RING_Q7_FRAME.z) <= 1);
});

test('railheads: 20 m apart, rack to jib 15 m', () => {
  for (let k = 0; k < RING_HEAD.length; k++) {
    const h = RING_HEAD[k]!;
    // The plan's "within 1500 cm" can't hold at its own positions: 15 m along u and 1.2 m across (lat 4.8 to 3.6)
    // is 1504.8 cm. Held at 1510 (the 15 m carry plus the cm grid).
    assert.ok(dist(h.rack.x, h.rack.z, h.jib.x, h.jib.z) <= 1510, `k ${k}`);
    if (k) assert.equal(h.s - RING_HEAD[k - 1]!.s, 2000);
    assert.equal(h.u, 12000 + 2000 * k);
  }
  assert.equal(RING_HEAD[0]!.u, 12000);
  assert.equal(RING_HEAD[7]!.u, 26000);
});

test('every recovery point stands on a planned deck or on island ground over 50 cm above the sea', () => {
  const inv = (x: number, z: number) => {
    // ringAt's inverse (orthogonal unit axes).
    const dx = x - 140200,
      dz = z + 37200,
      k = Math.sqrt(1 + 0.0272 * 0.0272);
    return { u: (0.0272 * dx - dz) / k, lat: (dx + 0.0272 * dz) / k };
  };
  const decks = [
    { ...RING_BRACE_PLATFORM },
    { u0: RING_HALT.u0, u1: RING_HALT.u1, lat0: RING_HALT.upLat[0], lat1: RING_HALT.upLat[1], y: 890 },
    { u0: RING_HALT.u0, u1: RING_HALT.u1, lat0: RING_HALT.downLat[0], lat1: RING_HALT.downLat[1], y: 890 },
  ];
  for (const p of RING_RECOVERY) {
    const { u, lat } = inv(p.x, p.z);
    const deck = decks.find((d) => u >= d.u0 && u <= d.u1 && lat >= d.lat0 && lat <= d.lat1 && d.y === p.y);
    const ground = ringHeight(p.x / 100 - ORIGIN.x, p.z / 100 - ORIGIN.z) * 100;
    const onGround = ground > 50 && p.y >= ground - 10 && p.y <= ground + 50;
    assert.ok(deck || onGround, `(${p.x}, ${p.y}, ${p.z}): ground ${ground.toFixed(0)} cm`);
  }
});

test('the hook ring is in reach of all four brace-platform corners at eye height', () => {
  const b = RING_BRACE_PLATFORM;
  for (const u of [b.u0, b.u1])
    for (const lat of [b.lat0, b.lat1]) {
      const c = ringAt(u, lat),
        dy = RING_HOOK.y - (b.y + 170);
      const d = Math.sqrt(
        (c.x - RING_HOOK.x) * (c.x - RING_HOOK.x) + (c.z - RING_HOOK.z) * (c.z - RING_HOOK.z) + dy * dy,
      );
      assert.ok(d <= 2300, `corner u ${u} lat ${lat}: ${d.toFixed(0)} cm`);
    }
});

test('the walkway the railhead leaves behind only grows', () => {
  for (let k = 1; k < RING_HEAD.length; k++) {
    const a = RING_WALK(k - 1),
      b = RING_WALK(k);
    assert.ok(b.u0 <= a.u0 && b.u1 >= a.u1 && b.lat0 <= a.lat0 && b.lat1 >= a.lat1, `k ${k}`);
    // and the whole platform the railhead left (u - 25 m..u) is walkway now: nobody on it is left over the sea
    const old = RING_HEAD[k - 1]!.u;
    assert.ok(
      b.u1 >= old && b.u0 <= old - 2500,
      `k ${k}: walkway ${b.u0}..${b.u1}, old platform ${old - 2500}..${old}`,
    );
  }
});

test('the island ends in buffers 15 m past the platforms, a crossover before them', () => {
  const E = RING_END;
  // Rail-map's long train: the longer boiler ahead, three cargo cars behind (docs/plans/rail-map.md, the station plan).
  const LONG = { aheadCm: 820, behindCm: 1270 };
  assert.ok(LONG.aheadCm >= TRAIN_EXTENT.aheadCm && LONG.behindCm >= TRAIN_EXTENT.behindCm);
  assert.equal(E.bufferU, RING_HALT.u1 + 1500);
  assert.deepEqual(E.buffers[0], { ...ringAt(E.bufferU, -400), y: 940 });
  assert.deepEqual(E.buffers[1], { ...ringAt(E.bufferU, 0), y: 940 });
  assert.equal(E.u, (RING_HALT.u0 + RING_HALT.u1) / 2);
  assert.equal(E.s, RING_S_HEAD + E.u);
  assert.equal(E.mergeCm, RING_S_HEAD + E.cross.u0);
  // As long as Far Head's crossover, at least a turnout, and clear of the platforms.
  const q = FORMATION.quarry.crossover!;
  assert.equal(E.cross.u1 - E.cross.u0, (q[1] - q[0]) * 100);
  assert.ok(E.cross.u1 - E.cross.u0 >= TURNOUT_CM);
  assert.ok(E.cross.u1 <= RING_HALT.u0);
  for (const t of [TRAIN_EXTENT, LONG]) {
    const nose = E.u + t.aheadCm,
      tail = E.u - t.behindCm;
    assert.ok(tail - E.cross.u1 >= 500, `tail ${tail} clear of the crossover`);
    assert.ok(E.bufferU - nose >= 1470, `nose ${nose} short of the buffers`);
    assert.ok(tail >= RING_HALT.u0 && nose <= RING_HALT.u1, `beside the platforms: ${tail}..${nose}`);
    // A train held at the signal: its nose at the crossover's first point.
    const held = E.mergeCm - t.aheadCm - t.behindCm;
    assert.ok(held - RING_HEAD[7]!.s >= TRAIN.sepCm, `held tail ${held} past the railhead's stop`);
    assert.ok(held - (RING_S_HEAD + RING_GAP.hinge) >= 2000, `held tail ${held} past the hinge`);
  }
  // endBlocks keeps the catalog's signal: it stands at least sepCm short of the stop.
  assert.ok(E.mergeCm - TRAIN_EXTENT.aheadCm <= E.s - TRAIN.sepCm);
  for (let u = E.bed.u0; u <= E.bed.u1; u += 50) assert.equal(ringDeckY(u), 800, `deck at u ${u}`);
  assert.equal(E.bed.y, 800);
  // Nothing west of the formation (the station house's terrace is at lat -9.3): ringAt's inverse lat.
  const lat = (x: number, z: number) => (x - 140200 + 0.0272 * (z + 37200)) / Math.sqrt(1 + 0.0272 * 0.0272);
  assert.ok(E.bed.lat0 >= -580);
  for (const p of [...E.buffers, E.board]) assert.ok(lat(p.x, p.z) >= -581, `(${p.x}, ${p.z})`);
  // The world positions, pinned once.
  const pinned: [{ x: number; z: number }, number, number][] = [
    [E.buffers[0], 141113, -85493],
    [E.buffers[1], 141513, -85482],
    [E.board, 141317, -85638],
  ];
  for (const [p, x, z] of pinned) assert.ok(dist(p.x, p.z, x, z) <= 1, `(${p.x}, ${p.z}) against (${x}, ${z})`);
  assert.equal(E.board.y, 890);
  assert.equal(E.cut, 750);
});
