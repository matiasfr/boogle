// Independent review of town-economy-visible B2 (docs/plans/town-economy-visible.md): what a buy that never reaches the
// server leaves on the board. The plot view runs from its source with its render dependencies stubbed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Matrix4, Line3, Object3D } from 'three/webgpu';
import { sourceFunction } from '../dev/level/source.ts';
import { buildSeedWorld } from '../src/sim/railway-seeds.ts';
import { plot } from '../src/sim/railway-rows.ts';
import { Plot, Till, Town, Yard } from '../src/sim/railway-components.ts';
import { loaderBuilt, plotPrice, plotsStaked } from '../src/sim/railway-queries-trade.ts';
import * as yard from '../src/place/yard-shape.ts';
import { TRADE, validPlotKind } from '../src/sim/railway-trade-layout.ts';
import { loadLevelArtifact } from '../src/prefab/validate.ts';
import { definitions } from '../src/prefab/catalogue.ts';
import level from '../content/built/levels/town-plot-stakes.json' with { type: 'json' };
import * as plan from '../src/place/town-plan.ts';
import { HALL } from '../src/place/home-station.ts';
import { advanceHold } from '../src/components/hold/view.ts';
import { pickInteract } from '../src/sim/interact-pick.ts';
import { railRoom } from './helpers/rail-room.ts';
import type { Interactable } from '../src/player/hands.ts';
import type { RailwayRefusal } from '../src/adapters/railway-effects.ts';
import type { RailwayAdapter } from '../src/adapters/railway-session.ts';

type Plots = {
  update(read: { wood: number; stone: number; staked: number[] } | null, dt?: number): void;
  targets(): Interactable[];
  release(): void;
};

/** createTownPlots over a real room client: its read facade, its commands and its refusals. */
function plotsView(adapter: RailwayAdapter) {
  const board = plan.townPlotBoard(0);
  const me = { body: { position: { x: board.x + 1000, y: 18.5, z: board.z } } };
  let refusal: ((event: RailwayRefusal) => void) | undefined;
  const listeners = new Set<(s: RailwayAdapter | null) => void>();
  const toyGhosts: { visible: boolean }[] = [];
  const create = sourceFunction<(owner: unknown) => Plots>('src/entities/town/plots.ts', 'createTownPlots', {
    loadLevelArtifact,
    level,
    definitions,
    TRADE,
    validPlotKind,
    ...plan,
    HALL,
    Vector3,
    Matrix4,
    toWorld: (x: number) => x + 1000,
    H: () => 18,
    me,
    advanceHold,
    Plot,
    Till,
    plotPrice,
    loaderBuilt,
    ...yard,
    drawn: (n: number) => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0),
    TIMBER: {},
    STONE: {},
    interactTarget: () => pickInteract(view.targets(), me.body.position.x, me.body.position.z, 0, 1),
    paintBoard() {},
    splash() {},
    knock() {},
    createPrefabBatch: () => ({ mesh: { setColorAt() {}, instanceColor: {} } }),
    createGhostOutlines: (_owner: unknown, capacity: number) => {
      const mesh = { visible: false };
      if (capacity === 128) toyGhosts.push(mesh);
      return { box() {}, outline() {}, commit() {}, mesh };
    },
    instantiate(prefab: string, _p: unknown, o: { handlers?: Record<string, () => Interactable[]> }) {
      if (prefab === 'town.plot-house' || prefab === 'town.plot-yard')
        return { construction: [{ plan: { hulls: [{ hy: 1.85 }], pieces: [], WALLS: 0, ROOFED: 0 } }] };
      return {
        bodies: [],
        root: { getObjectByName: () => undefined },
        setEnabled() {},
        relabel() {},
        targets: () => o.handlers?.['town.plot-buy']?.() ?? [],
      };
    },
    addSite: (_id: string, plan: unknown) => ({ state: 'none', bodies: [], plan }),
    startSite: (s: { state: string }) => void (s.state = 'building'),
    snapSite: (s: { state: string }, on: boolean) => void (s.state = on ? 'done' : 'none'),
    railwayCommands: () => adapter,
    railwayWorldRead: () => adapter.read,
    onRailwayCommands(fn: (s: RailwayAdapter | null) => void) {
      listeners.add(fn);
      fn({
        ...adapter,
        onRefused: ((cb: (event: RailwayRefusal) => void) => {
          refusal = cb;
          return adapter.onRefused(cb);
        }) as RailwayAdapter['onRefused'],
      });
      return () => listeners.delete(fn);
    },
  });
  const view = create({ cleanup() {} });
  const read = () => {
    const w = adapter.read.world();
    return { wood: 999, stone: 999, staked: plotsStaked(w, 0) };
  };
  return {
    view,
    read,
    position: me.body.position,
    toyGhosts,
    refuse: (id: number) => refusal?.({ intent: { op: 'rail.buy', id }, request: 99, reason: 'refused' }),
  };
}

