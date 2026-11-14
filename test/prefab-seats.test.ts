import { compiled, definitions } from '../src/prefab/catalogue.ts';
import { prefabGolden } from './helpers/prefab-golden.ts';
// Owner-requested step-8 goldens: execute the old seat construction blocks with recording services.
// The blocks stay source-owned across conversion; no renderer, network or physics engine runs here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';
import { PLAYER_R } from '../src/constants.ts';
import { RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { SEAT_ID } from '../src/sim/seats.ts';
import type { Seat } from '../src/entities/railway/seat.ts';
import type { Platform } from '../src/physics/platforms.ts';
import type { Body } from '../src/physics/engine.ts';
import { captureWorkshop } from './prefab-workshop.test.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import workshop from '../content/built/levels/workshop.json' with { type: 'json' };
import gorge from '../content/built/levels/gorge.json' with { type: 'json' };
import { names } from '../src/prefab/names.ts';
import * as validation from '../src/prefab/validate.ts';

function block(file: string, start: string, end: string, bindings: Record<string, unknown>) {
  const source = fs.readFileSync(file, 'utf8');
  const a = source.indexOf(start),
    b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `source boundary in ${file}`);
  sourceModule<{ capture(): void }>(`export function capture() {\n${source.slice(a, b)}\n}`, bindings).capture();
}

function captureSeats() {
  const registered: Seat[] = [];
  const bodies = new Set<Body>();
  const createOwnedView = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    { THREE, owners: new WeakMap(), addBody: (b: Body) => bodies.add(b), removeBody: (b: Body) => bodies.delete(b) },
  );
  const owner = createOwnedView();
  const registerSeat = sourceFunction<typeof import('../src/entities/railway/seat.ts').registerSeat>(
    'src/entities/railway/seat.ts',
    'registerSeat',
    { seats: registered, sitting: null, standUp() {} },
  );
  const { instantiate } = sourceModule<typeof import('../src/prefab/instantiate.ts')>(
    fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
    {
      THREE,
      artifact,
      compiled,
      definitions,
      workshop,
      gorge,
      names,
      ...validation,
      registerSeat,
      builders: new Map(names.builders.map((name) => [name, () => new THREE.Group()])),
      ROOM_GROUP: 8,
      staticBody: () => {
        throw new Error('vehicle seats must not allocate static bodies');
      },
    },
  );
  const machine = sourceFunction<readonly number[]>('src/entities/railway/machine-model.ts', 'MACHINE_CHAIRS', {});
  const car = (id: string) => {
    const mesh = new THREE.Group(),
      rock = new THREE.Group();
    mesh.add(rock);
    rock.position.y = -0.41;
    const platform: Platform = {
      id,
      body: { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() } as unknown as Body,
      hx: 1.1,
      hz: 1.6,
      top: 0.29,
      move() {},
    };
    owner.addBody(platform.body);
    return { mesh, rock, platform, hy: 0.29, y: 0 };
  };
  const flatbed = car('railway:T1:flatbed');
  block(
    'src/entities/railway/track-machine.ts',
    '    // Match the original chair frame:',
    '    heldRail = model.heldRail;',
    {
      THREE,
      owner,
      flatbed,
      model: { chairs: new THREE.Group() },
      MACHINE_DECK: 0.7,
      MACHINE_CHAIRS: machine,
      PLAYER_R,
      registerSeat,
      instantiate,
    },
  );
  const cars = RAIL_TRAINS.map((_, slot) => {
    const passenger = car(`railway:train${slot}-1`);
    block('src/entities/railway/train-view.ts', '    {\n      const n = 1,', '    // The fitted boiler:', {
      owner,
      slot,
      cars: [null, passenger],
      PLAYER_R,
      PASSENGER_CAR_UPGRADED: false,
      carKit: { CAR_DECK: 0.7, passengerCar: () => new THREE.Group() },
      instantiate,
    });
    return passenger;
  });
  return { owner, registered, flatbed, cars, bodies };
}

