// The line catalog (docs/plans/generic-lines.md, step 1): its stops, ends, signals, platforms and paths hang together.
// Where its halts and paths stand against Place's layout is railway-train.test.ts's; Ring Island's, railway-ring-layout's.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RAIL_HALTS,
  RAIL_LINES,
  TRAIN_EXTENT,
  TURNOUT_CM,
  BALANCE_MAX_TICKS,
  balanceOk,
  PIER_EAST,
  haltPlatform,
  trainPlaces,
  LINE2_ON,
} from '../src/sim/railway-lines.ts';
import {
  RING_END,
  RING_END_BRAKE_CMS2,
  RING_HALT,
  RING_HEAD,
  RING_JOINT_UP,
  RING_PATH,
} from '../src/sim/railway-ring-layout.ts';
import { LINE2_ROWS, line2Stops } from './helpers/rail-rows.ts';
import { TRAIN_CARS, TRAIN_OFFSETS, TRAIN_TAIL_M } from '../src/entities/railway/cars.ts';
import { ENGINE_LONG_AHEAD } from '../src/entities/railway/engine.ts';
import { FORMATION, TURNOUT } from '../src/place/layout.ts';
import { WORLD_LINES } from '../src/sim/railway-world-lines.ts';
import { TRAIN, TRAIN_STOPS, trainStopsOf } from '../src/sim/railway-train.ts';
import { railLinePoint } from '../src/sim/railway-line-path.ts';
import { PIER_STOP_CM } from '../src/sim/railway-works-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';

/** Line 1's stops and line 2's to the Pier, the catalog's (railway-train.test.ts holds them to Place's layout). */
const V25_STOPS = [TRAIN_STOPS[0]!, [...TRAIN_STOPS[1]!.slice(0, 3), PIER_STOP_CM]];
test('the pier opens with Q6, as v25 (BEFORE_PIER); the Railhead with Q7', () => {
  assert.deepEqual(trainStopsOf(0, false), V25_STOPS[0]);
  assert.deepEqual(trainStopsOf(0, true), V25_STOPS[0]);
  assert.deepEqual(trainStopsOf(1, false), V25_STOPS[1]!.slice(0, 3));
  assert.deepEqual(trainStopsOf(1, true), V25_STOPS[1]);
  // By count of complete QJob slots: the pier is slot 5, Q6; the Railhead slot 6, Q7; the island waits for the rivet.
  for (let laid = 0; laid <= LINE2_STATIONS.length; laid++)
    assert.deepEqual(
      trainStopsOf(1, laid),
      laid >= 7 ? [...V25_STOPS[1]!, RING_HEAD[0]!.s] : laid >= 6 ? V25_STOPS[1] : V25_STOPS[1]!.slice(0, 3),
      `${laid} laid`,
    );
});

test("every halt's opening slot exists, and halts run in s order", () => {
  for (const l of RAIL_LINES) {
    for (const h of l.halts)
      assert.ok(
        h.opens === -1 || (Number.isInteger(h.opens) && h.opens >= 0 && h.opens < LINE2_STATIONS.length),
        `${h.name} opens at ${h.opens}`,
      );
    for (let k = 1; k < l.halts.length; k++) assert.ok(l.halts[k]!.s > l.halts[k - 1]!.s, `${l.id} in s order`);
    assert.ok(l.home >= 0 && l.home < l.halts.length && l.halts[l.home]!.opens === -1, `${l.id}'s home is open`);
    assert.equal(l.speed, l.id === 'line1' || l.id === 'line2' ? 140 : TRAIN.speed);
    assert.equal(l.accel, l.id === 'line1' || l.id === 'line2' ? 2.5 : TRAIN.accel);
  }
  assert.deepEqual(
    RAIL_LINES.map((l) => l.id),
    ['line1', 'line2', 'ns', 'bay', 'cave'],
  );
});