test('a choice board offers no buy hold outside the server purchase radius', () => {
  const room = railRoom(buildSeedWorld('house-ready'));
  const c = room.join('alice', 'alice', 2);
  room.ready();
  const { view, read, position } = plotsView(c.adapter);
  const board = plan.TOWN_CHOICE.boards[0];
  position.x = 1000 + board.x;
  position.z = board.z;
  view.update(read(), 0);
  const hold = view.targets().find((target) => target.id === 'town.plot.0.1');
  assert.ok(hold?.run);
  hold.run();
  view.update(read(), 0.5);
  position.z = board.z - 2.5;
  assert.ok(Math.abs(position.z - plan.townPlotBoard(0).z) > plan.TOWN_BOARD.reach);
  view.update(read(), 0.6);
  room.run(3);
  assert.equal(plot(room.serverWorld(), 0).at, -1);
  assert.ok(!view.targets().some((target) => target.id === 'town.plot.0.1' && target.run));
});

test('lifting a thumb before one second cancels an affordable Boathouse purchase', () => {
  const seed = buildSeedWorld('house-built');
  const town = seed.w.mut(Town, seed.w.lookup(Town, 0)!)!;
  for (const [index, material, minimum] of [
    [0, 'wood', 40],
    [1, 'stone', 16],
  ] as const) {
    const extra = Math.max(0, minimum - town[material]);
    town[material] += extra;
    seed.w.mut(Yard, seed.w.lookup(Yard, index)!)!.made += extra;
  }
  const till = seed.w.mut(Till, seed.w.single(Till))!;
  till.boogles += 5000;
  till.landed += 5000;
  const room = railRoom(seed);
  const c = room.join('alice', 'alice', 2);
  room.ready();
  const { view, read, position } = plotsView(c.adapter);
  const board = plan.townChoice(2).boards[1]!;
  position.x = board.x + 1000;
  position.z = board.z;
  view.update(read(), 0);
  const target = view.targets().find((t) => t.id === 'town.plot.2.3');
  assert.ok(target?.run);
  target.run();
  view.update(read(), 0.08);
  // The touch button calls hands.interactUp(), which invokes the pressed target's release callback.
  target.release?.();
  for (let i = 0; i < 70; i++) view.update(read(), 1 / 60);
  assert.notEqual(target.blocked, 'Waiting for town', 'an 80 ms tap queued a purchase');
});

test('the toy shown during a hold matches the selected board', () => {
  const room = railRoom(buildSeedWorld('house-ready'));
  const c = room.join('alice', 'alice', 2);
  room.ready();
  const { view, read, position, toyGhosts } = plotsView(c.adapter);
  position.z -= 0.1; // just nearer the seeds, facing the horns
  view.update(read(), 0);
  const target = pickInteract(view.targets(), position.x, position.z, 0, 1);
  assert.equal(target?.id, 'town.plot.0.2');
  assert.deepEqual(
    toyGhosts.map((g) => g.visible),
    [false, true, false, false, false, false, false],
  );
  target!.run!();
  view.update(read(), 0.5);
  assert.deepEqual(
    toyGhosts.map((g) => g.visible),
    [false, true, false, false, false, false, false],
  );
});

