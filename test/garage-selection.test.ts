// The garage's selection frame and ghost car (src/entities/railway/garage-selection.ts): everything it makes leaves
// with the view. The ghost car hangs under the train's group, which the owner never traversed, so its geometry and
// its private material are disposed by the owner's cleanup; the review of 14 November found 0 of 5 disposed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceModule } from '../dev/level/source.ts';
import { createGarageSelection, type Focus } from '../src/entities/railway/garage-selection.ts';

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

test('stepping through the tabs draws a frame and a ghost car, and disposing the view retains nothing', () => {
  const owner = createOwnedView();
  // As garage-view.ts builds it: the root goes to the owner empty, and the train's group is added under it after.
  const root = new THREE.Group();
  owner.add(root);
  const train = new THREE.Group();
  root.add(train);
  const selection = createGarageSelection(owner, train);
  const { made } = selection;

  const bench: Focus = { c: [0, 1.3, 0], s: [2.3, 1.2, 3.3] };
  const wagon: Focus = { c: [0, 0.5, -7.4], s: [2.3, 1, 3.3], ghost: { z: -7.4, top: 0.5 } };
  const cradle: Focus = { c: [0, 1.05, -7.4], s: [2, 1.1, 2.9], ghost: { z: -7.4, top: 0.5 } };
  const roof: Focus = { c: [0, 1.75, 0], s: [2.6, 2.1, 3.4] };

  selection.show(0.016, 'cars/four', bench, true, false);
  assert.deepEqual(selection.inspect(), { key: 'cars/four', whole: 12, dashed: 0, ghostCar: false });
  selection.show(0.016, 'cargo/wagon', wagon, true, false);
  assert.equal(selection.inspect().ghostCar, true, 'an owned car the copy does not carry is a ghost');
  assert.equal(made.car.position.z, -7.4);
  assert.ok(made.car.position.y > 0, 'it drops in');
  for (let i = 0; i < 30; i++) selection.show(0.016, 'cargo/wagon', wagon, true, false);
  assert.ok(Math.abs(made.car.position.y) < 1e-9, 'and settles on the rail');
  selection.show(0.016, 'cargo/cradle', cradle, false, false);
  const dashed = selection.inspect();
  assert.ok(dashed.whole === 0 && dashed.dashed > 12 && dashed.ghostCar, 'a part to come: dashed, over its wagon');
  selection.show(0.016, 'looks/roof', roof, false, true);
  assert.equal(selection.inspect().ghostCar, false);
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