// Where the catalog's paths run is railway-train.test.ts's ("the server's coarse line path follows Place's rails within
// a metre") and railway-ring-layout.test.ts's; this holds how railLinePoint reads them.
test("railLinePoint reads the catalog's 10 m samples, line 2's running on through Ring Island", () => {
  const line2 = RAIL_LINES[1]!.path;
  assert.deepEqual(line2.slice(line2.length - RING_PATH.length - LINE2_ON.length), [...RING_PATH, ...LINE2_ON]);
  RAIL_LINES.slice(0, 2).forEach((l, line) => {
    for (let k = 0; k < l.path.length / 2; k++)
      assert.deepEqual(railLinePoint(line, k * 1000), { x: l.path[k * 2], z: l.path[k * 2 + 1] });
  });
});

test("every halt that can be its line's open end says how it turns trains back, inside the line", () => {
  for (const l of RAIL_LINES)
    l.halts.forEach((h, k) => {
      // A shut halt (the greybox route's rows) gets its end with the leg whose rules open it.
      if (h.shut) return;
      // A halt before one a later job, a leg's section or a later leg opens (the greybox route's) can be the open end.
      const next = l.halts[k + 1];
      const last =
        k === 0 ||
        !next ||
        (!next.leg && next.opens >= 0) ||
        (!!next.leg && (next.leg.slot !== h.leg?.slot || next.leg.section !== h.leg?.section)) ||
        !!next.shut;
      assert.equal(!!h.end, last, `${h.name}`);
      if (h.end) {
        assert.ok(h.end.kind !== 'loop', 'no loop before v27');
        const inward = k === 0 ? h.end.mergeCm > h.s : h.end.mergeCm < h.s;
        assert.ok(inward && h.end.mergeCm > l.halts[k === 0 ? 0 : k - 1]!.s - (k === 0 ? 1 : 0), `${h.name}'s merge`);
      }
    });
});

// Review of v26, P2-1: a train held at a stub's signal stood on the drawn turnout. The signals are derived from the
// turnout and the train's reach, so these must be the drawn ones.
test("the sim's train reach and turnout are the drawn ones, and every signal stands clear of its block", () => {
  const ahead = Math.max(...TRAIN_CARS.map((c, n) => TRAIN_OFFSETS[n]! + c.hz)),
    behind = Math.max(...TRAIN_CARS.map((c, n) => c.hz - TRAIN_OFFSETS[n]!));
  // From v28 (ring-island-build2, R3, call 15) the reach ahead is rail-map's long train (8.2 m) on either boiler: at
  // least the drawn engine's with the longer boiler's frame (6.7 m). From v33 (fourth-car, R1) the reach behind is the
  // steel car's tail on the wagon's coach train (16.1 m), including the dedicated rider car.
  assert.equal(TRAIN_EXTENT.behindCm, Math.round(TRAIN_TAIL_M * 100));
  assert.equal(TRAIN_EXTENT.behindCm, 1610);
  assert.ok(TRAIN_EXTENT.behindCm > Math.round(behind * 100), "past the table's last car");
  assert.equal(TRAIN_EXTENT.aheadCm, 820);
  assert.ok(TRAIN_EXTENT.aheadCm >= Math.round((ahead + ENGINE_LONG_AHEAD) * 100), 'covers the longer engine as drawn');
  assert.equal(TURNOUT * 100, TURNOUT_CM);
  const drawn = [FORMATION.timber, FORMATION.quarry];
  RAIL_LINES.forEach((l, line) =>
    l.halts.forEach((h, k) => {
      // The Railhead's and Ring Island's ends are the ring layout's (test/railway-ring-layout.test.ts, R1b), not
      // FORMATION's.
      if (!h.end || h.heads || h.ring) return;
      const side = k === 0 ? -1 : 1,
        lead = side < 0 ? TRAIN_EXTENT.behindCm : TRAIN_EXTENT.aheadCm;
      // The greybox route's built rows (greybox-leg2.md, step 2) take their ends from the catalog, not FORMATION.
      if (h.leg) {
        if (k === 0) assert.equal(h.end.mergeCm, WORLD_LINES.find((r) => r.id === l.id)!.ends[0]!.sCm, h.name);
      } else if (h.end.kind === 'stub') {
        assert.equal(
          h.end.mergeCm,
          (side < 0 ? drawn[line]!.from : drawn[line]!.to) * 100,
          `${h.name}: the drawn merge`,
        );
        assert.equal(h.end.edgeCm, h.end.mergeCm - side * TURNOUT_CM, `${h.name}: past the turnout`);
      } else assert.equal(h.end.mergeCm, drawn[line]!.crossover![0] * 100, `${h.name}: the drawn crossover`);
      assert.equal(h.end.signalCm, h.end.edgeCm - side * lead, `${h.name}: a held train's lead stops at the block`);
    }),
  );
  // The reviewer's numbers: the village's signal about 66.7 m (63 m before v33's steel car), the pier's about 530 m.
  assert.equal(RAIL_LINES[1]!.halts[0]!.end!.signalCm, 7010);
  assert.equal(RAIL_LINES[1]!.halts[3]!.end!.signalCm, 52780);
});

