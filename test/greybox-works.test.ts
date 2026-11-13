// The greybox's line-2 works (docs/world/map-prototypes.html `common.works`) and panel rides: pinned to the railway's
// catalog and Place's real rails, read-only, never solid.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EAST, LINES, LINKS, ORIGIN, STUB, lineAt } from '../src/place/layout.ts';
import {
  WORKS_BREAKER,
  WORKS_SEAMS,
  SHED_STALL,
  SHED_TABLE,
  WORKS_CLEFT,
  WORKS_KILN,
  WORKS_ROCKS,
  WORKS_RACK,
  PIER_STOP,
  PIER_RACK,
  PIER_FRAME,
  CROSSING_BENTS,
} from '../src/sim/railway-works-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { distToLine, layout, parseMapPage, polyLen, rideSeconds, type XZ } from '../src/proto/greybox/map-data.ts';
import {
  CART_Q4_S,
  rideLength,
  ridePoints,
  rideModelSeconds,
  legLength,
  workRides,
} from '../src/proto/greybox/rides.ts';

const page = readFileSync(new URL('../docs/world/map-prototypes.html', import.meta.url), 'utf8');
const data = parseMapPage(page);
const works = data.common.works ?? [];
const railOf = (line: 'l1' | 'l2') => (line === 'l1' ? LINES.north : LINES.east);
const l2: XZ[] = [
  ...data.common.lines.find((l) => l.id === 'l2a')!.pts,
  ...data.common.lines.find((l) => l.id === 'l2b')!.pts,
];

test('works: ids are unique and the greybox layout carries them', () => {
  assert.ok(works.length >= 16);
  assert.equal(new Set(works.map((w) => w.id)).size, works.length);
  assert.equal(layout(data, 'sickle').works.length, works.length);
  for (const id of ['Q4', 'Q5', 'Q6', 'halt-far-head', 'lever', 'sea-switch', 'pack', 'boiler', 'old-train'])
    assert.ok(
      works.some((w) => w.id === id),
      id,
    );
});

test('works: every frame mark with a catalog id lies within 8 m of the catalog x/z', () => {
  let n = 0;
  for (const st of LINE2_STATIONS) {
    const w = works.find((m) => m.kind === 'frame' && m.id === st.id);
    assert.ok(w, `${st.id} has a mark`);
    const d = Math.hypot(w.at[0] - (st.x / 100 - ORIGIN.x), w.at[1] - (st.z / 100 - ORIGIN.z));
    assert.ok(d <= 8, `${st.id} is ${d.toFixed(1)} m from the catalog`);
    n++;
  }
  assert.equal(n, LINE2_STATIONS.length);
});

test('works: every `s` is on its rail, within 3 m of its stated offset, and line 2 stays near the JSON line', () => {
  for (const w of works.filter((m) => m.s !== undefined)) {
    assert.ok(w.line && w.off !== undefined, `${w.id} gives its line and offset`);
    const rail = railOf(w.line);
    assert.ok(w.s! >= 0 && w.s! <= rail.len, `${w.id}: s ${w.s} is on the line`);
    const p = { x: 0, z: 0, ux: 0, uz: 0 };
    lineAt(rail, w.s!, p);
    const d = Math.hypot(w.at[0] - p.x, w.at[1] - p.z);
    assert.ok(d <= w.off! + 3, `${w.id} stands ${d.toFixed(1)} m from its rail at s (offset ${w.off})`);
    // The JSON line is a coarse polyline of Place's curved east line (up to ~9 m apart); line 1's JSON is a chord.
    if (w.line === 'l2') assert.ok(distToLine([p.x, p.z], l2) <= 10, `${w.id}'s rail point is off the JSON line 2`);
  }
});

