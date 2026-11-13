// The loop graph (dev/loop/graph.ts) can't drift silently: every rail action and every railway mark has a node (or is
// a named generic carrying op / activity mark), and the hand-kept beat lists agree with the graph's nodes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITY_MARKS, GENERIC_OPS, NODES, PENDING_OPS, proposeOrders } from '../dev/loop/graph.ts';
import { isStandIn, standInRoute } from '../dev/loop/standins.ts';
import { RAIL_ACTIONS } from '../src/world/railway-server.ts';
import {
  createRailwayJourneyMarks,
  createRailwayProgressMarks,
  railwayActionMarks,
} from '../src/adapters/railway-marks.ts';
import type { RailwayIntent } from '../src/adapters/railway-intents.ts';
import { LINE1_STATIONS } from '../src/sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { Forge, Job, QJob, Rail, Shed, Steel, createRailwayWorld } from '../src/sim/railway-components.ts';
import { jobId, qjobId } from '../src/sim/railway-queries.ts';
import { beatsOf } from '../dev/playtest/beats.ts';
import { RAIL_STOPS } from '../dev/look/segments.ts';

const generic = new Set<string>(GENERIC_OPS);
// The greybox route's ops before step 5 builds their nodes (dev/loop/graph.ts, PENDING_OPS): named, never owned too.
const pending = new Set<string>(PENDING_OPS);
const owned = new Set(NODES.flatMap((n) => n.ops));

test('every rail action has a node or is a generic carrying op', () => {
  for (const op of RAIL_ACTIONS) assert.ok(owned.has(op) || generic.has(op) || pending.has(op), `${op} has no node`);
  for (const op of [...owned, ...generic, ...pending]) assert.ok(RAIL_ACTIONS.has(op), `${op} is not a rail action`);
  for (const op of pending) assert.ok(!owned.has(op), `${op} has a node: take it out of PENDING_OPS`);
});

/** Every mark name railway-marks.ts can emit: action marks per op, progress edges, journey marks. */
function markNames() {
  const names = new Set<string>();
  for (const op of RAIL_ACTIONS)
    for (const [name] of railwayActionMarks({ op } as unknown as RailwayIntent, 1, true)) names.add(name);
  // A world with every line-one and line-two job funded and laid, the forge lit and the trains unlocked, or none of it
  // (ECS M11), and Ring Island's steel works lit with steel home (build 2). The Works and the gap stay at their defaults.
  // The marks read its rows (M12).
  const state = (on: boolean) => {
    const w = createRailwayWorld();
    if (on) {
      for (let k = 0; k < LINE1_STATIONS.length; k++)
        Object.assign(w.mut(Job, jobId(w, k))!, { start: 0, completion: 1 });
      for (let k = 0; k < LINE2_STATIONS.length; k++)
        Object.assign(w.mut(QJob, qjobId(w, k))!, { start: 0, completion: 1 });
      w.mut(Forge, w.single(Forge))!.lit = 0;
      w.mut(Rail, w.single(Rail))!.trains = 0;
      w.mut(Steel, w.single(Steel))!.lit = 0;
      w.mut(Shed, w.single(Shed))!.steel = 1;
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
  // Not loop beats: the audio check, and slice 5's freight home and first fare (economy beats no route step waits for),
  // and `gorge`, the leg 1 bot's stop, until the loop graph's stack nodes are built (greybox-route step 5, left).
  const notLoop = new Set(['audio-loop', 'freight', 'fare', 'gorge']);
  for (const s of Object.keys(RAIL_STOPS)) assert.ok(stops.has(s) || notLoop.has(s), `RAIL_STOPS ${s} has no node`);
});

test('the solver proposes the canonical order and each soft edge flipped', () => {
  const orders = proposeOrders();
  assert.equal(orders[0]!.order.length, NODES.length);
  for (const o of orders) assert.equal(new Set(o.order).size, NODES.length, o.name);
});

test('built nodes and stand-ins are told apart by the flag, and the stand-ins reach the ending', () => {
  for (const n of NODES) assert.ok(!isStandIn(n), `${n.id} is built: it carries no standIn flag`);
  const built = new Set<string>(NODES.map((n) => n.id));
  for (const first of ['gorge', 'canopy'] as const)
    for (const branches of ['both', 'first'] as const) {
      const { nodes, lost } = standInRoute({ first, branches, bills: 1 });
      assert.equal(nodes.length, branches === 'both' ? 6 : 5);
      assert.equal(
        nodes[0]!.requires[0]!.on,
        NODES[NODES.length - 1]!.id,
        'the stand-ins start where the built graph ends',
      );
      assert.equal(nodes[nodes.length - 1]!.id, 'ending');
      assert.equal(lost.length, branches === 'both' ? 0 : 1, 'cutting a branch loses exactly its gate');
      for (const s of nodes) {
        assert.ok(isStandIn(s), `${s.id} is flagged a stand-in`);
        assert.ok(!built.has(s.id), `${s.id} is not a built node's id`);
        assert.ok(
          Object.values(s.bill).every((n) => n > 0) && s.legs.every((l) => l.km > 0),
          `${s.id}: a bill and a leg`,
        );
      }
    }
});