// ---------------------------------------------------------------- v27's line 2 (ring-island-build1, R3b)
test("line 2 keeps its halt order and pinned platforms after Home's move", () => {
  const line2 = RAIL_LINES[1]!,
    halts = line2.halts;
  // The greybox route's stack railhead and High Gorge follow (test/railway-route-rules.test.ts).
  assert.deepEqual(
    halts.slice(0, 6).map((h) => h.name),
    ['Village, line 2', 'Quarry', 'Far Head', 'Pier', 'Railhead', 'Ring Island'],
  );
  halts.slice(0, 4).forEach((h, k) => assert.equal(h.s, V25_STOPS[1]![k], `${h.name} stands where v26's did`));
  // Before Q7 both ways use the east terminal; after it only the west platform serves the homeward train.
  const [px, pz] = [line2.path[73 * 2]!, line2.path[73 * 2 + 1]!];
  const [east, west] = halts[3]!.platforms;
  assert.equal(east, PIER_EAST);
  assert.ok(Math.abs(Math.sqrt((east.x - px) ** 2 + (east.z - pz) ** 2) - 290) <= 2, 'east: 2.9 m off the path');
  assert.ok(Math.abs(Math.sqrt((west.x - px) ** 2 + (west.z - pz) ** 2) - 695) <= 2, 'west: 6.95 m off the path');
  assert.ok(east.x > px && west.x < px, 'opposite boarding sides');
  assert.equal(west.reach, 1260);
  assert.equal(halts[3]!.only, -1);
  // The Railhead: every number from the ring layout, its end at bent 6 (R1b's numbers).
  const head = halts[4]!;
  assert.deepEqual(
    head.heads,
    RING_HEAD.map((h) => h.s),
  );
  assert.equal(head.s, RING_HEAD[0]!.s);
  assert.deepEqual(head.platforms, [RING_HEAD[0]!.platform, RING_JOINT_UP]);
  assert.equal(head.brake, RING_END_BRAKE_CMS2 / 100);
  assert.deepEqual(head.end, { kind: 'stub', mergeCm: 83200, edgeCm: 81200, signalCm: 80380 });
  // Ring Island: the crossover on the Way, the buffers 15 m on.
  const island = halts[5]!;
  assert.equal(island.s, RING_END.s);
  assert.deepEqual(island.platforms, [RING_HALT.down, RING_HALT.up]);
  assert.equal(island.ring, true);
  assert.deepEqual(island.end, { kind: 'crossover', mergeCm: 113700, edgeCm: 113700, signalCm: 112880 });
  // A heads halt's original side is the railhead's platform where it stands now, both ways at the open end.
  for (let k = 0; k < RING_HEAD.length; k++) {
    assert.equal(haltPlatform(head, 1, k), RING_HEAD[k]!.platform);
    assert.equal(haltPlatform(head, -1, k), RING_JOINT_UP);
    assert.equal(haltPlatform(head, -1, k, true), RING_HEAD[k]!.platform);
  }
  assert.equal(haltPlatform(halts[3]!, 1), PIER_EAST);
});

