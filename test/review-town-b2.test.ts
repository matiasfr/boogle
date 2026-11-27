// Independent review of town-economy-visible B2 (docs/plans/town-economy-visible.md): what a buy that never reaches the
// server leaves on the board. The plot view runs from its source with its render dependencies stubbed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Matrix4 } from 'three/webgpu';
import { sourceFunction } from '../dev/level/source.ts';
import { buildSeedWorld } from '../src/sim/railway-seeds.ts';
import { plot } from '../src/sim/railway-rows.ts';
import { Plot, Till } from '../src/sim/railway-components.ts';
import { loaderBuilt, plotPrice, plotsStaked } from '../src/sim/railway-queries-trade.ts';
import * as yard from '../src/place/yard-shape.ts';
import { TRADE } from '../src/sim/railway-trade-layout.ts';
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
  position.z = board.z - 2.5;
  assert.ok(Math.abs(position.z - plan.townPlotBoard(0).z) > plan.TOWN_BOARD.reach);
  view.update(read(), 0);
  assert.ok(!view.targets().some((target) => target.id === 'town.plot.0.1' && target.run));
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
  target!.run!();
  view.update(read(), 0.5);
  assert.deepEqual(
    toyGhosts.map((g) => g.visible),
    [false, true],
  );
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