test('works: the unlaid stretch is the built line the greybox never draws as solids, and the works block is not solid', () => {
  for (const id of ['l2a', 'l2b']) assert.equal(data.common.lines.find((l) => l.id === id)!.kind, 'built');
  const src = readFileSync(new URL('../src/proto/greybox/build.ts', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf('// ---- line-2 works'), src.indexOf('// ---- gates'));
  assert.ok(block.length > 500);
  assert.ok(!/\bsolid\(/.test(block), 'no solid() in the works block');
  const calls = block.match(/boxes\([^;]*\);/g) ?? [];
  assert.ok(calls.length >= 3);
  for (const c of calls) assert.ok(/,\s*false\)\s*;$/.test(c), `boxes call is non-solid: ${c.slice(0, 50)}`);
});

test('rides: legs match the rails (±2 m) and the plan sums', () => {
  const rides = workRides(data.ride);
  assert.deepEqual(
    rides.map((r) => r.id),
    ['cart', 'train2', 'boiler'],
  );
  const E = LINES.east.len;
  for (const r of rides) {
    for (const leg of r.legs) {
      const len = LINES[leg.line].len;
      assert.ok(leg.from >= 0 && leg.from <= len && leg.to >= 0 && leg.to <= len, `${r.id}/${leg.stop} is on its line`);
    }
    const pts = ridePoints(r, 2);
    const path = polyLen(pts.map(([x, , z]) => [x, z] as XZ));
    assert.ok(
      Math.abs(path - rideLength(r)) <= 2,
      `${r.id}: path ${path.toFixed(1)} m vs legs ${rideLength(r).toFixed(1)} m`,
    );
  }
  const [cart, train, boiler] = rides;
  // The cart: camp to the turntable down line 1, then out along line 2 to the Q4 rack (depot.ts L1_FROM, stopFor).
  assert.deepEqual(cart!.legs.map(legLength), [STUB.camp + 5, EAST.quarry - 13]);
  assert.equal(CART_Q4_S, EAST.quarry - 13);
  // The train: the quarry's `stops` and the Far Head stop, then the pier at the line's end.
  const stops = LINKS.find((l) => l.id === 'quarry')!.stops;
  assert.deepEqual(stops, [18.25, EAST.quarry - 4, EAST.headStop]);
  assert.deepEqual(train!.legs.map(legLength), [stops[1]! - stops[0]!, stops[2]! - stops[1]!, E - stops[2]!]);
  assert.ok(Math.abs(rideLength(train!) - (E - 18.25)) <= 2);
  assert.ok(Math.abs(rideModelSeconds(train!) - rideSeconds(data.ride, train!.legs.map(legLength))) < 0.01);
  // The boiler: 546 m home in about 98 s, then on to the old train at the camp.
  assert.equal(legLength(boiler!.legs[0]!), EAST.head);
  assert.ok(Math.abs(legLength(boiler!.legs[0]!) / boiler!.mps - 98) < 0.01);
});

test('works: Split-rock and Roundhouse marks agree with every pinned catalog position', () => {
  const expected = {
    breaker: WORKS_BREAKER,
    'stall-slab': WORKS_SEAMS[0],
    stall: SHED_STALL,
    turntable: SHED_TABLE,
    seam: WORKS_SEAMS[1],
    cleft: WORKS_CLEFT,
    kiln: WORKS_KILN,
    'works-rocks': WORKS_ROCKS[0],
    'works-rack': WORKS_RACK,
    'pier-stop': PIER_STOP,
    'pier-rack': PIER_RACK,
    'pier-frame': PIER_FRAME,
    bents: CROSSING_BENTS[0],
  };
  const marks = works.filter((w) => w.kind === 'works');
  assert.deepEqual(marks.map((w) => w.id).sort(), Object.keys(expected).sort());
  for (const [id, p] of Object.entries(expected)) {
    const mark = marks.find((w) => w.id === id)!;
    assert.ok(Math.hypot(mark.at[0] - (p.x / 100 - ORIGIN.x), mark.at[1] - (p.z / 100 - ORIGIN.z)) <= 1, id);
  }
});
