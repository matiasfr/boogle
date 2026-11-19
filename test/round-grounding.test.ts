// Owner-requested regressions from the independent B1 review: actual occupied rooms and actual yard clue calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as layout from '../src/place/layout.ts';
import * as tech from '../src/place/tech-layout.ts';
import { CELL, H, surfaceHeight } from '../src/place/terrain.ts';
import { townLocal } from '../src/place/town-plan.ts';
import { sourceFunction } from '../dev/level/source.ts';
import { compiled } from '../src/prefab/catalogue.ts';
import { loadLevelArtifact } from '../src/prefab/validate.ts';
import { placeSecretThing } from '../src/entities/finds/secrets-place.ts';

const FLOOR = sourceFunction<number>('src/entities/town/rooms.ts', 'FLOOR', layout);
type XZ = { x: number; z: number };
/** A linear heightfield triangle reaches its maximum over a rectangle at a triangle/rectangle vertex.
 * Include grid vertices inside the footprint, its corners, and intersections with all three grid edge families.
 * The Round rooms are outside the fine cove patch, so this covers the rendered surface exactly. */
function footprintSamples(room: (typeof layout.ROOMS)['house']): XZ[] {
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, z]) => townLocal(room, (x! * room.w) / 2, (z! * room.d) / 2));
  const points = [...corners];
  const minX = Math.min(...corners.map((p) => p.x)),
    maxX = Math.max(...corners.map((p) => p.x));
  const minZ = Math.min(...corners.map((p) => p.z)),
    maxZ = Math.max(...corners.map((p) => p.z));
  for (let x = Math.ceil((minX - layout.GRID.x0) / CELL) * CELL + layout.GRID.x0; x <= maxX; x += CELL)
    for (let z = Math.ceil((minZ - layout.GRID.z0) / CELL) * CELL + layout.GRID.z0; z <= maxZ; z += CELL) {
      const dx = x - room.x,
        dz = z - room.z,
        c = Math.cos(room.yaw),
        s = Math.sin(room.yaw);
      if (Math.abs(dx * c - dz * s) <= room.w / 2 + 1e-9 && Math.abs(dx * s + dz * c) <= room.d / 2 + 1e-9)
        points.push({ x, z });
    }
  for (let k = 0; k < 4; k++) {
    const a = corners[k]!,
      b = corners[(k + 1) % 4]!;
    for (const [axis, offset] of [
      [(p: XZ) => p.x, layout.GRID.x0],
      [(p: XZ) => p.z, layout.GRID.z0],
      [(p: XZ) => p.x + p.z, layout.GRID.x0 + layout.GRID.z0],
    ] as const) {
      const start = axis(a),
        end = axis(b),
        delta = end - start;
      if (Math.abs(delta) < 1e-9) continue;
      for (
        let n = Math.ceil((Math.min(start, end) - offset) / CELL);
        n <= Math.floor((Math.max(start, end) - offset) / CELL);
        n++
      ) {
        const t = (offset + n * CELL - start) / delta;
        if (t >= 0 && t <= 1) points.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      }
    }
  }
  return points;
}
for (const [id, room] of Object.entries(layout.ROOMS)) {
  test(`${id}: terrain never enters the occupied room interior`, () => {
    const floor = H(room.x + layout.ORIGIN.x, room.z) + FLOOR;
    let highest = -Infinity;
    for (const p of footprintSamples(room)) highest = Math.max(highest, surfaceHeight(p.x + layout.ORIGIN.x, p.z));
    assert.ok(
      highest <= floor + 0.001,
      `${id}: terrain ${highest.toFixed(3)}, floor ${floor.toFixed(3)}, intrusion ${(highest - floor).toFixed(3)} m`,
    );
  });
  test(`${id}: the ground at the door meets the actual floor`, () => {
    const floor = H(room.x + layout.ORIGIN.x, room.z) + FLOOR;
    const p = townLocal(room, 0, room.d / 2);
    const ground = surfaceHeight(p.x + layout.ORIGIN.x, p.z);
    // A bought plot's room stands on the plot's level pad, ungraded so the slot's outline stays on its ground: its
    // doorstep is the slab's own height, one small step up.
    const step = Object.hasOwn(layout.PLOT_ROOMS, id) ? FLOOR + 0.005 : 0.05;
    assert.ok(Math.abs(floor - ground) <= step, `${id}: floor ${floor.toFixed(3)}, door ground ${ground.toFixed(3)}`);
  });
}

test('the yard dressing and solid fences are anchored to the actual yard find', () => {
  // The records' placements, resolved as the secrets view resolves them (content/levels/secrets.ts).
  const { placements } = loadLevelArtifact(
    JSON.parse(fs.readFileSync('content/built/levels/secrets.json', 'utf8')) as unknown,
    compiled.prefabs,
  );
  const queries: { x: number; z: number }[] = [];
  const frame = {
    ox: layout.ORIGIN.x,
    H(x: number, z: number) {
      queries.push({ x, z });
      return H(x, z);
    },
    pad: tech.padById,
    secret: (id: string) => tech.SECRETS.find((s) => s.id === id)!,
  };
  const yard = placements.filter((p) => p.params?.on === 'secret:yard').map((p) => placeSecretThing(p, frame)!);
  const find = tech.SECRETS.find((s) => s.id === 'yard')!;
  assert.deepEqual(
    queries,
    yard.map(() => ({ x: find.x + layout.ORIGIN.x, z: find.z })),
    'ground the dressing at its find, not at the removed cottage',
  );
  const at = (p: (typeof yard)[number]) => ({ x: p.pos[0] - layout.ORIGIN.x, y: p.pos[1], z: p.pos[2] });
  const poles = yard.filter((p) => p.prefab === 'secrets.laundry').map(at),
    fences = yard.filter((p) => p.prefab === 'secrets.fence').map(at);
  assert.deepEqual(
    poles.map((p) => ({ x: +(p.x - find.x).toFixed(9), z: +(p.z - find.z).toFixed(9) })),
    [{ x: -2.5, z: -3.5 }],
  );
  assert.ok(compiled.prefabs['secrets.laundry']!.colliders.length, 'the laundry pole is solid');
  assert.equal(fences.length, 2, 'retain both solid fences');
  assert.ok(compiled.prefabs['secrets.fence']!.colliders.length, 'the fences are solid');
  for (const [i, offset] of [
    [-3.1, 0.5],
    [0, 4.7],
  ].entries()) {
    assert.ok(Math.abs(fences[i]!.x - find.x - offset[0]!) < 1e-9, 'fence x derives from the gift anchor');
    assert.ok(Math.abs(fences[i]!.z - find.z - offset[1]!) < 1e-9, 'fence z derives from the gift anchor');
  }
  for (const p of fences) {
    assert.ok(Math.hypot(p.x - find.x, p.z - find.z) < 6, 'solid fence stays in the relocated yard');
    assert.ok(Math.abs(p.y - 0.5 - surfaceHeight(p.x + layout.ORIGIN.x, p.z)) <= 0.05, 'fence feet meet actual ground');
  }
});
