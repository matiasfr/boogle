import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cargoGround, freshCargo, moveCargo, validCargo, validGround } from '../src/proto/place/big-cargo.ts';

test('one claimant, one ground object; stale pickup/drop cannot spend a new hold', () => {
  const source = freshCargo();
  const a = moveCargo(source, 'a', 0, 'pick', null)!;
  assert.equal(moveCargo(a, 'b', 0, 'pick', null), null);
  assert.equal(moveCargo(a, 'b', 1, 'drop', null), null);
  const ground = { x: 10, y: 4, z: 20, yaw: 0 };
  const down = moveCargo(a, 'a', 1, 'drop', ground)!;
  assert.equal(down.holder, null);
  assert.deepEqual(down.ground, ground);
  const saved = JSON.parse(JSON.stringify(down));
  assert.ok(validCargo(saved));
  const b = moveCargo(saved, 'b', 2, 'pick', null)!;
  assert.equal(b.holder, 'b');
  assert.equal(b.ground, null);
  assert.equal(moveCargo(b, 'a', 1, 'drop', ground), null);
  assert.equal(moveCargo(b, 'a', 2, 'pick', null), null);
  assert.deepEqual(moveCargo(b, 'b', 3, 'drop', null), { revision: 4, holder: null, ground: null });
});

test('wire/save validation rejects ambiguous ownership and malformed poses', () => {
  for (const value of [
    null,
    {},
    { ...freshCargo(), revision: -1 },
    { ...freshCargo(), holder: 7 },
    { ...freshCargo(), holder: 'a', ground: { x: 1, y: 2, z: 3, yaw: 0 } },
  ])
    assert.equal(validCargo(value), false);
  for (const value of [
    { x: NaN, y: 3, z: 0, yaw: 0 },
    { x: 0, y: 3, z: Infinity, yaw: 0 },
  ])
    assert.equal(validGround(value), false);
});

test('drop footprint is in front, dry, level and reachable or returns to source', () => {
  const p = { x: 0, y: 4, z: 0, yaw: 0 };
  for (const kind of ['beam', 'boiler'] as const) {
    const ground = cargoGround(
      kind,
      p,
      () => 4,
      () => true,
    )!;
    assert.equal(ground.z, -2.4);
    assert.equal(ground.y, 4);
    assert.equal(
      cargoGround(
        kind,
        p,
        () => null,
        () => true,
      ),
      null,
    );
    assert.equal(
      cargoGround(
        kind,
        p,
        () => 1,
        () => true,
      ),
      null,
    );
    assert.equal(
      cargoGround(
        kind,
        p,
        () => 7,
        () => true,
      ),
      null,
    );
    assert.equal(
      cargoGround(
        kind,
        p,
        () => 4,
        () => false,
      ),
      null,
    );
  }
  assert.equal(
    cargoGround(
      'beam',
      p,
      (x) => (Math.abs(x) > 4 ? 1 : 4),
      () => true,
    ),
    null,
  );
  assert.equal(
    cargoGround(
      'beam',
      p,
      (x) => (Math.abs(x) > 4 ? null : 4),
      () => true,
    ),
    null,
  );
});
