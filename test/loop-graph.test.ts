// The loop graph (dev/loop/graph.ts) can't drift silently: every rail action and every railway mark has a node (or is
// a named generic carrying op / activity mark), and the hand-kept beat lists agree with the graph's nodes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITY_MARKS, GENERIC_OPS, NODES, proposeOrders } from '../dev/loop/graph.ts';
import { RAIL_ACTIONS } from '../src/world/railway-server.ts';
import {
  createRailwayJourneyMarks,
  createRailwayProgressMarks,
  railwayActionMarks,
} from '../src/adapters/railway-marks.ts';
import type { RailwayIntent } from '../src/adapters/railway.ts';
import { LINE1_STATIONS } from '../src/sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { Forge, Job, QJob, Rail, createRailwayWorld } from '../src/sim/railway-components.ts';
import { jobId, qjobId } from '../src/sim/railway-queries.ts';
import { beatsOf } from '../dev/playtest/beats.ts';
import { BEATS, RAIL_STOPS } from '../dev/look/segments.ts';

const generic = new Set<string>(GENERIC_OPS);
const owned = new Set(NODES.flatMap((n) => n.ops));

test('every rail action has a node or is a generic carrying op', () => {
  for (const op of RAIL_ACTIONS) assert.ok(owned.has(op) || generic.has(op), `${op} has no node`);
  for (const op of [...owned, ...generic]) assert.ok(RAIL_ACTIONS.has(op), `${op} is not a rail action`);
});

/** Every mark name railway-marks.ts can emit: action marks per op, progress edges, journey marks. */
function markNames() {
  const names = new Set<string>();
  for (const op of RAIL_ACTIONS)
    for (const [name] of railwayActionMarks({ op } as unknown as RailwayIntent, 1, true)) names.add(name);
  // A world with every line-one and line-two job funded and laid, the forge lit and the trains unlocked, or none of it
  // (ECS M11). The Works and Ring Island rows stay at their defaults. The marks read its rows (M12).
  const state = (on: boolean) => {
    const w = createRailwayWorld();
    if (on) {
      for (let k = 0; k < LINE1_STATIONS.length; k++)
        Object.assign(w.mut(Job, jobId(w, k))!, { start: 0, completion: 1 });
      for (let k = 0; k < LINE2_STATIONS.length; k++)
        Object.assign(w.mut(QJob, qjobId(w, k))!, { start: 0, completion: 1 });
      w.mut(Forge, w.single(Forge))!.lit = 0;
      w.mut(Rail, w.single(Rail))!.trains = 0;
    }
    return w;
  };
  const progress = createRailwayProgressMarks();
  progress(state(false));
  for (const [name] of progress(state(true))) names.add(name);
  const journey = createRailwayJourneyMarks();
  for (const [name] of journey({ x: 0, y: 0, z: 0 }, 'railway:train1', true, false, false)) names.add(name);
  for (const [name] of journey({ x: 1402.2, y: 24.3, z: -367.5 }, undefined, true, true, false)) names.add(name);
  return names;
}

test('every railway mark is a node milestone or an activity mark', () => {
  const names = markNames();
  assert.ok(names.size > 20, 'marks were enumerated');
  for (const name of names)
    assert.ok(
      NODES.some((n) => n.reached.mark === name || n.reached.also?.includes(name)) ||
        ACTIVITY_MARKS.some((re) => re.test(name)),
      `mark "${name}" has no node`,
    );
  for (const n of NODES) assert.ok(names.has(n.reached.mark), `${n.id}'s mark "${n.reached.mark}" is never emitted`);
});

test('the hand-kept beat lists agree with the graph', () => {
  const beats = beatsOf('', true);
  for (const n of NODES)
    assert.ok(
      beats.some(([, re]) => re.test(n.reached.mark)),
      `RAILWAY_BEATS (dev/playtest/beats.ts) lacks ${n.id}'s "${n.reached.mark}"`,
    );
  const stops = new Set(NODES.flatMap((n) => n.stops));
  for (const s of stops) assert.ok(s in RAIL_STOPS, `${s} is not a RAIL_STOPS key`);
  // Not loop beats: the audio check, and the legacy ?proto=place route's cove start.
  const notLoop = new Set(['audio-loop', 'at-cove', 'pier-ending']);
  for (const s of Object.keys(RAIL_STOPS)) assert.ok(stops.has(s) || notLoop.has(s), `RAIL_STOPS ${s} has no node`);
  for (const s of BEATS) assert.ok(stops.has(s) || notLoop.has(s), `BEATS ${s} has no node`);
});

test('the solver proposes the canonical order and each soft edge flipped', () => {
  const orders = proposeOrders();
  assert.equal(orders[0]!.order.length, NODES.length);
  for (const o of orders) assert.equal(new Set(o.order).size, NODES.length, o.name);
});
