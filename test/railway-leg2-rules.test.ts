import { ServiceHealth } from './helpers/railway-service-health.ts';
// Greybox leg 2's rules (docs/plans/greybox-leg2.md, step 2): the incline from High Gorge to Bell Rock on the `ns` line
// and the bay cut from Home's West landing to Bell Rock on the `bay` line. The barrier, the Gorge rack and yard relay,
// the seeds, the bay cut's stocked first rack (the stand-in), both lines' fleets and stops, the yard's completion, the
// leaver release, the server's reach at the new points, and the new lines' worst waits (the WAIT_BOUND method).
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { Account, Forge, Leg, LegYard, Rail, Route, Train } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { LINE2, RAIL_HALTS, RAIL_LINES, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { LEG_TUNE, RAIL_GATES, RAIL_GRANTS, RAIL_LEGS, ROW_LINE, legFrame, legRack } from '../src/sim/railway-route.ts';
import { TRAIN, TRAIN_PHASE, fleetOf, lineStagesOf, trainDir, trainPassesBy } from '../src/sim/railway-train.ts';
import { LINE_SLOTS, cycleTicks, servingSlots, trainSpacing } from '../src/sim/railway-trains.ts';
import { railTick } from '../src/sim/railway-systems.ts';
import { account, forge, rail, train, trains } from '../src/sim/railway-rows.ts';
import { LOGS, roomOf, stopsOf } from '../src/sim/railway-queries.ts';
import { RAILS } from '../src/sim/railway-line2-layout.ts';
import { legKitNeed, legOpen, legRow, legYard, legYardDrop, routeRow } from '../src/sim/railway-queries-route.ts';
import { legRailheadHold, legYardHome, railLegKitRelease } from '../src/sim/railway-sys-route-kit.ts';
import { railValid, type Actor } from '../src/world/railway-server.ts';
import { act, advance, apply, buildSeedWorld, invariant, restore, unaudited, type Seed } from './helpers/rail.ts';
import { steelHomeOn } from '../src/sim/railway-seed-steel.ts';
import { BRING_TICKS } from '../src/sim/railway-works-layout.ts';
import { line, shed as routeShed } from '../src/sim/railway-rows.ts';
import { routeTicks } from './helpers/fuzz.ts';
import { steelPool } from '../src/sim/railway-works-layout.ts';
import { STEEL } from '../src/sim/railway-ring-layout.ts';
import { legKitDrop, tradeOpen } from '../src/sim/railway-queries-route.ts';

const CANOPY_LEG = RAIL_LEGS.findIndex((l) => l.id === 'bell-canopy');

const INCLINE = RAIL_LEGS.findIndex((l) => l.id === 'incline'),
  BAY = RAIL_LEGS.findIndex((l) => l.id === 'bay-cut');
const NS = ROW_LINE.ns,
  BAYL = ROW_LINE.bay;
const PICK = RAIL_GRANTS.findIndex((g) => g.id === 'pick'),
  SEEDS = RAIL_GRANTS.findIndex((g) => g.id === 'seeds'),
  BARRIER = RAIL_GATES.findIndex((g) => g.id === 'incline'),
  CANOPY = RAIL_GATES.findIndex((g) => g.id === 'canopy');
const copy = (stage: Parameters<typeof buildSeedWorld>[0]): Seed => {
  const s = buildSeedWorld(stage);
  return { w: restore(s.w), t: s.t };
};
const acc = (s: Seed, pid: string) => account(s.w, pid)!;
const actorAt = (p: { x: number; y: number; z: number }): Actor => ({
  reach: (x, z, r) => Math.hypot(x - p.x, z - p.z) <= r,
  height: (y, r) => Math.abs(y - p.y) <= r,
  cadence: () => true,
});
const op = (o: string, f: Record<string, unknown> = {}) => ({ op: o, epoch: 0, request: 0, ...f }) as never;
/** Players a and b take what the open leg's rack holds and feed leg k's frame, by apply alone (no invariant per op). */
function stock(s: Seed, k: number) {
  for (const pid of ['a', 'b'])
    for (const [o, f] of [
      ['rail.depotTake', {}],
      ['rail.depotRailTake', {}],
      ['rail.legStock', { leg: k }],
    ] as const) {
      const a = acc(s, pid);
      if (o !== 'rail.legStock' && roomOf(s.w, a, o === 'rail.depotTake' ? LOGS : RAILS) <= 0) continue;
      apply(s.w, pid, { op: o, epoch: a.epoch, request: a.request + 1, ...f } as never, s.t);
    }
}
/** Feeds leg k's current section until it lays. */
function feedSection(s: Seed, k: number) {
  const was = legRow(s.w, k).laid;
  for (let guard = 0; legRow(s.w, k).start < 0; guard++) {
    assert.ok(guard < 6000, `${RAIL_LEGS[k]!.id} section ${was + 1} never fed`);
    stock(s, k);
    if (legRow(s.w, k).start < 0) advance(s, 1);
  }
  while (legRow(s.w, k).laid === was) advance(s, 1);
  assert.equal(invariant(s.w), null, `${RAIL_LEGS[k]!.id} section ${was + 1} laid`);
}
/** Kit units loaded equal units fed and laid, aboard (marked), on the rack, in the yard and on backs, over every leg. */
function kitLedger(w: World) {
  let logs = 0,
    rails = 0,
    loadedLogs = 0,
    loadedRails = 0;
  RAIL_LEGS.forEach((leg, k) => {
    const g = legRow(w, k);
    [logs, rails, loadedLogs, loadedRails] = [
      logs + g.logs,
      rails + g.rails,
      loadedLogs + g.loadedLogs,
      loadedRails + g.loadedRails,
    ];
    for (const sec of leg.sections.slice(0, g.laid)) [logs, rails] = [logs + sec.logs, rails + sec.rails];
  });
  for (const r of trains(w)) if (r.legKit) [logs, rails] = [logs + r.logs, rails + r.rails];
  w.each([LegYard], (_id, y) => ((logs += y.logs), (rails += y.rails)));
  w.each([Account], (_id, a) => ((logs += a.carry), (rails += a.rails)));
  return [loadedLogs - logs - rail(w).depot, loadedRails - rails - rail(w).depotRails];
}

test("leg 2's catalog lines: ns and bay open by their legs' sections, fleets 0, 1, 2, stops a prefix at every stage", () => {
  for (const [line, leg] of [
    [NS, INCLINE],
    [BAYL, BAY],
  ] as const) {
    const l = RAIL_LINES[line]!;
    assert.deepEqual(
      [0, 1, 2].map((n) => fleetOf(line, Object.assign([], { [leg]: n }))),
      [0, 1, 2],
      `${l.id}: a train per section laid`,
    );
    assert.deepEqual(l.signals, [
      RAIL_LEGS[leg]!.sections[0]!.toCm,
      ...(line === BAYL ? RAIL_LEGS[3]!.sections.slice(0, -1).map((s) => s.toCm) : []),
    ]);
    for (const { stops, trains } of lineStagesOf(line)) {
      assert.deepEqual(
        stops,
        l.halts.slice(0, stops.length).map((h) => h.s),
        `${l.id}: the stops a prefix`,
      );
      assert.equal(trains, [0, 0, 1, 2, 2, 3, 3][stops.length], `${l.id}: ${trains} trains over ${stops.length} stops`);
    }
    // Right-hand running (owner, 18 November): each halt's outward platform right of the row going out, its homeward
    // one left, 11.6 m apart.
    for (const h of l.halts.filter((x) => x.leg)) {
      const [out, home] = h.platforms;
      assert.ok(Math.abs(Math.hypot(out.x - home.x, out.z - home.z) - 1160) <= 2, `${h.name}: both platforms`);
    }
    // Head 1 stays a request stop both ways once passed (a two-section leg has nothing to close it behind).
    assert.equal(l.halts[1]!.closesAt, undefined);
  }
});

test('the barrier: rail.legStock is refused while it is shut; it opens only with the pick held and the incline open', () => {
  const s = copy('gorge-reached');
  const sec = RAIL_LEGS[INCLINE]!.sections[0]!;
  // Line 2 has already put the incline's first kit on the Gorge rack (it rode ahead of the stack's last lay).
  assert.ok(rail(s.w).depot >= sec.logs && rail(s.w).depotRails >= sec.rails, 'the first kit on the Gorge rack');
  assert.ok(act(s, 'a', 'rail.depotTake') > 0, 'a takes logs off the Gorge rack');
  assert.equal(act(s, 'a', 'rail.legStock', { leg: INCLINE }), 0, 'the frame refuses: the barrier is shut');
  assert.equal(act(s, 'a', 'rail.gate', { id: BARRIER }), 0, 'the barrier needs the pick');
  assert.equal(act(s, 'a', 'rail.grant', { id: PICK }), 1);
  assert.equal(act(s, 'a', 'rail.gate', { id: BARRIER }), 1, 'held, and the incline open');
  assert.ok(act(s, 'a', 'rail.legStock', { leg: INCLINE }) > 0, 'the frame takes them');
  // With the pick held but the incline not open (the stack not laid: a state the rules never reach, written here), the
  // barrier refuses.
  const mid = copy('gorge-mid');
  Object.assign(mid.w.mut(Route, mid.w.single(Route))!, { grants: 1 << PICK });
  assert.equal(legOpen(mid.w, INCLINE), false);
  const a = acc(mid, 'a');
  const r = apply(mid.w, 'a', { op: 'rail.gate', epoch: a.epoch, request: a.request + 1, id: BARRIER } as never, mid.t);
  assert.ok(!r.accepted, 'the incline is not open');
  // The Canopy barrier refuses the seeds until the bay cut is laid.
  const bell = copy('bay-open');
  assert.equal(act(bell, 'a', 'rail.gate', { id: CANOPY }), 0, 'the Canopy barrier waits for leg 3');
});

test('Canopy kit rides ahead, the barrier guards the frame, and the cloth unlocks only after three lays', () => {
  const s = unaudited(copy('bay-mid')),
    k = 3;
  const cloth = RAIL_GRANTS.findIndex((g) => g.id === 'cloth'),
    notch = RAIL_GATES.findIndex((g) => g.id === 'notch');
  // Keep the bay cut's last frame waiting while its kit is racked and its train returns to the West landing.
  for (let i = 0; legRow(s.w, k).loadedLogs === 0 || legRow(s.w, k).loadedRails === 0; i++) {
    assert.ok(i < 6000, 'Canopy kit loaded before the last bay-cut lay');
    advance(s, 1);
  }
  assert.ok(!legOpen(s.w, k));
  assert.equal(act(s, 'a', 'rail.gate', { id: CANOPY }), 0);
  feedSection(s, BAY);
  assert.equal(act(s, 'a', 'rail.grant', { id: cloth }), 0);
  for (let i = 0; rail(s.w).depot === 0; i++) {
    assert.ok(i < 6000, 'kit at Bell Rock');
    advance(s, 1);
  }
  assert.ok(act(s, 'a', 'rail.depotTake') > 0);
  assert.equal(act(s, 'a', 'rail.legStock', { leg: k }), 0);
  assert.equal(act(s, 'a', 'rail.gate', { id: CANOPY }), 1);
  for (let i = 0; i < 3; i++) {
    assert.deepEqual(kitLedger(s.w), [0, 0]);
    feedSection(s, k);
    assert.deepEqual(kitLedger(s.w), [0, 0]);
    const n = stopsOf(s.w, BAYL).length;
    assert.equal(n, 4 + i);
    for (const dir of [-1, 1]) {
      assert.equal(trainPassesBy(BAYL, 3, dir, n), i === 2);
      assert.equal(trainPassesBy(BAYL, 4, dir, n), false);
    }
  }
  assert.equal(act(s, 'a', 'rail.grant', { id: cloth }), 1);
  assert.equal(act(s, 'a', 'rail.grant', { id: cloth }), 0);
  assert.equal(act(s, 'a', 'rail.gate', { id: notch }), 0);
  assert.equal(invariant(s.w), null);
});

test('the relay conserves every unit: line 2 to the Gorge rack and yard, the ns trains out of the yard to head 1', () => {
  const s = unaudited(copy('incline-open'));
  let yardMost = 0,
    nsCarried = 0,
    headRacked = 0;
  assert.equal(stopsOf(s.w, NS).length, 0, 'the ns line has no track before the first lay');
  for (let k = 0; legRow(s.w, INCLINE).laid < 2; k++) {
    assert.ok(k < 8000, 'the incline laid');
    assert.deepEqual(kitLedger(s.w), [0, 0], `kit units at ${s.t}`);
    yardMost = Math.max(yardMost, legYard(s.w, INCLINE).logs + legYard(s.w, INCLINE).rails);
    for (const slot of LINE_SLOTS[NS]!) {
      const r = train(s.w, slot);
      if (r.legKit) nsCarried = Math.max(nsCarried, r.logs + r.rails);
    }
    if (legRow(s.w, INCLINE).laid === 1) headRacked = Math.max(headRacked, rail(s.w).depot + rail(s.w).depotRails);
    if (legRow(s.w, INCLINE).start < 0) stock(s, INCLINE);
    advance(s, 1);
    if (k % 500 === 0) assert.equal(invariant(s.w), null, `invariant at ${s.t}`);
  }
  assert.ok(yardMost > 0, 'line 2 unloaded into the Gorge yard');
  assert.ok(nsCarried > 0, 'an ns train carried kit out of the yard');
  assert.ok(headRacked > 0, "head 1's rack was stocked by the ns train");
  assert.equal(
    legYardDrop(INCLINE),
    RAIL_LINES[LINE2]!.halts.findIndex((h) => h.name === 'High Gorge'),
  );
  railwayCheck(s.w);
});

test('the seeds are refused before the incline is laid and taken once after', () => {
  for (const stage of ['gorge-reached', 'incline-open', 'incline-mid'] as const)
    assert.equal(act(copy(stage), 'a', 'rail.grant', { id: SEEDS }), 0, `${stage}: refused`);
  const s = copy('bell-reached');
  assert.equal(act(s, 'a', 'rail.grant', { id: SEEDS }), 1);
  assert.equal(act(s, 'a', 'rail.grant', { id: SEEDS }), 0, 'once');
  assert.ok(routeRow(s.w).grants & (1 << SEEDS));
});

test("the bay cut opens on the incline's last lay, and the West landing's rack is stocked from Home's stock", () => {
  const s = copy('incline-mid');
  // Feed the incline's last section and run its lay clock tick by tick.
  for (let guard = 0; legRow(s.w, INCLINE).start < 0; guard++) {
    assert.ok(guard < 6000);
    stock(s, INCLINE);
    if (legRow(s.w, INCLINE).start < 0) advance(s, 1);
  }
  while (legRow(s.w, INCLINE).laid < 2) {
    assert.equal(legOpen(s.w, BAY), false, 'not before the last lay');
    const produced = rail(s.w).depotProduced,
      onForge = forge(s.w).rack;
    advance(s, 1);
    if (legRow(s.w, INCLINE).laid < 2) continue;
    assert.equal(legOpen(s.w, BAY), true, 'open on the lay');
    // Stocked on the same tick: logs minted, rails off the forge rack (as many as it holds), counted loaded.
    const stocked = { logs: rail(s.w).depot, rails: rail(s.w).depotRails };
    assert.equal(stocked.logs, RAIL_LEGS[BAY]!.sections[0]!.logs, 'logs minted');
    assert.equal(stocked.rails, Math.min(RAIL_LEGS[BAY]!.sections[0]!.rails, onForge), 'rails off the forge rack');
    assert.ok(rail(s.w).depotProduced >= produced + stocked.logs - 40, 'minted logs counted (less any surplus home)');
    assert.deepEqual(
      [legRow(s.w, BAY).loadedLogs, legRow(s.w, BAY).loadedRails],
      [stocked.logs, stocked.rails],
      'the bay leg loaded what was stocked',
    );
  }
  assert.equal(stopsOf(s.w, BAYL).length, 0, 'no bay track yet: no train brought it');
  // Fed off the West landing's rack, the first section lays and a bay train joins at the West landing.
  feedSection(s, BAY);
  assert.equal(stopsOf(s.w, BAYL).length, 2);
  for (let k = 0; !servingSlots((j) => train(s.w, j), BAYL).length; k++) {
    assert.ok(k < 600, 'a bay train joins');
    advance(s, 1);
  }
  assert.equal(invariant(s.w), null);
});

test('both lines run a train per section laid: the seeds from incline-open to bay-reached', () => {
  const serving = (s: Seed, line: number) => servingSlots((j) => train(s.w, j), line).length;
  const expect: [Parameters<typeof buildSeedWorld>[0], number, number][] = [
    ['incline-open', 0, 0],
    ['incline-mid', 1, 0],
    ['bell-reached', 2, 0],
    ['bay-mid', 2, 1],
    ['bay-reached', 2, 2],
  ];
  for (const [stage, ns, bay] of expect) {
    const s = copy(stage);
    assert.deepEqual([serving(s, NS), serving(s, BAYL)], [ns, bay], stage);
    assert.equal(invariant(s.w), null, stage);
  }
});

test('the yard goes home on completion: logs unmade, rails to the forge rack, the loaded counts with them', () => {
  const s = copy('bell-reached');
  assert.deepEqual([legYard(s.w, INCLINE).logs, legYard(s.w, INCLINE).rails], [0, 0], 'empty once the incline laid');
  // Units in the yard at the last lay (a section fed from backs leaves its kit over): put 5 and 5 there, minted for the
  // incline as a line 2 load would have, and release them.
  const r = s.w.mut(Rail, s.w.single(Rail))!,
    f = s.w.mut(Forge, s.w.single(Forge))!,
    leg = s.w.mut(Leg, s.w.lookup(Leg, INCLINE)!)!;
  r.depotProduced += 5;
  f.rack -= 5;
  leg.loadedLogs += 5;
  leg.loadedRails += 5;
  Object.assign(s.w.mut(LegYard, s.w.lookup(LegYard, 0)!)!, { logs: 5, rails: 5 });
  const before = { produced: rail(s.w).depotProduced, rack: forge(s.w).rack, loaded: legRow(s.w, INCLINE).loadedLogs };
  legYardHome(s.w, INCLINE);
  assert.deepEqual([legYard(s.w, INCLINE).logs, legYard(s.w, INCLINE).rails], [0, 0]);
  assert.deepEqual(
    { produced: rail(s.w).depotProduced, rack: forge(s.w).rack, loaded: legRow(s.w, INCLINE).loadedLogs },
    { produced: before.produced - 5, rack: before.rack + 5, loaded: before.loaded - 5 },
  );
  assert.equal(invariant(s.w), null);
  // And the natural run leaves it empty at every stage after.
  for (const stage of ['bay-open', 'bay-mid', 'bay-reached'] as const) {
    const t = copy(stage);
    assert.deepEqual([legYard(t.w, INCLINE).logs, legYard(t.w, INCLINE).rails], [0, 0], stage);
  }
});

test("the leaver release on the incline: a leaver's units lifted off the Gorge rack are owed again", () => {
  const s = copy('incline-open');
  const need0 = legKitNeed(s.w, INCLINE);
  assert.ok(act(s, 'a', 'rail.depotTake') > 0);
  assert.ok(legRow(s.w, INCLINE).heldLogs > 0, 'counted held on the incline');
  const held = legRow(s.w, INCLINE).heldLogs;
  assert.deepEqual(legKitNeed(s.w, INCLINE), need0, 'a lift is not owed again');
  assert.equal(railLegKitRelease(s.w, 'a', acc(s, 'a').epoch), held);
  assert.equal(legRow(s.w, INCLINE).heldLogs, 0);
  assert.equal(legKitNeed(s.w, INCLINE).logs, need0.logs + held, "a leaver's are owed again");
  assert.equal(railLegKitRelease(s.w, 'a', acc(s, 'a').epoch), 0, 'idempotent');
  assert.equal(invariant(s.w), null);
});

test("the server judges leg 2's ops at the new points; a malformed one is refused, never thrown", () => {
  const s = copy('incline-open');
  const frame = legFrame(RAIL_LEGS[INCLINE]!, 0),
    rack = legRack(RAIL_LEGS[INCLINE]!, 0);
  assert.equal(railValid(s.w, op('rail.legStock', { leg: INCLINE }), actorAt(frame)), true, 'at frame 1');
  assert.equal(railValid(s.w, op('rail.legStock', { leg: INCLINE }), actorAt(rack)), false, 'not from the rack');
  assert.equal(railValid(s.w, op('rail.depotTake'), actorAt(rack)), true, 'the Gorge rack');
  assert.equal(railValid(s.w, op('rail.depotTake'), actorAt(frame)), false);
  assert.equal(railValid(s.w, op('rail.gate', { id: BARRIER }), actorAt(RAIL_GATES[BARRIER]!.at)), true);
  assert.equal(railValid(s.w, op('rail.grant', { id: SEEDS }), actorAt(RAIL_GRANTS[SEEDS]!.at)), true, 'the post');
  assert.equal(railValid(s.w, op('rail.grant', { id: SEEDS }), actorAt(frame)), false);
  const bay = copy('bay-open');
  assert.equal(
    railValid(bay.w, op('rail.depotTake'), actorAt(legRack(RAIL_LEGS[BAY]!, 0))),
    true,
    "the West landing's rack",
  );
  assert.equal(
    railValid(bay.w, op('rail.legStock', { leg: BAY }), actorAt(legFrame(RAIL_LEGS[BAY]!, 0))),
    true,
    "the West landing's frame",
  );
  for (const leg of [-1, RAIL_LEGS.length, 0.5, Number.NaN, '1', null])
    assert.equal(railValid(bay.w, op('rail.legStock', { leg }), actorAt(frame)), false, `leg ${String(leg)}`);
  // A lever at each new halt, from its own direction's platform (right-hand running).
  const mid = copy('incline-mid');
  const gorge = RAIL_HALTS.findIndex((h) => h.line === NS && h.stop === 0);
  assert.equal(
    railValid(mid.w, op('rail.call', { id: gorge, dir: 1 }), actorAt(RAIL_HALTS[gorge]!.platforms[0])),
    true,
    'the Gorge, outward, from its outward platform',
  );
});

// ---------------------------------------------------------------- the waits (the WAIT_BOUND method)
const FUZZ = routeTicks();
/** The halts a lever ask may name now (open, not closed behind), by RAIL_HALTS id: the route rules' askPool. */
function askPool(w: World) {
  return RAIL_HALTS.flatMap((h, id) => {
    const n = stopsOf(w, h.line).length;
    return h.stop < n && !(trainPassesBy(h.line, h.stop, 1, n) && trainPassesBy(h.line, h.stop, -1, n)) ? [id] : [];
  });
}
function ask(s: Seed, f: Record<string, unknown>) {
  const a = acc(s, 'a');
  return apply(s.w, 'a', { op: 'rail.call', epoch: a.epoch, request: a.request + 1, ...f } as never, s.t).accepted;
}
/** Garage step 4 (v67): the works lit and its first steel home (the steel seed's own steps) and the bay line's copy
 * brought to the garage table, by accepted ops only, with the copies' swap waited out. Deterministic, so built once a
 * stage and copied. */
const tradeBases = new Map<string, Seed>();
function tradeBase(stage: 'bay-mid' | 'bay-reached') {
  if (!tradeBases.has(stage)) {
    const s = steelHomeOn(unaudited(copy(stage)));
    assert.equal(act(s, 'a', 'rail.bring', { line: BAYL, revision: routeShed(s.w).bringRev }), 1);
    advance(s, BRING_TICKS);
    tradeBases.set(stage, s);
  }
  const s = tradeBases.get(stage)!;
  return unaudited({ w: restore(s.w), t: s.t });
}
/** The bay line's Strong boiler (rail.install, part 6), accepted. */
function fitStrong(s: Seed) {
  assert.equal(act(s, 'a', 'rail.install', { line: BAYL, part: 6, revision: line(s.w, BAYL).rev }), 1);
}
/** Asks at 5% a tick from askPool, riders' asks and junk calls, restores; with `feed`, the open leg fed every tick and
 * the seeds taken once the incline is laid. The worst served wait on each new line. With `strong`, the bay line is
 * fitted Strong by accepted ops as the measured run starts (tradeBase, then rail.install), so the fleet is mixed while
 * it adopts, and a bay ask made within one circuit of the fit is held to the 23 November mixed-fleet checks (safety
 * and the three-budget stall limit); the `ns` line keeps the ordinary budget. */
function waits(stage: Parameters<typeof buildSeedWorld>[0], seed: number, feed: boolean, canopy = false, strong = false) {
  let s = unaudited(copy(stage));
  let mixedTicks = 0, heldTicks = 0, layingHoldTicks = 0, yieldedTicks = 0;
  let thirdEligible = -1, thirdServing = -1, mixedUntil = -1;
  if (strong) {
    assert.ok(stage === 'bay-mid' || stage === 'bay-reached', 'the bay trade is open');
    s = tradeBase(stage);
  }
  // Canopy: the barrier opened once the bay cut is laid (here, or by the growing run from bay-mid, below).
  if (canopy && legRow(s.w, BAY).laid === RAIL_LEGS[BAY]!.sections.length) {
    assert.equal(act(s, 'a', 'rail.gate', { id: CANOPY }), 1);
    if (!feed) while (legRow(s.w, 3).laid < RAIL_LEGS[3]!.sections.length) feedSection(s, 3);
  }
  const t0 = s.t,
    rand = mulberry32(seed),
    health = new ServiceHealth([NS, BAYL], s.w);
  // Settled runs fit as the measured run starts. Growing Canopy fits late (independent re-check, 24 November): from one
  // tick before the bay cut's last section is laid, on the first tick a bay train has just entered service while
  // another serving bay train is away from the West landing. The new train, standing at home, takes Strong at once; the
  // one away keeps its standard boiler until it is home again, so the fleet is mixed. Only asks made during the first
  // circuit after the fit get the mixed-fleet checks (23 November); asks already pending keep their ordinary budget.
  const late = strong && canopy && feed;
  const away = (j: number) => !(train(s.w, j).phase === TRAIN_PHASE.STAND && train(s.w, j).at === 0);
  let fitted = false,
    fleetWas = servingSlots((j) => train(s.w, j), BAYL).length;
  for (let k = 0; k < FUZZ; k++) {
    const bay = legRow(s.w, BAY),
      fleetNow = servingSlots((j) => train(s.w, j), BAYL);
    const due = late
      ? (bay.laid === 2 || (bay.laid === 1 && bay.start >= 0 && s.t >= bay.start + LEG_TUNE.layTicks - 1)) &&
        fleetNow.length > fleetWas &&
        fleetNow.some(away)
      : k === 0;
    fleetWas = fleetNow.length;
    if (strong && !fitted && due) {
      fitStrong(s);
      fitted = true;
      const st = stopsOf(s.w, BAYL);
      mixedUntil = s.t + Math.max(cycleTicks(BAYL, st, 0), cycleTicks(BAYL, st, 5));
    }
    if (rand() < 0.05) {
      const pool = askPool(s.w),
        id = pool[Math.floor(rand() * pool.length)]!,
        dir = rand() < 0.5 ? -1 : 1;
      if (id !== undefined && ask(s, { id, dir })) {
        health.ask(s.w, id, dir, s.t, s.t <= mixedUntil && RAIL_HALTS[id]!.line === BAYL);
        if (RAIL_HALTS[id]!.line === NS)
          assert.ok(!health.pending.get(`${id}/${dir}`)?.safetyOnly, 'a bay fit must keep the ordinary ns wait budget');
      }
    }
    for (const line of [NS, BAYL]) {
      const n = stopsOf(s.w, line).length;
      if (rand() < 0.015 && n > 2) {
        const serving = servingSlots((j) => train(s.w, j), line);
        if (serving.length) {
          const slot = serving[Math.floor(rand() * serving.length)]!;
          const id = RAIL_HALTS.findIndex((h) => h.line === line && h.stop === 1 + Math.floor(rand() * (n - 2)));
          ask(s, { id, dir: trainDir(train(s.w, slot)), train: slot });
        }
      }
    }
    if (rand() < 0.01) {
      const tr = [-1, 5, 99, 1.5, -0, Number.NaN, 2 ** 60, '1', null][Math.floor(rand() * 9)];
      ask(s, { id: Math.floor(rand() * 20) - 1, dir: rand() < 0.5 ? -1 : 2, train: tr } as never);
    }
    if (feed) {
      const open = RAIL_LEGS.findIndex((_l, j) => legOpen(s.w, j));
      if (open >= 0 && legRow(s.w, open).start < 0) stock(s, open);
      if (canopy && legRow(s.w, BAY).laid === RAIL_LEGS[BAY]!.sections.length && !(routeRow(s.w).gates & (1 << CANOPY)))
        ask(s, { op: 'rail.gate', id: CANOPY });
      if (legRow(s.w, INCLINE).laid === 2 && !(routeRow(s.w).grants & (1 << SEEDS)))
        apply(
          s.w,
          'a',
          { op: 'rail.grant', epoch: acc(s, 'a').epoch, request: acc(s, 'a').request + 1, id: SEEDS },
          s.t,
        );
    }
    railTick(s.w, ++s.t, 75);
    if (strong) {
      const fleet = servingSlots((j) => train(s.w, j), BAYL);
      if (thirdEligible < 0 && legRow(s.w, 3).laid > 0) thirdEligible = s.t - t0;
      if (thirdServing < 0 && fleet.length >= 3) thirdServing = s.t - t0;
      // Mixed: Strong and standard trains in service together, while the fleet adopts the fit.
      const strongs = fleet.filter(j => train(s.w, j).boiler === 5).length;
      if (strongs > 0 && strongs < fleet.length) mixedTicks++;
      if (fleet.some(j => legRailheadHold(s.w, j, s.t) === 'hold')) {
        heldTicks++;
        if (legRow(s.w, 3).start >= 0) layingHoldTicks++;
      }
      if (fleet.some(j => legRailheadHold(s.w, j, s.t) === 'yield')) yieldedTicks++;
    }
    health.tick(s.w, s.t);
    if (k % 10 === 0)
      assert.equal(
        trainSpacing(
          (j) => train(s.w, j),
          (l) => stopsOf(s.w, l),
          s.t,
        ),
        null,
        `spacing at ${s.t}`,
      );
    if (k % 500 === 0) assert.equal(invariant(s.w), null, `invariant at ${s.t}`);
    if (rand() < 0.002) s = unaudited({ w: restore(s.w), t: s.t });
  }
  health.drain(s.w, s.t, () => railTick(s.w, ++s.t, 75));
  assert.equal(invariant(s.w), null);
  if (strong) {
    assert.ok(fitted, 'the Strong fit was made during the measured run');
    assert.ok(mixedTicks > 0, 'Strong and standard trains in service together during the measured run');
    if (feed && canopy) assert.ok(heldTicks + yieldedTicks > 0, 'the growing fuzz exercised a Strong hold or release');
  }
  return {
    ns: health.worst.get(NS) ?? 0, bay: health.worst.get(BAYL) ?? 0, health, mixedTicks, heldTicks, layingHoldTicks,
    thirdEligible, thirdServing, laid: [legRow(s.w, INCLINE).laid, legRow(s.w, BAY).laid],
  };
}
const SEED_LIST = [0xc0ffee, 0x777, 0x5eed, 0xbadd] as const;
for (const [label, canopy, strong] of [
  ['leg 2 standard', false, false], ['leg 2 mixed', false, true],
  ['Canopy standard', true, false], ['Canopy mixed', true, true],
] as const) {
  test(`${label} service health at 75% headway`, { timeout: 1800000 }, t => {
    const failures: string[] = [];
    for (const seed of SEED_LIST) {
      for (const feed of [false, true]) {
        // A Strong bay train while leg 2 grows (from incline-open) is unreachable since the bay trade opens at bay-mid.
        if (strong && !canopy && feed) continue;
        // Canopy mixed, growing: from bay-mid, so the Strong fit can land inside its window (before the cut's last lay).
        const stage = strong && canopy && feed ? 'bay-mid' : feed && !canopy ? 'incline-open' : 'bay-reached';
        const r = waits(stage, seed, feed, canopy, strong);
        const mode = feed ? 'growing' : 'settled';
        t.diagnostic(`${seed.toString(16)} ${mode} ns ${r.ns} bay ${r.bay}; ${[...r.health.stages].join('; ')}; held ${r.heldTicks}; mixed ${r.mixedTicks}`);
        if (r.health.failures.length) failures.push(`${seed.toString(16)} ${mode}: ${r.health.failures[0]}`);
      }
    }
    assert.deepEqual(failures, []);
  });
}

// Matched random demand on the same mixed-fleet save. The control keeps the original
// Strong hold at Bell Rock for the departure tick only, restoring its dwell clock afterward.
test('mixed bay riders: early departures and the delay to the second full rack', t => {
  // The bay line fitted Strong by accepted ops at bay-mid (tradeBase, rail.install): the first bay train adopts it and
  // loads two bills ahead of the bay cut's last lay, then the cut is laid and the Canopy barrier opened.
  const base = tradeBase('bay-mid'), slot = LINE_SLOTS[BAYL]![0]!;
  fitStrong(base);
  for (let t = 0; train(base.w, slot).logs < 40 || train(base.w, slot).rails < 40; t++) {
    assert.ok(t < 8000, 'two bills ahead of the last bay-cut lay');
    advance(base, 1);
  }
  assert.equal(train(base.w, slot).boiler, 5);
  feedSection(base, BAY);
  assert.ok(act(base, 'a', 'rail.gate', { id: CANOPY }));
  const halts = RAIL_HALTS.flatMap((h,id) => h.line === BAYL && h.stop <= 2 ? [id] : []);
  function trial(seed: number, retain: boolean) {
    const s = unaudited({ w: restore(base.w), t: base.t }), rand = mulberry32(seed);
    let departures = 0;
    for (let k = 0; k < 10000; k++) {
      if (rand() < 0.05) ask(s, { id: halts[Math.floor(rand() * halts.length)], dir: rand() < 0.5 ? -1 : 1 });
      if (legRow(s.w,3).laid === 0) stock(s, 3);
      else if (rail(s.w).depot >= 20 && rail(s.w).depotRails >= 20) return { departures, delivery: k };
      const r = train(s.w,slot), depart = r.depart;
      const yielding = legRailheadHold(s.w,slot,s.t + 1) === 'yield' && legRow(s.w,3).laid === 0;
      const delay = retain && yielding && s.t + 1 >= depart + TRAIN.dwellTicks;
      const id = s.w.lookup(Train,slot)!;
      if (delay) s.w.mut(Train,id)!.depart = s.t + 2 - TRAIN.dwellTicks;
      railTick(s.w, ++s.t, 75);
      const after = train(s.w,slot);
      if (delay && after.phase === TRAIN_PHASE.STAND && after.at === 2) s.w.mut(Train,id)!.depart = depart;
      if (yielding && after.phase === TRAIN_PHASE.RUN && after.track === 1 && after.legKit) departures++;
      assert.equal(trainSpacing(j => train(s.w,j), l => stopsOf(s.w,l), s.t), null);
    }
    assert.fail('second rack never filled');
  }
  let released = 0;
  for (const seed of SEED_LIST) {
    const live = trial(seed,false), control = trial(seed,true);
    released += live.departures;
    assert.equal(control.departures, 0);
    t.diagnostic(`${seed.toString(16)} releases ${live.departures}, second bill ${live.delivery} vs ${control.delivery} ticks, extra ${live.delivery-control.delivery}`);
  }
  assert.ok(released > 0);
});

test('replay: the same leg 2 ops from the same seed give the same hash, through a save', () => {
  const run = () => {
    const s = unaudited(copy('incline-open'));
    for (let k = 0; k < 900; k++) {
      if (legRow(s.w, INCLINE).start < 0) stock(s, INCLINE);
      railTick(s.w, ++s.t, 75);
      if (k === 450) s.w = restore(s.w);
    }
    return s.w.hash();
  };
  assert.equal(run(), run());
});

// Garage step 4, step 3 (src/sim/railway-seed-garage.ts): the trade's seeds, built on bay-mid by accepted ops only,
// built lazily here (bay-mid is this file's own world already).
test('the trade seeds: ready with the pool full, fitted and adopted, a Strong train held at Bell Rock', { timeout: 300000 }, () => {
  const ready = copy('trade-ready');
  assert.equal(steelPool(routeShed(ready.w)), STEEL.total, 'the pool of 12');
  assert.deepEqual([tradeOpen(ready.w, NS), tradeOpen(ready.w, BAYL)], [true, true]);
  assert.deepEqual([line(ready.w, NS).boiler, line(ready.w, BAYL).boiler, routeShed(ready.w).tableLine], [0, 0, LINE2]);
  const fitted = copy('trade-fitted');
  assert.deepEqual([line(fitted.w, NS).boiler, line(fitted.w, BAYL).boiler], [4, 5]);
  assert.equal(routeShed(fitted.w).tableLine, BAYL, "the bay line's copy on the table");
  assert.equal(steelPool(routeShed(fitted.w)), STEEL.total - 2, 'each first fit spent 1');
  for (const [l, row] of [[NS, 4], [BAYL, 5]] as const)
    for (const j of servingSlots((k) => train(fitted.w, k), l)) assert.equal(train(fitted.w, j).boiler, row, `${l}/${j}`);
  const held = copy('trade-held');
  const at = RAIL_TRAINS.findIndex((t, j) => t.line === BAYL && legRailheadHold(held.w, j, held.t) === 'hold');
  assert.ok(at >= 0, 'a bay train holds');
  const r = train(held.w, at);
  assert.equal(r.boiler, 5, 'Strong');
  assert.equal(r.at, legKitDrop(held.w, BAYL, CANOPY_LEG), "at leg 3's railhead");
  assert.ok(r.legKit && r.logs > 0 && r.rails > 0, "the second section's kit aboard");
  assert.equal(legRow(held.w, CANOPY_LEG).laid, 0);
  assert.equal(invariant(held.w), null);
});