test("the catalog: every fixed halt's platform by way is its own; v27's fields only on the Pier, Railhead and island", () => {
  RAIL_HALTS.forEach((h, id) => {
    assert.equal(haltPlatform(id, 1), h.platforms[0]);
    if (!h.heads) assert.equal(haltPlatform(id, -1), h.platforms[1]);
    const v27 = [
      h.ring ? 'ring' : '',
      h.heads ? 'heads' : '',
      h.only !== undefined ? 'only' : '',
      h.brake ? 'brake' : '',
    ]
      .filter(Boolean)
      .join();
    // The greybox route's two on line 2 open after the rivet too (`ring`), the railhead with its heads.
    const fields = { Pier: 'only', Railhead: 'heads,brake', 'Ring Island': 'ring' };
    assert.equal(
      v27,
      h.line === 1 ? ((fields as Record<string, string>)[h.name] ?? (h.leg ? 'ring' : '')) : '',
      h.name,
    );
  });
});

test('v27 stops: Q6 opens the Pier, Q7 the Railhead at its bent, the rivet the island', () => {
  const pier = line2Stops(6);
  assert.deepEqual(trainStopsOf(1, true), V25_STOPS[1], "v26's shim: true is Q6 laid");
  assert.deepEqual(pier, V25_STOPS[1]);
  assert.deepEqual(line2Stops(0), pier.slice(0, 3));
  assert.deepEqual(trainStopsOf(LINE2_ROWS, true), pier, 'the shim means Q6, not every slot');
  for (let k = 0; k < RING_HEAD.length; k++) {
    assert.deepEqual(line2Stops(7, k), [...pier, RING_HEAD[k]!.s]);
    assert.deepEqual(line2Stops(7, k, true), [...pier, RING_HEAD[k]!.s, RING_END.s]);
    assert.deepEqual(line2Stops(6, k, true), pier, 'nothing past the pier before Q7');
  }
});

test('three trains stand on three places: the Village (up), Far Head (down) and Quarry (down)', () => {
  assert.deepEqual(trainPlaces(LINE2_ROWS, line2Stops(0)), [
    { stop: 0, track: 0 },
    { stop: 2, track: 1 },
    { stop: 1, track: 1 },
  ]);
  for (const stops of [line2Stops(6), line2Stops(7, 3), line2Stops(7, 7, true)]) {
    const places = trainPlaces(LINE2_ROWS, stops).map((p) => `${p.stop}/${p.track}`);
    assert.equal(new Set(places).size, 3, `${places.join(' ')}`);
  }
  // The catalog's line 2 is the same row.
  assert.deepEqual(trainPlaces(1, TRAIN_STOPS[1]!.slice(0, 3), 3), trainPlaces(LINE2_ROWS, line2Stops(0)));
});

test("a line's balanced hold is absent or 1 to BALANCE_MAX_TICKS whole ticks; trainPlaces refuses any other", () => {
  const stops = line2Stops(7, 7, true);
  for (const balance of [undefined, 1, 600, BALANCE_MAX_TICKS]) {
    assert.ok(balanceOk(balance), `${balance}`);
    assert.doesNotThrow(() => trainPlaces({ ...LINE2_ROWS, balance }, stops));
  }
  for (const balance of [0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, BALANCE_MAX_TICKS + 1, 2 ** 53]) {
    assert.ok(!balanceOk(balance), `${balance}`);
    assert.throws(() => trainPlaces({ ...LINE2_ROWS, balance }, stops), /balance/);
  }
  for (const l of RAIL_LINES) assert.ok(balanceOk(l.balance), l.id);
});
