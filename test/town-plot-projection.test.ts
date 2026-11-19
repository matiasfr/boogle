import test from 'node:test';
import assert from 'node:assert/strict';

import { townId } from '../src/sim/railway-queries-trade.ts';
import { railRoom } from './helpers/rail-room.ts';
import { createRailway } from './helpers/rail.ts';
import { createTownReader, laidStretches, townLookOf } from '../src/entities/town/town-read.ts';
import type { ReadWorld } from '../src/sim/railway-rows.ts';
import { QJob, Town } from '../src/sim/railway-components.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { HALTS, LINKS, PLOT_ROOMS, lineAt } from '../src/place/layout.ts';
import { sourceFunction } from '../dev/level/source.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };

test('plot caching survives unrelated ticks and refreshes each delivery input without mutating older reads', () => {
  const seeded = (wood: number, stone: number) => {
    const w = createRailway();
    Object.assign(w.mut(Town, townId(w, 0))!, { wood, stone });
    const room = railRoom({ w, t: 0 });
    const client = room.join('reviewer', 'reviewer', 0);
    room.ready();
    return { room, read: client.adapter.read };
  };
  let current = seeded(0, 0);
  const reader = createTownReader(() => current.read);
  const first = reader.look()!.plots;
  current.room.run(10);
  assert.strictEqual(reader.look()!.plots, first, 'new ticks without freight reuse the projection');
  current = seeded(0, 0);
  assert.strictEqual(reader.look()!.plots, first, 'another world with the same freight reuses the projection');

  current = seeded(8, 0);
  const timber = reader.look()!.plots;
  assert.deepEqual(timber, { wood: 8, stone: 0, staked: [0] });
  assert.notStrictEqual(timber, first);
  assert.strictEqual(reader.look()!.plots, timber);

  current = seeded(8, 1);
  const stone = reader.look()!.plots;
  assert.deepEqual(stone, { wood: 8, stone: 1, staked: [0] });
  assert.notStrictEqual(stone, timber);
  assert.strictEqual(reader.look()!.plots, stone);
  assert.deepEqual(first, { wood: 0, stone: 0, staked: [] });
  assert.deepEqual(timber, { wood: 8, stone: 0, staked: [0] });
});

// The driver's train set (docs/brainstorms/first-house-resident.md, step 5): the one laid-stretch reader both model
// tables draw sees a stretch the room lays, and the train set draws more for it, bright on the shared clock.
test('a newly laid stretch reaches the shared reader and grows the driver’s train set', () => {
  const lookAt = (laid: boolean) => {
    const w = createRailway();
    if (laid) Object.assign(w.mut(QJob, w.lookup(QJob, 0)!)!, { completion: 1, end: 900 });
    return townLookOf(w as unknown as ReadWorld, 1000);
  };
  const before = [...laidStretches(lookAt(false))],
    after = [...laidStretches(lookAt(true))];
  assert.deepEqual(after.slice(0, before.length), before, 'what was down stays down, in the same order');
  assert.deepEqual(after.slice(before.length), [
    { line: 1, lo: LINE2_STATIONS[0]!.fromCm / 100, hi: LINE2_STATIONS[0]!.toCm / 100, end: 900 },
  ]);
  const fit = sourceFunction<typeof import('../src/entities/town/model-railway.ts').fitTrainSet>(
    'src/entities/town/model-railway.ts',
    'fitTrainSet',
    {},
  );
  const plan = sourceFunction<typeof import('../src/entities/town/model-railway.ts').planTrainSet>(
    'src/entities/town/model-railway.ts',
    'planTrainSet',
    { lineAt },
  );
  const look = sourceFunction<import('../src/entities/town/model-railway.ts').TrainSetLook>(
    'src/entities/town/model-railway.ts',
    'LOOK',
    {},
  );
  const [solid] = artifact.prefabs['town.driver-table'].colliders as { shape: string; at: number[]; half: number[] }[];
  assert.equal(solid?.shape, 'box');
  const box = sourceFunction<typeof import('../src/entities/town/model-railway.ts').tableBox>(
    'src/entities/town/model-railway.ts',
    'tableBox',
    {},
  )(solid!);
  const room = PLOT_ROOMS.plot3;
  const lines = LINKS.map((l) => l.line);
  const at = fit(lines, room.yaw, box, 0.08);
  const draw = (stretches: typeof before, tick: number) => {
    const bits: { x: number; z: number; glow: number }[] = [];
    const { n } = plan(
      stretches,
      lines,
      HALTS,
      [],
      at,
      box.top,
      tick,
      look,
      (x, _y, z, _sx, _sy, _sz, _yaw, _c, glow) => bits.push({ x, z, glow }),
    );
    assert.equal(n, bits.length);
    for (const b of bits) {
      assert.ok(Math.abs(b.x - box.x) <= box.hx && Math.abs(b.z - box.z) <= box.hz, 'every bit on the baseboard');
    }
    return bits;
  };
  const was = draw(before, 1000),
    now = draw(after, 1000);
  assert.ok(now.length > was.length, `the table grows: ${was.length} -> ${now.length} bits`);
  assert.ok(now.some((b) => b.glow > 0) && !was.some((b) => b.glow > 0), 'the newest stretch is bright');
  assert.ok(!draw(after, 900 + look.freshTicks).some((b) => b.glow > 0), 'and dries on the shared clock');
  // The table stands clear of the door lane (and Buddy's radius) and of the driver's spot, inside the walls.
  const DOOR = sourceFunction<{ w: number }>('src/entities/town/rooms.ts', 'DOOR', {});
  assert.ok(box.x - box.hx >= DOOR.w / 2 + 0.3, 'clear of the door lane');
  assert.ok(box.x - box.hx - 0.6 > 0.45 * 2, 'clear of the driver at room x 0.6');
  assert.ok(box.x + box.hx < room.w / 2 - 0.09 - 0.1 && box.z - box.hz > -room.d / 2 + 0.09 + 0.1, 'off the walls');
});
