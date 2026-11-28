import assert from 'node:assert/strict';
import test from 'node:test';
import { FAR, ORIGIN } from '../src/place/layout.ts';
import { RING_CONES } from '../src/proto/greybox/ring-cones.ts';
import { houseBoxes, toWorld, SHARD, HOUSE } from '../src/proto/greybox/ring-house.ts';
import { createIslandGround, ringUL } from '../src/entities/ring-island/ground.ts';
import { summitPath, summitPathFoot } from '../src/entities/ring-island/path.ts';
import { RING_HANGOUT, RING_HANGOUT_BOARD, ringAt } from '../src/sim/railway-ring-layout.ts';

test('Ring hangout leaves the station solids, window and summit walk clear', () => {
  const centre = { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z };
  const ground = createIslandGround(RING_CONES, centre);
  const u = RING_HANGOUT.u / 100,
    lat = RING_HANGOUT.lat / 100;
  const contains = (p: { u: number; lat: number }) =>
    p.u >= u - 3 && p.u <= u + 7 && p.lat >= lat - 2.6 && p.lat <= lat + 4.7;
  for (const box of houseBoxes()) {
    for (const dx of [-box.hx, box.hx])
      for (const dy of [-box.hy, box.hy])
        for (const dz of [-box.hz, box.hz]) {
          const p = toWorld(box.x + dx, box.y, box.z + dz * Math.cos(box.rx) + dy * Math.sin(box.rx));
          assert.ok(ringUL(p.x, p.z).lat > lat + 4.7, box.name);
        }
  }
  const eye = toWorld(HOUSE.bench.x, HOUSE.bench.eye, HOUSE.bench.z);
  for (let i = 0; i <= 100; i++) {
    const f = i / 100;
    assert.ok(!contains(ringUL(eye.x + f * (SHARD.x - eye.x), eye.z + f * (SHARD.z - eye.z))));
  }
  const { way } = summitPath(ground, centre);
  for (let i = 1; i < way.length; i++) {
    const [x, z] = way[i - 1]!,
      [bx, bz] = way[i]!;
    const length = Math.hypot(bx - x, bz - z);
    for (let d = 0; d <= length; d += 0.1)
      for (const side of [-1.3, 0, 1.3]) {
        assert.ok(
          !contains(
            ringUL(x + ((bx - x) * d - (bz - z) * side) / length, z + ((bz - z) * d + (bx - x) * side) / length),
          ),
        );
      }
  }
  const foot = summitPathFoot();
  const toe = ringAt(RING_HANGOUT.u - 800, RING_HANGOUT.lat + 310);
  const toeY = ground.islandH(toe.x / 100, toe.z / 100);
  const grade = (RING_HANGOUT.floor / 100 - toeY) / 5.3;
  assert.ok(grade > 0 && grade < 0.6, 'walk-on ramp grade ' + grade);
  const eyeY = ground.islandH(foot.x, foot.z) + 1.55;
  const door = ringAt(RING_HANGOUT.u, RING_HANGOUT.lat + 212);
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const x = foot.x + (door.x / 100 - foot.x) * t,
      z = foot.z + (door.z / 100 - foot.z) * t;
    assert.ok(
      ground.islandH(x, z) < eyeY + (RING_HANGOUT.floor / 100 + 1.4 - eyeY) * t,
      'ground blocks doorway sightline',
    );
  }
  assert.ok(Math.hypot(foot.x - RING_HANGOUT_BOARD.x / 100, foot.z - RING_HANGOUT_BOARD.z / 100) < 11);
  for (const du of [-270, 270])
    for (const dl of [-220, 220]) {
      const p = ringAt(RING_HANGOUT.u + du, RING_HANGOUT.lat + dl);
      assert.ok(ground.islandH(p.x / 100, p.z / 100) < RING_HANGOUT.floor / 100);
    }
});
