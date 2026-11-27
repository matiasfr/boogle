// The garage's selection frame and ghost car (src/entities/railway/garage-selection.ts): everything it makes leaves
// with the view. The ghost car hangs under the train's group, which the owner never traversed, so its geometry and
// its private material are disposed by the owner's cleanup; the review of 14 November found 0 of 5 disposed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';
import { createGarageSelection, type Focus } from '../src/entities/railway/garage-selection.ts';
import * as layout from '../src/entities/railway/garage-geo.ts';
import * as cars from '../src/entities/railway/cars.ts';
import * as engine from '../src/entities/railway/engine.ts';
import { ROTUNDA_PORT_QUAY } from '../src/place/port-quay.ts';

// The real owner, as written (src/render/owned-view.ts), without the physics engine it imports: no body is made here.
const { createOwnedView } = sourceModule<typeof import('../src/render/owned-view.ts')>(
  fs.readFileSync('src/render/owned-view.ts', 'utf8'),
  { THREE, addBody: () => {}, removeBody: () => {} },
);

const disposed = (thing: THREE.EventDispatcher<{ dispose: object }>) => {
  let gone = false;
  thing.addEventListener('dispose', () => (gone = true));
  return () => gone;
};

// Exercise the real mount and owner with the unrelated rotunda and GLB artwork left out.
const kit = { enginePart: () => new THREE.Mesh(), engineDoor: () => new THREE.Mesh() };
const { createGaragePieces } = sourceModule<typeof import('../src/entities/railway/garage-pieces.ts')>(
  fs.readFileSync('src/entities/railway/garage-pieces.ts', 'utf8'),
  {
    THREE,
    ...layout,
    ...cars,
    ...engine,
    kit,
    passengerCar: () => new THREE.Group(),
    paint: () => new THREE.MeshBasicMaterial(),
  },
);
const { mountQuayRoundhouse } = sourceModule<typeof import('../src/entities/route-greybox/quay-roundhouse.ts')>(
  fs.readFileSync('src/entities/route-greybox/quay-roundhouse.ts', 'utf8'),
  {
    ...layout,
    site: ROTUNDA_PORT_QUAY,
    kit,
    level: {},
    createGaragePieces,
    quayGarage: { view: null },
    createGarageView: () => ({ dispose() {} }),
    railwayWorldRead: () => null,
    createRotundaView: () => ({ show() {}, copies() {} }),
  },
);

test('unmount releases the post, flash and four crew materials exactly once', () => {
  const owner = createOwnedView();
  mountQuayRoundhouse(owner);
  const body = owner.root.getObjectByName('garage-post-body');
  assert.ok(body instanceof THREE.Mesh && body.visible);
  const makeMaterials = sourceFunction<
    (owner: ReturnType<typeof createOwnedView>) => {
      flash: THREE.Material;
      crew: { body: THREE.Material; head: THREE.Material }[];
    }
  >('src/entities/railway/garage-view.ts', 'garageMaterials', { THREE });
  const { flash, crew } = makeMaterials(owner);
  const materials = [body.material as THREE.Material, flash, ...crew.flatMap((m) => [m.body, m.head])];
  const counts = materials.map(() => 0);
  materials.forEach((m, i) =>
    m.addEventListener('dispose', () => {
      counts[i] = counts[i]! + 1;
    }),
  );
  owner.dispose();
  owner.dispose();
  assert.deepEqual(counts, [1, 1, 1, 1, 1, 1]);
});

test('the quay mast crank and post foot turn 125 degrees from their Home orientation', () => {
  function orientation(site: 0 | 1) {
    const owner = createOwnedView();
    const { geo, table, y } = layout.garageRow(site);
    if (site === 1) mountQuayRoundhouse(owner);
    else createGaragePieces(owner, { table, y, ground: y, post: layout.polarAt(table, geo.post) }, geo);
    const axis = new THREE.Vector3(1, 0, 0);
    const foot = owner.root.getObjectByName('garage-post-foot');
    assert.ok(foot);
    const footAxis = axis.clone().applyQuaternion(foot.getWorldQuaternion(new THREE.Quaternion()));
    const crank = owner.root.getObjectByName('jib-crank');
    assert.ok(crank);
    const direction = crank
      .getWorldPosition(new THREE.Vector3())
      .sub(crank.parent!.getWorldPosition(new THREE.Vector3()));
    direction.y = 0;
    owner.dispose();
    return [direction.normalize(), footAxis];
  }
  const home = orientation(0),
    quay = orientation(1);
  home.forEach((direction, i) => {
    assert.ok(direction.distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-9);
    const expected = direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), (-125 * Math.PI) / 180);
    assert.ok(expected.distanceTo(quay[i]!) < 1e-9);
  });
});

