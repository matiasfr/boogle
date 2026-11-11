// Ring Island's greybox station house (src/proto/greybox/ring-house.ts; docs/brainstorms/junction-stations.md, section 6):
// the floor is walkable through the door (a collider gap), the window is not, the window's axis points at the shard
// from the bench, the house stands on land inside the keep band and level with the platforms.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  at,
  benchEye,
  CONCOURSE,
  HALT,
  HOUSE,
  houseBoxes,
  toWorld,
  windowOffAxisDeg,
  type HouseBox,
} from '../src/proto/greybox/ring-house.ts';
import { ringHeight } from '../src/proto/greybox/ring-cones.ts';
import { ORIGIN } from '../src/proto/place/layout.ts';

const R = 0.45,
  TALL = 1.8;
const boxes = houseBoxes();
/** Whether a point (local frame) lies inside a box tilted about its own x axis. */
function inside(b: HouseBox, x: number, y: number, z: number) {
  const dy = y - b.y,
    dz = z - b.z,
    c = Math.cos(b.rx),
    s = Math.sin(b.rx);
  // into the box's frame: undo the rotation about x
  const ly = dy * c + dz * s,
    lz = -dy * s + dz * c;
  return Math.abs(x - b.x) <= b.hx && Math.abs(ly) <= b.hy && Math.abs(lz) <= b.hz;
}
/** Whether a standing player (a cylinder, sampled) at local (x, z), feet on the floor, touches any solid. */
function blocked(x: number, z: number, skip: string[] = []) {
  for (const b of boxes) {
    if (skip.includes(b.name)) continue;
    for (const y of [0.05, 0.5, 1.0, 1.4, TALL])
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        if (inside(b, x + Math.cos(a) * R, y, z + Math.sin(a) * R)) return b.name;
      }
    for (const y of [0.05, 0.5, 1.0, 1.4, TALL]) if (inside(b, x, y, z)) return b.name;
  }
  return null;
}
/** The first solid hit walking a straight line in the house's floor plane, or null. */
function walk(x0: number, z0: number, x1: number, z1: number, skip: string[] = []) {
  const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.05);
  for (let i = 0; i <= n; i++) {
    const hit = blocked(x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n, skip);
    if (hit) return hit;
  }
  return null;
}

test('the room is 5 by 4 inside with a 3.2 m ceiling and leans at least 12 degrees', () => {
  assert.deepEqual(HOUSE.room, { w: 5, d: 4, h: 3.2 });
  assert.ok(HOUSE.lean >= 12);
});

test('the door is a gap: 1.6 m or wider, 2.6 m clear, and a player walks in and out through it', () => {
  assert.ok(HOUSE.door.w >= 1.6 && HOUSE.door.h >= 2.6);
  const x = HOUSE.door.x,
    out = HOUSE.room.d / 2 + 3;
  // from the forecourt, in through the door to the bench's front and the room's middle, and out again
  assert.equal(walk(x, out, x, 0), null, 'in');
  assert.equal(walk(x, 0, 0, -0.6, ['bench', 'bench-back']), null, 'across the room to the window');
  assert.equal(walk(0, 1.4, x, 1.4), null, 'round the bench');
  assert.equal(walk(x, 1.4, x, out), null, 'out');
  // a body wider than the gap would not pass, and the wall beside the door is solid
  assert.notEqual(walk(x - 1.6, out, x - 1.6, 0), null, 'the south wall left of the door');
  assert.notEqual(walk(-x, out, -x, 0), null, 'the south wall west of the door');
});

test('the window is not a way out: its sill and the wall beside it are solid', () => {
  assert.notEqual(walk(0, 0, 0, -3.5, ['bench', 'bench-back']), null);
});

test('the window faces the shard within 3 degrees from the bench', () => {
  const off = windowOffAxisDeg();
  assert.ok(off < 3, `window axis is ${off.toFixed(2)} degrees off the line to the shard`);
});

test('the house stands on a terrace level with the platforms, clear of the ground under it, inside the keep band', () => {
  assert.equal(HOUSE.floorY, HALT.platformY);
  assert.equal(CONCOURSE.y, HALT.platformY);
  const t = CONCOURSE.terrace;
  let ground = -Infinity;
  for (let i = 0; i <= 20; i++)
    for (let j = 0; j <= 20; j++) {
      const p = at(t.u0 + ((t.u1 - t.u0) * i) / 20, t.lat0 + ((t.lat1 - t.lat0) * j) / 20);
      ground = Math.max(ground, ringHeight(p.x - ORIGIN.x, p.z - ORIGIN.z));
    }
  assert.ok(ground <= HOUSE.floorY, `the cones rise to ${ground.toFixed(2)} m under the terrace, above the floor`);
  // every solid's footprint corner stays on the terrace
  for (const b of boxes) {
    if (b.name === 'roof') continue;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const w = toWorld(b.x + sx * b.hx, 0, b.z + sz * b.hz);
        // back to (u, lat): u = -(z - HEAD.z - HX lat), solved with the skew ignored beyond a few mm
        const u = -(w.z - at(0, 0).z),
          lat = w.x - at(0, 0).x - 0.0272 * u;
        assert.ok(u >= t.u0 - 0.3 && u <= t.u1 + 0.3 && lat >= t.lat0 && lat <= t.lat1, `${b.name} corner ${u},${lat}`);
        assert.ok(Math.abs(lat) <= 25, 'within 25 m of the track');
      }
  }
});

test('the bench eye is inside the room, under the ceiling', () => {
  const e = benchEye();
  assert.ok(e.y > HOUSE.floorY && e.y < HOUSE.floorY + HOUSE.room.h);
});
