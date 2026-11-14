// Owner-requested regressions from the independent B1 review: actual occupied rooms and actual yard clue calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as layout from '../src/place/layout.ts';
import * as tech from '../src/place/tech-layout.ts';
import { CELL, H, surfaceHeight } from '../src/place/terrain.ts';
import { townLocal } from '../src/place/town-plan.ts';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';

const FLOOR = sourceFunction<number>('src/entities/town/rooms.ts', 'FLOOR', layout);
type XZ = { x: number; z: number };
/** A linear heightfield triangle reaches its maximum over a rectangle at a triangle/rectangle vertex.
 * Include grid vertices inside the footprint, its corners, and intersections with all three grid edge families.
 * The Round rooms are outside the fine cove patch, so this covers the rendered surface exactly. */
function footprintSamples(room: (typeof layout.ROOM_PLOTS)['house']): XZ[] {
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
for (const [id, room] of Object.entries(layout.ROOM_PLOTS)) {
  test(`${id}: terrain never enters the occupied room interior`, () => {
    const floor = H(room.x + layout.ORIGIN.x, room.z) + FLOOR;
    let highest = -Infinity;
    for (const p of footprintSamples(room)) highest = Math.max(highest, surfaceHeight(p.x + layout.ORIGIN.x, p.z));
    assert.ok(
      highest <= floor + 0.001,
      `${id}: terrain ${highest.toFixed(3)}, floor ${floor.toFixed(3)}, intrusion ${(highest - floor).toFixed(3)} m`,
    );
  });
  test(`${id}: the ground at the door is within 5 cm of the actual floor`, () => {
    const floor = H(room.x + layout.ORIGIN.x, room.z) + FLOOR;
    const p = townLocal(room, 0, room.d / 2);
    const ground = surfaceHeight(p.x + layout.ORIGIN.x, p.z);
    assert.ok(Math.abs(floor - ground) <= 0.05, `${id}: floor ${floor.toFixed(3)}, door ground ${ground.toFixed(3)}`);
  });
}

test('the yard dressing and solid fences are anchored to the actual yard find', () => {
  const source = fs.readFileSync('src/entities/finds/secrets-view.ts', 'utf8');
  const start = source.indexOf('  // The yard sits behind the cottage:');
  const end = source.indexOf('  // The lookout:', start);
  assert.ok(start >= 0 && end > start, 'execute the real yard dressing block');
  type Point = { x: number; y: number; z: number };
  const queries: { x: number; z: number }[] = [],
    poles: Point[] = [],
    fences: Point[] = [];
  const { yard } = sourceModule<{ yard(): void }>(`export function yard() {\n${source.slice(start, end)}\n}`, {
    tech,
    SECRETS: tech.SECRETS,
    ox: layout.ORIGIN.x,
    owner: {},
    H(x: number, z: number) {
      queries.push({ x, z });
      return H(x, z);
    },
    prop(_parts: unknown, x: number, y: number, z: number) {
      poles.push({ x, y, z });
    },
    put() {},
    v: {
      x: 0,
      y: 0,
      z: 0,
      set(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
      },
    },
    addStatic(_shape: unknown, p: Point) {
      fences.push({ ...p, x: p.x - layout.ORIGIN.x });
    },
  });
  yard();
  const find = tech.SECRETS.find((s) => s.id === 'yard')!;
  assert.deepEqual(
    queries,
    [{ x: find.x + layout.ORIGIN.x, z: find.z }],
    'ground the dressing at its find, not at the removed cottage',
  );
  assert.deepEqual(
    poles.map((p) => ({ x: p.x - find.x, z: p.z - find.z })),
    [{ x: -2.5, z: -3.5 }],
  );
  assert.equal(fences.length, 2, 'retain both solid fences');
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
