import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import type { Group, InstancedMesh } from 'three/webgpu';
import { lapSlots } from '../src/sim/railway-lap.ts';
import { LINE2, RAIL_TRAINS } from '../src/sim/railway-lines.ts';

type View = { kind: string; mesh: Group; update(ctx: { dt: number; elapsed: number }): void; dispose?(): void };
const views = new Map<string, View>();
const starts: (() => void)[] = [];
const ball = { x: 0, y: 0, z: 0 };
const me = { body: { position: { x: 0, z: 0 } } };
let trainId = '';
let beach = false;
let surface = 0;
const stub = (path: string, exports: object) => mock.module(path, { exports });
Object.defineProperty(globalThis, 'window', { value: {} });
stub('../src/loop.ts', { onStart: (start: () => void) => starts.push(start) });
stub('../src/entity/entity.ts', {
  defineKind() {},
  spawn(view: View) {
    views.set(view.kind, view);
    return view;
  },
  despawn(view: View) {
    view.dispose?.();
    views.delete(view.kind);
  },
});
stub('../src/render/draw-count.ts', { guardInstances: (mesh: InstancedMesh) => mesh });
stub('../src/island/classic-zone.ts', { whileNearClassicIsland: (mount: () => View) => mount() });
stub('../src/island/terrain.ts', { groundHeight: () => (beach ? 1 : -2) });
stub('../src/place/terrain.ts', { H: () => 1 });
stub('../src/place/layout.ts', {
  LINKS: [],
  ORIGIN: { x: 0, z: 0 },
  TOWN_BLOCKS: [],
  VILLAGE: { x: 0, z: 0, r: 1 },
  railY: () => 0,
  toWorld: (x: number) => x,
});
stub('../src/place/works-landing.ts', { CAMP_PAD: { x: 0, z: 0 } });
stub('../src/physics/water-field.ts', { waterField: { surfaceAt: () => surface } });
stub('../src/entities/ball/view.ts', { ballMesh: { position: ball } });
stub('../src/entities/railway/state.ts', { railwayWorldRead: () => null });
stub('../src/graphics-settings.ts', {
  onGraphicsChange: () => () => {},
  autoRung: () => 0,
  graphicsInitial: () => 'full',
});
stub('../src/netplay/net.ts', { remotes: new Map() });
stub('../src/physics/platforms.ts', {
  platformById: (id: string) =>
    id === trainId ? { body: { position: { x: 987, y: 1, z: 106 }, velocity: { x: 5, z: 0 } } } : null,
});
stub('../src/player/player.ts', { me });
stub('../src/player/state.ts', { me });
stub('../src/render/sky.ts', { skyNow: { day: 1 } });
await import('../src/features/critter-fish.ts');
await import('../src/features/critter-gulls.ts');
await import('../src/features/critter-home.ts');
await import('../src/features/critter-quarry.ts');
const { sampledSpeed, wildlifeEngineIds } = await import('../src/place/wildlife.ts');
const [startFish, startGulls, ...startZones] = starts;
for (const start of startZones) start();

function update(kind: string, dt: number) {
  const view = views.get(kind)!;
  view.update({ dt, elapsed: 0 });
  return view;
}

function firstHeight(view: View, name: string) {
  return (view.mesh.getObjectByName(name) as InstancedMesh).instanceMatrix.array[13];
}

test('sampled speed preserves sign and guards a stopped clock', () => {
  for (const dt of [1 / 60, 1 / 120]) {
    assert.equal(sampledSpeed(2 * dt, dt), 2);
    assert.equal(sampledSpeed(-2 * dt, dt), -2);
  }
  assert.equal(sampledSpeed(1, 0), 0);
});

test('wildlife engine IDs cover the joined line or the entire fleet and track machine', () => {
  assert.deepEqual(
    wildlifeEngineIds(LINE2),
    lapSlots(LINE2, true).map((slot) => `railway:train${slot}-0`),
  );
  assert.deepEqual(wildlifeEngineIds(), ['railway:T1:loco', ...RAIL_TRAINS.map((_, slot) => `railway:train${slot}-0`)]);
});

test('classic fish scatter from a ball descending at 2 m/s at both frame rates', (t) => {
  t.mock.method(Math, 'random', () => 0.5);
  beach = false;
  const { P: fish } = window.__fish as { P: { x: number; z: number; scare: number }[] };
  for (const fps of [60, 120]) {
    startFish!();
    for (const f of fish) f.scare = 0;
    const first = fish[0]!;
    Object.assign(ball, { x: first.x - 1, y: 0.6, z: first.z });
    update('fish', 1 / fps);
    ball.y -= 2 / fps;
    update('fish', 1 / fps);
    assert.equal(first.scare, 1.2 - 1 / fps, `${fps} FPS`);
  }
});

test('classic gulls take off from a ball descending at 2 m/s at both frame rates', (t) => {
  t.mock.method(Math, 'random', () => 0.5);
  beach = true;
  const gulls = window.__gulls as { x: number; y: number; z: number; state: string }[];
  for (const fps of [60, 120]) {
    gulls.length = 0;
    startGulls!();
    const { x, y, z } = gulls[0]!;
    Object.assign(ball, { x, y: y + 0.7, z });
    update('gulls', 1 / fps);
    ball.y -= 2 / fps;
    update('gulls', 1 / fps);
    assert.equal(gulls[0]!.state, 'up', `${fps} FPS`);
  }
});

test('Home gulls lift from a ball moving at 0.8 m/s at both frame rates', () => {
  surface = 2;
  for (const fps of [60, 120]) {
    const dt = 1 / fps;
    me.body.position.x = 1000;
    update('home-wildlife-zone', dt);
    Object.assign(ball, { x: -8, y: 1, z: -132 });
    me.body.position.x = 0;
    update('home-wildlife-zone', dt);
    ball.x += 0.8 * dt;
    const view = update('home-wildlife', dt);
    assert.equal(firstHeight(view, 'critter-home-flock'), Math.fround(1 + (0.15 + 2.8 * dt * 4)), `${fps} FPS`);
  }
});

test('a joined train from outside the Quarry line lifts its swifts', () => {
  const slot = lapSlots(LINE2, true).find((slot) => !lapSlots(LINE2, false).includes(slot));
  assert.notEqual(slot, undefined);
  trainId = `railway:train${slot}-0`;
  me.body.position = { x: 1051, z: 80 };
  update('quarry-wildlife-zone', 0.1);
  const view = update('quarry-wildlife', 0.1);
  assert.equal(firstHeight(view, 'quarry-flock'), Math.fround(1 + (2 + 0.45 * Math.sin(0.18) + 4.5 * 0.28)));
});