test('stepping through the tabs draws a frame and a ghost car, and disposing the view retains nothing', () => {
  const owner = createOwnedView();
  // As garage-view.ts builds it: the root goes to the owner empty, and the train's group is added under it after.
  const root = new THREE.Group();
  owner.add(root);
  const train = new THREE.Group();
  root.add(train);
  const selection = createGarageSelection(owner, train);
  const { made } = selection;
  // The "have" frame is solid, not a ghost (decisions-look, 18 November 2026); the "goes" frame keeps the ghosts' gold.
  const [haveMat, goesMat] = made.frames.map((m) => m.material as THREE.Material);
  assert.ok(!haveMat!.transparent && haveMat!.opacity === 1 && haveMat !== goesMat && goesMat!.transparent);

  const bench: Focus = { c: [0, 1.3, 0], s: [2.3, 1.2, 3.3] };
  const wagon: Focus = { c: [0, 0.5, -7.4], s: [2.3, 1, 3.3], ghost: { z: -7.4, top: 0.5 } };
  const roof: Focus = { c: [0, 1.75, 0], s: [2.6, 2.1, 3.4] };

  selection.show(0.016, 'cars/four', bench, true, false);
  assert.deepEqual(selection.inspect(), { key: 'cars/four', whole: 12, dashed: 0, ghostCar: false });
  selection.show(0.016, 'cargo/wagon', wagon, true, false);
  assert.equal(selection.inspect().ghostCar, true, 'an owned car the copy does not carry is a ghost');
  assert.equal(made.car.position.z, -7.4);
  assert.ok(made.car.position.y > 0, 'it drops in');
  for (let i = 0; i < 30; i++) selection.show(0.016, 'cargo/wagon', wagon, true, false);
  assert.ok(Math.abs(made.car.position.y) < 1e-9, 'and settles on the rail');
  selection.show(0.016, 'looks/roof', roof, false, false);
  const dashed = selection.inspect();
  assert.ok(dashed.whole === 0 && dashed.dashed > 12 && !dashed.ghostCar, 'the roof to come has a dashed frame');
  selection.show(0.016, null, null, false, false);
  assert.deepEqual(selection.inspect(), { key: '', whole: 0, dashed: 0, ghostCar: false });
  // Drawn again, so the ghost and a frame exist at teardown.
  selection.show(0.016, 'cargo/wagon', wagon, true, false);

  // Every geometry the ghost car draws is one the module names: nothing else to lose.
  const drawn = new Set<THREE.BufferGeometry>();
  made.car.traverse((o) => o instanceof THREE.Mesh && drawn.add(o.geometry));
  assert.deepEqual([...drawn], made.geometries);
  const frameGeometries = made.frames.map((m) => m.geometry);
  const gone = [...made.geometries, ...frameGeometries, made.material, ...made.frames].map((t) =>
    disposed(t as unknown as THREE.EventDispatcher<{ dispose: object }>),
  );

  owner.dispose();
  assert.deepEqual(
    gone.map((g) => g()),
    gone.map(() => true),
    'the ghost car’s two geometries, the frames’ geometries, the private material and both instanced frames',
  );
  assert.equal(made.car.parent, null, 'the ghost car is off the train');
  assert.equal(owner.root.children.length, 0);
});

test('unmounting the quay disposes its displayed train wheels', () => {
  const owner = createOwnedView();
  mountQuayRoundhouse(owner);
  const wheels: THREE.BufferGeometry[] = [];
  owner.root.traverse((object) => {
    if (object instanceof THREE.Mesh && object.geometry instanceof THREE.CylinderGeometry) {
      wheels.push(object.geometry);
    }
  });
  assert.ok(wheels.length >= 8);
  const released = wheels.map(disposed);
  owner.dispose();
  assert.ok(released.every((wasDisposed) => wasDisposed()), 'mounted wheel geometry survived teardown');
});