test('each fourth-plot board buys its pictured activity through a full hold', () => {
  for (const [side, kind] of [4, 5].entries()) {
    const seed = buildSeedWorld('yard-built');
    const town = seed.w.mut(Town, seed.w.lookup(Town, 0)!)!;
    for (const [index, good, minimum] of [
      [0, 'wood', 56],
      [1, 'stone', 24],
    ] as const) {
      const extra = Math.max(0, minimum - town[good]);
      town[good] += extra;
      seed.w.mut(Yard, seed.w.lookup(Yard, index)!)!.made += extra;
    }
    const balance = seed.w.mut(Till, seed.w.single(Till))!;
    balance.landed += 5000;
    balance.boogles += 5000;
    const room = railRoom(seed);
    const player = room.join('alice', 'alice', 2);
    room.ready();
    const { view, read, position, toyGhosts } = plotsView(player.adapter);
    const board = plan.townChoice(3).boards[side]!;
    position.x = 1000 + board.x;
    position.z = board.z;
    view.update(read(), 0);
    view.update(read(), 0);
    const target = view.targets().find((t) => t.id === `town.plot.3.${kind}`);
    assert.ok(target?.run);
    target.run();
    view.update(read(), 0.5);
    assert.equal(toyGhosts[5 + side]!.visible, true);
    view.update(read(), 0.51);
    room.run(120);
    assert.equal(plot(room.serverWorld(), 3).kind, kind);
  }
});

test('review B2: a buy lost with the socket leaves the board pressable again once the plot is still unbought', () => {
  const room = railRoom(buildSeedWorld('house-ready'));
  const c = room.join('alice', 'alice', 3);
  room.ready();
  const { view, read } = plotsView(c.adapter);
  view.update(read(), 0);
  view.update(read(), 0); // the board caches its targets on the first frame it shows
  const target = () => view.targets()[0];
  assert.ok(target()?.run, 'the staked, affordable board is pressable');
  target()!.run!();
  for (let k = 0; k < 70; k++) view.update(read(), 1 / 60); // a one-second hold sends rail.buy
  assert.equal(target()?.blocked, 'Waiting for town', 'the buy is queued');
  // The socket drops before the edit reaches the server (it is still in flight), then comes back.
  c.disconnect();
  room.run(30);
  c.reconnect();
  for (let k = 0; k < 600; k++) {
    room.run(1);
    view.update(read(), 1 / 60);
  }
  assert.equal(plot(room.serverWorld(), 0).at, -1, 'the server never saw the buy');
  assert.ok(c.adapter.read.ready(), 'the session is back');
  assert.equal(
    target()?.blocked,
    undefined,
    'ten seconds after the reconnect the unbought plot still says "Waiting for town" and cannot be pressed',
  );
  assert.ok(target()?.run);
  target()!.run!();
  for (let k = 0; k < 70; k++) view.update(read(), 1 / 60);
  room.run(120);
  view.update(read(), 0);
  assert.ok(plot(room.serverWorld(), 0).at >= 0, 'a new hold buys after reconnect');
  assert.equal(room.serverWorld().get(Till, room.serverWorld().ids(Till)[0]!)!.spent, 150);
});

test('review B2 (control): two boards held at once send two buys; one plot is bought once and both boards settle', () => {
  const room = railRoom(buildSeedWorld('house-ready'));
  const a = room.join('alice', 'alice', 2),
    b = room.join('bob', 'bob', 3);
  room.ready();
  const views = [plotsView(a.adapter), plotsView(b.adapter)];
  for (const { view, read } of views) {
    view.update(read(), 0);
    view.update(read(), 0);
  }
  for (const { view } of views) view.targets()[0]!.run!();
  for (let k = 0; k < 70; k++) for (const { view, read } of views) view.update(read(), 1 / 60);
  for (const { view } of views) assert.equal(view.targets()[0]?.blocked, 'Waiting for town');
  const spent = () => room.serverWorld().get(Till, room.serverWorld().ids(Till)[0]!)!.spent;
  assert.equal(spent(), 0, 'nothing is spent on the press or the queued command');
  for (let k = 0; k < 120; k++) {
    room.run(1);
    for (const { view, read } of views) view.update(read(), 1 / 60);
  }
  assert.ok(plot(room.serverWorld(), 0).at >= 0);
  assert.equal(spent(), 150, 'spent once');
  for (const { view } of views) assert.equal(view.targets().length, 0, 'a bought plot offers nothing');
});

