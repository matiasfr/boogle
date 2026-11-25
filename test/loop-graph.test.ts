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
import { RAIL_GRANTS, RAIL_LEGS, legFrame } from '../src/sim/railway-route.ts';
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
  const { code } = transformSync(readFileSync(url, 'utf8'), {
    loader: 'ts',
    format: 'cjs',
    supported: { 'dynamic-import': false },
  });
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
async function rideForCloth(firstContactMs: number, clothTaken = false) {
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
        routeRow: () => ({ grants: clothTaken ? 7 : 3, gates: 3 }),
      },
      '../rail-read.ts': {
        rw: () => ({}),
        aperture: () => ({ joined: 1 }),
        trains: () =>
          Array.from({ length: slot + 1 }, () => ({
            phase: 0,
            at: clothTaken ? canopy.railheadHalt + canopy.sections.length - 1 : 0,
            track: clothTaken ? 1 : 0,
          })),
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
    until: (ready: () => boolean, timeout: number) => {
      now += timeout;
      return ready();
    },
    walk: () => {
      if (clothTaken) throw new Error('walked toward the occupied platform');
      return true;
    },
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

test('a continuous 800 ms boarding hold completed at the deadline counts', async () => {
  await rideForCloth(19200);
});

test('a timed-out platform clearance fails before the homeward walk', async () => {
  await assert.rejects(rideForCloth(0, true), /clear|timeout|timed out/i);
});

test('successive stack frames register distinct progress when numbers are ignored', async () => {
  const stack = RAIL_LEGS.find((leg) => leg.id === 'stack')!;
  const beats = new Set<string>();
  for (const laid of [1, 2]) {
    const frame = legFrame(stack, laid);
    const { legRoute } = loadTool(new URL('../dev/look/bots/railway-legs.ts', import.meta.url), {
      '../../../src/sim/railway-queries-route.ts': { legRow: () => ({ laid }) },
      '../rail-read.ts': { rw: () => ({}), aperture: () => ({ joined: 1 }) },
      '../../../src/player/player.ts': { me: { body: { position: { x: frame.x / 100, z: frame.z / 100 } } } },
      '../../../src/player/input.ts': {},
      '../../../src/player/hands.ts': {},
      '../../../src/entities/player/state.ts': {},
      '../../../src/entities/ring-island/state.ts': {},
      './railway-ride.ts': { line2Rides: () => ({ check: assert.ok }) },
    }) as typeof import('../dev/look/bots/railway-legs.ts');
    const stop = new Error('frame reached');
    await assert.rejects(
      legRoute({
        bot: { walk: () => true } as unknown as Parameters<typeof legRoute>[0]['bot'],
        checkpoint: async (beat) => {
          beats.add(beat.replace(/[\d.]+/g, '#'));
          throw stop;
        },
      }),
      (error) => error === stop,
    );
  }
  assert.equal(beats.size, 2);
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
  // The White Wall and the ending are still stand-ins. The ending's key is the built cloth.
  const { nodes } = standInRoute({ bills: 1 });
  assert.deepEqual(
    nodes.map((n) => n.id),
    ['wall', 'ending'],
  );
  assert.equal(nodes[0]!.requires[0]!.on, 'cave-3', 'the stand-ins start where the built graph ends');
  assert.ok(
    nodes[1]!.requires.some((e) => e.on === 'cloth' && e.needs === 'glider cloth'),
    'the ending needs the cloth',
  );
  for (const s of nodes) {
    assert.ok(isStandIn(s), `${s.id} is flagged a stand-in`);
    assert.ok(!built.has(s.id), `${s.id} is not a built node's id`);
    assert.ok(Object.values(s.bill).every((n) => n > 0) && s.legs.every((l) => l.km > 0), `${s.id}: a bill and a leg`);
  }
});

test('the shared prefix preserves three-player idle time in the T3 before beam order', async () => {
  const { playOrder } = await import('../dev/loop/run.ts');
  const orders = proposeOrders();
  const canonical = orders[0]!.order;
  const variant = orders.find((o) => o.name === 'T3 before beam')!.order;
  const split = variant.findIndex((id, i) => id !== canonical[i]);
  const order = variant.slice(0, split + 1);
  const checkpoints: import('../dev/loop/run.ts').Checkpoint[] = [];
  playOrder(canonical.slice(0, split + 1), 'canonical', 3, { checkpoints });
  const full = playOrder(order, 'full', 3);
  const resumed = playOrder(order, 'resumed', 3, { from: checkpoints[split]! });
  assert.equal(resumed.nodes[split]!.idle, full.nodes[split]!.idle);
});

// Replay the real proof with one corrupt observation. The intact fixture stocks the rack,
// moves 16 rails to the carrier and leg, and holds the following kit aboard through a restart.
type RejoinFault =
  | 'held'
  | 'rack'
  | 'empty cargo'
  | 'restore'
  | 'mirror'
  | 'short pickup'
  | 'fed during pickup'
  | 'missing load'
  | 'stale train mirrors'
  | 'late mirror'
  // The same sweep's logs side and its other checkpoints (fix round 2):
  | 'missing log load'
  | 'logs held at pickup'
  | 'stale seed train mirror'
  | 'unmarked train has phantom logs on B while A is away'
  | 'kit switches trains on the final round trip'
  | 'seed account on B omits its rail count'
  // The same sweep's other instances (fix round 3):
  | 'kit moves to another train at the pickup'
  | 'server has phantom rails on an unmarked train'
  | 'seed adapter account on A omits its legRails'
  | 'server has no carrier account before the pickup'
  // Recheck 3:
  | 'no bay train carries kit at the seed'
  | 'no bay train carries kit after the first round trip';

async function replayLegRejoin(fault?: RejoinFault) {
  const pages = new Set<string>();
  let tick = 0,
    picked = false,
    restoredAt = -1;
  const kitUnits = fault === 'empty cargo' ? 0 : 20;
  const pickup = fault === 'short pickup' ? 1 : 16;
  const leg = () => ({
    slot: 3,
    laid: 1,
    logs: 0,
    rails: picked && fault === 'fed during pickup' ? 1 : 0,
    start: -1,
    loadedLogs: tick && fault !== 'missing log load' ? 60 : 40,
    loadedRails: tick && fault !== 'missing load' ? 60 : 40,
    heldLogs: picked && fault === 'logs held at pickup' ? 1 : 0,
    heldRails: picked && fault !== 'held' ? pickup : 0,
  });
  const rack = () => ({
    depot: tick > 0 ? 20 : 0,
    depotRails: rackRails(),
  });
  function rackRails() {
    if (tick === 0 || (fault === 'restore' && tick === restoredAt)) return 0;
    return picked && fault !== 'rack' ? 20 - pickup : 20;
  }
  const train = (_world: unknown, slot: number) => {
    const switched = fault === 'kit switches trains on the final round trip' && restoredAt >= 0 && tick > restoredAt;
    const moved = fault === 'kit moves to another train at the pickup' && picked;
    const missing =
      (fault === 'no bay train carries kit at the seed' && tick === 0) ||
      (fault === 'no bay train carries kit after the first round trip' && tick > 0);
    const legKit = !missing && slot === (tick === 0 || switched ? 10 : moved ? 11 : 9);
    const phantom = fault === 'server has phantom rails on an unmarked train' && picked && !legKit && slot === 11;
    return { legKit, logs: legKit ? kitUnits : 0, rails: legKit ? kitUnits : phantom ? 1 : 0 };
  };
  const back = () => ({ rails: picked ? pickup : 0, legRails: picked ? pickup : 0 });
  /** The server's account row: the fixture's back, or none (a fault). */
  const serverBack = () =>
    fault === 'server has no carrier account before the pickup' && !picked ? undefined : back();
  const world = {
    rules: { railway: { world: () => ({}) } },
    sync: {
      world: {
        get tick() {
          return tick;
        },
      },
      roomStep: () => tick,
      whenDurable: async () => {},
    },
    whenReady: async () => {},
    step: () => {
      tick++;
    },
  };
  let hosted = { world };
  const { railwayLegRejoin } = loadTool(
    new URL('../dev/peer-test/ws-railway.ts', import.meta.url),
    {
      '../look/rail-seed.ts': { writeRailSeed: async () => {} },
      '../../src/sim/railway-queries-route.ts': { legRow: leg },
      '../../src/sim/railway-rows.ts': { train, account: serverBack, rail: rack },
      './harness.ts': {
        waitFor: async (fn: () => Promise<boolean>) => ((await fn()) ? 0 : -1),
        ev: (page: { name: string }, fn: (arg: unknown) => unknown, arg: unknown) => {
          // Both tabs can still agree on the pre-pickup packet before leaving.
          const staleBack =
            (fault === 'mirror' && restoredAt < 0) || (fault === 'late mirror' && restoredAt >= 0 && tick > restoredAt);
          const observed = staleBack ? { rails: 0, legRails: 0 } : back();
          const legSpec = RAIL_LEGS.find((l) => l.id === 'bell-canopy')!;
          const trains = LINE_SLOTS[legSpec.line]!.map((slot) => ({
            slot,
            ...train(undefined, slot),
          }));
          if (fault === 'stale train mirrors' && restoredAt >= 0) {
            trains.find((t) => t.legKit)!.rails = 0;
          }
          if (fault === 'stale seed train mirror' && tick === 0) trains.find((t) => t.legKit)!.logs = 0;
          if (
            fault === 'unmarked train has phantom logs on B while A is away' &&
            page.name === 'L1' &&
            !pages.has('L0')
          ) {
            trains.find((t) => !t.legKit)!.logs++;
          }
          const roomBack =
            fault === 'seed account on B omits its rail count' && page.name === 'L1' && tick === 0
              ? { legRails: observed.legRails }
              : observed;
          const T = {
            railStand() {},
            railIntent() {
              picked = true;
            },
            room: { peers: () => [...pages].map((peer) => ({ peer })) },
            railAdapter: () => ({
              session: { ready: true, pending: 0 },
              rows: {
                account:
                  fault === 'seed adapter account on A omits its legRails' && page.name === 'L0' && !picked
                    ? { rails: observed.rails }
                    : { ...observed },
                trains,
              },
            }),
            rail: () => ({
              ready: true,
              hash: 42 + observed.rails + trains.reduce((sum, t) => sum + t.rails, 0),
              accounts: [{ pid: 'leg0', ...roomBack }],
            }),
          };
          return runInNewContext('(' + fn.toString() + ')(arg)', { window: { T }, arg });
        },
      },
    },
    { setTimeout, clearTimeout },
  ) as typeof import('../dev/peer-test/ws-railway.ts');
  const web = {
    open: async (name: string) => {
      pages.add(name);
      return { name, selfId: name, page: { name, close: async () => pages.delete(name) } };
    },
  };
  await (railwayLegRejoin as (ctx: unknown) => Promise<void>)({
    room: 'wscheck',
    port: () => 1234,
    dataDir: '',
    web,
    hosted: () => hosted,
    check() {},
    restart: async () => {
      restoredAt = tick;
      hosted = { world: { ...world } };
    },
  });
  assert.ok(restoredAt >= 0);
  return tick - restoredAt;
}

for (const fault of ['held', 'rack', 'empty cargo', 'restore', 'mirror'] as const) {
  test('the leg rejoin proof detects corrupted ' + fault, async () => {
    await assert.rejects(replayLegRejoin(fault), /Leg rejoin proof stopped/);
  });
}

for (const fault of [
  'short pickup',
  'fed during pickup',
  'missing load',
  'stale train mirrors',
  'late mirror',
  'missing log load',
  'logs held at pickup',
  'stale seed train mirror',
  'unmarked train has phantom logs on B while A is away',
  'kit switches trains on the final round trip',
  'seed account on B omits its rail count',
  'kit moves to another train at the pickup',
  'server has phantom rails on an unmarked train',
  'seed adapter account on A omits its legRails',
  'server has no carrier account before the pickup',
  'no bay train carries kit at the seed',
  'no bay train carries kit after the first round trip',
] as const) {
  test('the leg rejoin proof detects ' + fault, async () => {
    await assert.rejects(replayLegRejoin(fault), /Leg rejoin proof stopped/);
  });
}

test('the leg rejoin proof steps at least one bay train round trip after the restart', async () => {
  const { cycleTicks } = await import('../src/sim/railway-trains.ts');
  const { RAIL_LINES } = await import('../src/sim/railway-lines.ts');
  const leg = RAIL_LEGS.find((l) => l.id === 'bell-canopy')!;
  const stops = RAIL_LINES[leg.line]!.halts.slice(0, leg.railheadHalt + 1).map((h) => h.s);
  const elapsed = await replayLegRejoin();
  const cycle = cycleTicks(leg.line, stops);
  assert.ok(elapsed >= cycle, `advanced ${elapsed} ticks, standard bay train needs at least ${cycle}`);
});