test('all 31 seat ids match bytes and poses match the pre-prefab construction numerically', () => {
  const h = captureSeats();
  const moving = h.registered.map((s) => ({
    id: s.id,
    group: s.group,
    platform: s.platform?.id,
    anchorView: s.anchorView,
    frame: h.cars.some((c) => c.rock === s.frame) ? 'car.rock' : null,
    at: s.at,
    exit: s.exit,
    available: s.available(),
    ...(s.forward === undefined ? {} : { forward: s.forward }),
    ...(s.perch === undefined ? {} : { perch: s.perch }),
  }));
  const workshop = captureWorkshop().placement.seats as { id: string }[];
  const ids = [...moving, ...workshop].map((s) => s.id);
  assert.equal(ids.length, 31);
  assert.equal(new Set(ids).size, 31);
  for (const id of ids) assert.match(id, SEAT_ID);
  for (const [name, value] of [
    ['ids', ids],
    ['poses', moving],
  ] as const) {
    const file = `test/fixtures/prefab-seat-${name}.json`;
    const bytes = JSON.stringify(value, null, 2) + '\n';
    if (process.env.GOLDEN === '1') fs.writeFileSync(file, bytes);
    const expected = fs.readFileSync(file, 'utf8');
    if (name === 'ids') assert.equal(bytes, expected, file);
    else prefabGolden(JSON.parse(bytes), JSON.parse(expected), file);
  }
  h.owner.dispose();
  assert.equal(h.registered.length, 0);
  assert.equal(h.bodies.size, 0);
});

test('bench and stools follow their moving parent; contention retains the other stool', () => {
  const h = captureSeats();
  const yawOf = sourceFunction<typeof import('../src/physics/platforms.ts').yawOf>(
    'src/physics/platforms.ts',
    'yawOf',
    {},
  );
  const fromPlatform = sourceFunction<typeof import('../src/physics/platforms.ts').fromPlatform>(
    'src/physics/platforms.ts',
    'fromPlatform',
    { yawOf },
  );
  const world = sourceFunction<(s: Seat, exit?: boolean) => Seat['at']>('src/entities/railway/seat.ts', 'world', {
    pose: {},
    surfacePose: {},
    PLAYER_R,
    fromPlatform,
  });
  for (const parent of [h.flatbed, h.cars[0]!]) {
    const seat = h.registered.find((s) => s.platform === parent.platform)!;
    const before = { ...world(seat) };
    parent.platform.body.position.set(10, 3, -7);
    parent.platform.body.quaternion.set(0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4));
    parent.mesh.position.copy(parent.platform.body.position);
    parent.mesh.quaternion.copy(parent.platform.body.quaternion);
    parent.rock.rotation.x = 0.2;
    const after = { ...world(seat) };
    assert.notDeepEqual(after, before);
    assert.ok(Math.abs(after.x - (10 + seat.at.z)) < 1e-12);
    assert.ok(Math.abs(after.z - (-7 - seat.at.x)) < 1e-12);
    assert.equal(after.y, 3 + seat.at.y);
    assert.ok(Math.abs(world(seat, true).y - (3 + seat.exit.y)) < 1e-12);
    assert.equal(seat.frame, parent === h.flatbed ? undefined : parent.rock);
    assert.ok(parent.mesh.children.length > 1, 'record root attached to moving mesh');
    parent.y = -31;
    assert.equal(seat.available(), false);
  }
  h.flatbed.y = 0;
  const me = { body: { position: { ...world(h.registered[0]!) } } };
  const reachable = sourceFunction<(s: Seat) => boolean>('src/entities/railway/seat.ts', 'reachable', {
    me,
    world,
    carry: { on: h.flatbed.platform },
  });
  const choices = sourceFunction<(s: Seat) => { id: string; alt: string[] }>(
    'src/entities/railway/seat.ts',
    'seatChoices',
    { seats: h.registered, me, world, reachable },
  );
  for (const [index, alternate] of [
    [0, 1],
    [1, 0],
  ] as const)
    assert.deepEqual(choices(h.registered[index]!), {
      id: `machine-deck-${index}`,
      alt: [`machine-deck-${alternate}`],
    });
  assert.equal(h.bodies.size, 8);
  h.owner.dispose();
  h.owner.dispose();
  assert.equal(h.registered.length, 0);
  assert.equal(h.bodies.size, 0);
});
