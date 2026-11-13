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

function block(file: string, start: string, end: string, bindings: Record<string, unknown>) {
  const source = fs.readFileSync(file, 'utf8');
  const a = source.indexOf(start),
    b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `source boundary in ${file}`);
  sourceModule<{ capture(): void }>(`export function capture() {\n${source.slice(a, b)}\n}`, bindings).capture();
}

function captureSeats() {
  const registered: Seat[] = [];
  const createOwnedView = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    { THREE, owners: new WeakMap(), addBody() {}, removeBody() {} },
  );
  const owner = createOwnedView();
  const registerSeat = sourceFunction<typeof import('../src/entities/railway/seat.ts').registerSeat>(
    'src/entities/railway/seat.ts',
    'registerSeat',
    { seats: registered, sitting: null, standUp() {} },
  );
  const machine = sourceFunction<readonly number[]>('src/entities/railway/machine-model.ts', 'MACHINE_CHAIRS', {});
  const chairTop = sourceFunction<number>('src/entities/railway/machine-model.ts', 'MACHINE_CHAIR_SEAT', {});
  const hips = sourceFunction<number>('src/entities/railway/seat.ts', 'SEATED_HIPS', {});
  const bench = sourceFunction<typeof import('../src/entities/railway/car-kit.ts').BENCH>(
    'src/entities/railway/car-kit.ts',
    'BENCH',
    {},
  );
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
      MACHINE_CHAIR_SEAT: chairTop,
      SEATED_HIPS: hips,
      PLAYER_R,
      registerSeat,
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
      carKit: { CAR_DECK: 0.7, BENCH: bench, passengerCar: () => new THREE.Group() },
      seats: { registerSeat, lowStoolAnchor: chairTop + hips },
    });
    return passenger;
  });
  return { owner, registered, flatbed, cars };
}

test('all 31 seat ids and poses match the pre-prefab construction bytes', () => {
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
    assert.equal(bytes, fs.readFileSync(file, 'utf8'), file);
  }
  h.owner.dispose();
  assert.equal(h.registered.length, 0);
});