test('review B2: another plot refusal leaves this plot waiting; its own refusal releases it', () => {
  const room = railRoom(buildSeedWorld('house-ready'));
  const c = room.join('alice', 'alice', 3);
  room.ready();
  const { view, read, refuse } = plotsView(c.adapter);
  view.update(read(), 0);
  view.update(read(), 0);
  view.targets()[0]!.run!();
  for (let k = 0; k < 70; k++) view.update(read(), 1 / 60);
  refuse(1);
  view.update(read(), 0);
  assert.equal(view.targets()[0]?.blocked, 'Waiting for town');
  assert.equal(view.targets()[0]?.run, undefined);
  refuse(0);
  view.update(read(), 0);
  assert.equal(view.targets()[0]?.blocked, undefined);
  assert.ok(view.targets()[0]?.run);
});

function watchTarget(
  samples: number[],
  kind = 5,
  interruption?: 'epoch' | 'recall' | 'held' | 'hidden',
  onSplash?: (x: number, z: number, strength: number, level: number, launchY?: number) => void,
) {
  const ball = { e: 1, held: false, pose: { p: new Vector3(), v: new Vector3(8, 0, 0) } };
  const doc = Object.assign(new EventTarget(), { hidden: false });
  const create = sourceFunction<(...args: unknown[]) => { update(kind: number, now: number): void }>(
    'src/entities/town/ball-targets.ts',
    'createBallTargets',
    {
      ball,
      Vector3,
      Line3,
      GOLF_CUPS: [{ x: 0, z: 0 }],
      near: () => 1,
      fanfare: () => hits++,
      toWorld: (x: number) => x,
      surfaceHeight: () => 0,
      PLOT_KIND: { golf: 4, dunk: 5 },
      document: doc,
      clank() {},
      splash: (...args: [number, number, number, number, number?]) => {
        hits++;
        onSplash?.(...args);
      },
      instantiate() {
        const root = new Object3D();
        const bucket = new Object3D();
        bucket.name = 'bucket';
        const flag = new Object3D();
        flag.name = 'flag';
        root.add(bucket, flag);
        return { root, setEnabled() {} };
      },
    },
  );
  let hits = 0;
  const activity = create({ cleanup() {} }, { x: 0, z: 0 }, 0);
  for (const ms of samples) {
    const dx = (ms - 160) * 0.008;
    if (kind === 5) ball.pose.p.set(0.78 + dx, 1.5, 0.05);
    else ball.pose.p.set(dx, 0.46, 0);
    if (ms === 300) {
      if (interruption === 'epoch') ball.e++;
      if (interruption === 'held') ball.held = true;
      if (interruption === 'recall') ball.pose.v.set(0, 0, 0);
      if (interruption === 'hidden') doc.dispatchEvent(new Event('visibilitychange'));
    }
    activity.update(kind, ms);
  }
  return hits;
}

test('a visible peer that stalls during a paddle crossing still sees the dunk', () => {
  assert.equal(watchTarget([0, 50, 100, 150, 200, 250, 300, 350]), 1);
  assert.equal(watchTarget([0, 300, 350]), 1);
});

test('a visible peer that stalls during a golf cup crossing still sees the flag', () => {
  assert.equal(watchTarget([0, 300, 350], 4), 1);
});

test('a discontinuity between samples cannot hit either ball target', () => {
  for (const kind of [4, 5]) {
    for (const interruption of ['epoch', 'recall', 'held', 'hidden'] as const)
      assert.equal(watchTarget([0, 300], kind, interruption), 0);
  }
});

test('bucket spray can descend to a volunteer on the marked pad', () => {
  const drops: { floor: number; y: number; vy: number }[] = [];
  const splash = sourceFunction<(x: number, z: number, strength: number, level: number) => void>(
    'src/render/splash.ts',
    'splash',
    {
      waterField: { nearby: () => ({ body: 'land' }) },
      reducedMotion: false,
      readableIntensity: () => 1,
      GRAVITY: 18,
      FOAM: {},
      emit: (p: { floor: number; y: number; vy: number }) => drops.push(p),
    },
  );
  assert.equal(watchTarget([0, 50, 100, 150, 200], 5, undefined, splash), 1);
  assert.ok(drops.length);
  assert.ok(
    drops.every((p) => p.y >= 2.4 && p.vy < 0),
    'spray falls from the bucket',
  );
  assert.ok(
    drops.some((p) => p.floor < 2),
    'the spray dies above a standing volunteer',
  );
});
