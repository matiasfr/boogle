// The loop graph (dev/loop/graph.ts) can't drift silently: every rail action and every railway mark has a node (or is
// a named generic route-independent op / activity mark), and the hand-kept beat lists agree with the graph's nodes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { ACTIVITY_MARKS, GENERIC_OPS, NODES, PENDING_MARKS, PENDING_OPS, proposeOrders } from '../dev/loop/graph.ts';
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
import { RAIL_STOPS, railSegmentOptions } from '../dev/look/segments.ts';
import { RAIL_GRANTS, RAIL_LEGS } from '../src/sim/railway-route.ts';
import { LINE_SLOTS } from '../src/sim/railway-trains.ts';

const generic = new Set<string>(GENERIC_OPS);
// The route's ops whose nodes are not built yet (dev/loop/graph.ts, PENDING_OPS): named, never owned too.
const pending = new Set<string>(PENDING_OPS);
const owned = new Set(NODES.flatMap((n) => n.ops));

test('a Canopy stop cannot be assigned to the Ring Island bot, which finishes at Ring Island', () => {
  assert.throws(() => railSegmentOptions(['--from', 'deck-laid', '--to', 'canopy']));
});

// Exercise the real dev entry points with the browser inputs and sim clock under test control.
// Each caller names its file as a literal URL, so the unit selection's walk follows it (test/unit-select.test.ts).
function loadTool(url: URL, mocks: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const require = createRequire(url);
  const output = { exports: {} };
  const { code } = transformSync(readFileSync(url, 'utf8'), { loader: 'ts', format: 'cjs' });
  runInNewContext(code, {
    module: output,
    require: (id: string) => (id in mocks ? mocks[id] : require(id)),
    performance,
    setInterval,
    clearInterval,
    ...globals,
  });
  return output.exports;
}

test('loop run refuses a cut built branch before starting the by-hand simulation', () => {
  const { runLoop } = loadTool(new URL('../dev/loop/run.ts', import.meta.url), {
    './host.ts': { createHost: () => assert.fail('started simulating the cut branch request') },
  }) as typeof import('../dev/loop/run.ts');
  assert.throws(() => runLoop(['--one-branch', '--by-hand', 'canopy-1', '--players', '1']), /--one-branch/);
});

// The room finished the track and the rider starts at home. Stop at the first hop so the two boundary
// cases need no renderer or real time. Keep the actual leg catalog, halt geometry and bot route.
async function rideForCloth(firstContactMs: number) {
  const canopy = RAIL_LEGS.find((l) => l.id === 'bell-canopy')!;
  const slot = LINE_SLOTS[canopy.line]![0]!;
  const cloth = RAIL_GRANTS.find((g) => g.id === 'cloth')!.at;
  const car = {
    x: 0,
    z: 0,
    get riding() {
      return now >= firstContactMs;
    },
  };
  const check = (value: unknown, beat: string) => assert.ok(value, beat);
  let now = 0;
  let target: { x: number; z: number } | undefined;
  const stop = new Error('observed the first step off');
  const { legRoute } = loadTool(
    new URL('../dev/look/bots/railway-legs.ts', import.meta.url),
    {
      '../../../src/sim/railway-queries-route.ts': {
        legDone: () => true,
        legRow: (_: unknown, k: number) => ({ laid: RAIL_LEGS[k]!.sections.length }),
        routeRow: () => ({ grants: 3, gates: 3 }),
      },
      '../rail-read.ts': {
        rw: () => ({}),
        aperture: () => ({ joined: 1 }),
        trains: () => Array.from({ length: slot + 1 }, () => ({ phase: 0, at: 0, track: 0 })),
      },
      '../../../src/player/player.ts': { me: { body: { position: { x: 0, z: 0 } }, coyote: 1 } },
      '../../../src/player/input.ts': { input: { keys: new Set() } },
      '../../../src/player/hands.ts': {},
      '../../../src/entities/player/state.ts': { pressJump() {}, releaseJump() {} },
      '../../../src/entities/ring-island/state.ts': {},
      './railway-ride.ts': {
        line2Rides: () => ({
          view: () => ({ trains: [{ slot, cars: [car] }] }),
          check,
          face() {},
          until() {},
          hopTo(x: number, z: number) {
            target = { x, z };
            throw stop;
          },
        }),
      },
    },
    { performance: { now: () => now } },
  ) as typeof import('../dev/look/bots/railway-legs.ts');
  const bot = {
    walk: () => true,
    wait: (ms: number) => {
      now += ms;
    },
  };
  try {
    await legRoute({ bot: bot as unknown as Parameters<typeof legRoute>[0]['bot'], checkpoint: async () => {} });
  } catch (err) {
    if (err !== stop) throw err;
  }
  assert.ok(target);
  return Math.hypot(target.x - cloth.x / 100, target.z - cloth.z / 100);
}

test('a first train contact at the boarding deadline cannot pass the 800 ms hold', async () => {
  await assert.rejects(rideForCloth(20000), /boarded/);
});

test('returning for untaken cloth steps off on the Canopy platform near its post', async () => {
  const metres = await rideForCloth(0);
  assert.ok(metres < 60, `step-off target is ${Math.round(metres)} m from the cloth`);
});

test('every rail action has a node or is a generic route-independent op', () => {
  for (const op of RAIL_ACTIONS) assert.ok(owned.has(op) || generic.has(op) || pending.has(op), `${op} has no node`);
  for (const op of [...owned, ...generic, ...pending]) assert.ok(RAIL_ACTIONS.has(op), `${op} is not a rail action`);
  for (const op of pending) assert.ok(!owned.has(op), `${op} has a node: take it out of PENDING_OPS`);
});

/** Every mark name railway-marks.ts can emit: action marks per op, progress edges, journey marks. */
function markNames() {
  const names = new Set<string>();
  for (const op of RAIL_ACTIONS)
    for (const [name] of railwayActionMarks({ op } as unknown as RailwayIntent, 1, true)) names.add(name);
  for (const [name] of railwayActionMarks({ op: 'rail.install', line: 1, part: 1, revision: 0 }, 1, true))
    names.add(name);
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

// The greybox legs' marks the play record and the beat list do not carry yet (dev/loop/graph.ts, PENDING_MARKS).
const pendingMarks = new Set(PENDING_MARKS);

test('every railway mark is a node milestone or an activity mark', () => {
  const names = markNames();
  assert.ok(names.size > 20, 'marks were enumerated');
  const beats = beatsOf('', true);
  for (const m of pendingMarks) {
    assert.ok(
      NODES.some((n) => n.reached.mark === m),
      `pending mark "${m}" is no node's: take it out of PENDING_MARKS`,
    );
    assert.ok(
      !(names.has(m) && beats.some(([, re]) => re.test(m))),
      `"${m}" is emitted and a beat now: take it out of PENDING_MARKS`,
    );
  }
  for (const name of names)
    assert.ok(
      NODES.some((n) => n.reached.mark === name || n.reached.also?.includes(name)) ||
        ACTIVITY_MARKS.some((re) => re.test(name)),
      `mark "${name}" has no node`,
    );
  for (const n of NODES)
    assert.ok(
      names.has(n.reached.mark) || pendingMarks.has(n.reached.mark),
      `${n.id}'s mark "${n.reached.mark}" is never emitted`,
    );
});

test('the hand-kept beat lists agree with the graph', () => {
  const beats = beatsOf('', true);
  for (const n of NODES)
    assert.ok(
      beats.some(([, re]) => re.test(n.reached.mark)) || pendingMarks.has(n.reached.mark),
      `RAILWAY_BEATS (dev/playtest/beats.ts) lacks ${n.id}'s "${n.reached.mark}"`,
    );
  const stops = new Set(NODES.flatMap((n) => n.stops));
  for (const s of stops) assert.ok(s in RAIL_STOPS, `${s} is not a RAIL_STOPS key`);
  // Not loop beats: the audio check, and slice 5's freight home and first fare (economy beats no route step waits for).
  const notLoop = new Set(['audio-loop', 'freight', 'fare']);
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
  // High Gorge, Bell Rock and Canopy Town are built (greybox leg 2's step 5, leg 3's step 7): the stand-ins are areas 7
  // to 9, and the ending's key is the built cloth.
  const { nodes } = standInRoute({ bills: 1 });
  assert.deepEqual(
    nodes.map((n) => n.id),
    ['port', 'wall', 'ending'],
  );
  assert.equal(
    nodes[0]!.requires[0]!.on,
    NODES[NODES.length - 1]!.id,
    'the stand-ins start where the built graph ends',
  );
  assert.ok(
    nodes[2]!.requires.some((e) => e.on === 'cloth' && e.needs === 'glider cloth'),
    'the ending needs the cloth',
  );
  for (const s of nodes) {
    assert.ok(isStandIn(s), `${s.id} is flagged a stand-in`);
    assert.ok(!built.has(s.id), `${s.id} is not a built node's id`);
    assert.ok(Object.values(s.bill).every((n) => n > 0) && s.legs.every((l) => l.km > 0), `${s.id}: a bill and a leg`);
  }
});
