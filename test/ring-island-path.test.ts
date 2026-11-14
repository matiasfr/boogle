// Owner-requested pure place checks (docs/plans/ring-summit-path.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { FAR, ORIGIN } from '../src/place/layout.ts';
import { RING_CONES } from '../src/proto/greybox/ring-cones.ts';
import { createIslandGround } from '../src/entities/ring-island/ground.ts';
import {
  summitBridge,
  summitPath,
  summitPathFacts,
  summitPathFoot,
  summitRimRockShape,
  summitRimRocks,
} from '../src/entities/ring-island/path.ts';
import { DodecahedronGeometry } from 'three';
import { MOVER } from '../dev/level/mover.ts';

const centre = { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z };
const g = createIslandGround(RING_CONES, centre);
const facts = summitPathFacts(g, centre);
const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 0.1, `${actual} vs ${expected}`);

test('the summit path starts at the west platform ramp foot', () => {
  const foot = summitPathFoot();
  near(foot.x, 1395.8);
  near(foot.z, -836.3);
});

test('the summit bridge clears the railway and stands on uncut ground', () => {
  const { a, b, middle, approach } = summitBridge(g);
  near(a.x, 1381.2);
  near(a.y, 14.93);
  near(a.z, -876.7);
  near(b.x, 1404.7);
  near(b.y, 16.72);
  near(b.z, -892.0);
  near(middle.x, 1392.9);
  near(middle.z, -884.3);
  near(facts.bridge.span, 28);
  assert.ok(facts.bridge.grade < 0.08);
  assert.ok(facts.bridge.clearance > 8);
  assert.ok(facts.bridge.abutmentCut < 0.1);
  near(approach.x, 1374.5);
  near(approach.z, -872.3);
  near(Math.hypot(approach.x - a.x, approach.z - a.z), 8);
  // The approach is behind a on the deck's axis, with no turn at the abutment.
  const cross = (a.x - approach.x) * (b.z - a.z) - (a.z - approach.z) * (b.x - a.x);
  assert.ok(Math.abs(cross) < 1e-8);
  assert.ok((a.x - approach.x) * (b.x - a.x) + (a.z - approach.z) * (b.z - a.z) > 0);
  assert.ok(g.cone(approach.x, approach.z) - g.islandH(approach.x, approach.z) < 0.1);
});

test('off the bridge the path is never within 1.3 m of cut ground (under 0.2 m)', () => {
  assert.ok(facts.cut.depth < 0.2, `${facts.cut.depth} m cut at ${facts.cut.at} m`);
});

test('off the bridge the path is never steeper than MOVER.walkSlope', () => {
  assert.ok(facts.steepest.grade <= MOVER.walkSlope, `${facts.steepest.grade} at ${facts.steepest.at} m`);
  assert.ok(facts.steepest.grade < 0.25, `${facts.steepest.grade} at ${facts.steepest.at} m`);
});

test('the path crosses the cutting on the bridge leg and is about 330 m', () => {
  const { way, bridgeLeg } = summitPath(g, centre),
    { a, b, approach } = summitBridge(g);
  assert.equal(bridgeLeg, 3);
  assert.deepEqual(way[2], [approach.x, approach.z]);
  assert.deepEqual(way[bridgeLeg], [a.x, a.z]);
  assert.deepEqual(way[bridgeLeg + 1], [b.x, b.z]);
  assert.ok(Math.abs(facts.length - 330) < 2, `${facts.length} m`);
});

test('the rim rocks stand on uncut ground behind the summit-side rim, off the path and the bridge', () => {
  const rocks = summitRimRocks(g, centre),
    { a, b } = summitBridge(g),
    { way, bridgeLeg } = summitPath(g, centre);
  assert.ok(rocks.length >= 12 && rocks.length <= 24, `${rocks.length} rocks`);
  for (const r of rocks) {
    // Nothing cut within a metre of a rock's centre (the largest is 0.75 m from centre to corner): none overhangs.
    for (let k = 0; k < 16; k++) {
      const x = r.x + Math.cos((k * Math.PI) / 8),
        z = r.z + Math.sin((k * Math.PI) / 8);
      assert.ok(g.cone(x, z) - g.islandH(x, z) < 0.05, `cut ground by the rock at ${r.x}, ${r.z}`);
    }
    assert.ok(r.h <= 0.85 && r.w <= 1.2, 'low enough to hop (the jump is 1.6 m)');
    // Clear of the deck's line by 4 m, so the bridge's approach stays open.
    const dx = b.x - a.x,
      dz = b.z - a.z,
      off = Math.abs((r.x - a.x) * dz - (r.z - a.z) * dx) / Math.hypot(dx, dz);
    assert.ok(off > 4, `${off} m from the deck's axis`);
    for (let i = 0; i < way.length - 1; i++) {
      if (i === bridgeLeg) continue;
      const [ax, az] = way[i]!,
        [bx, bz] = way[i + 1]!,
        ex = bx - ax,
        ez = bz - az,
        t = Math.max(0, Math.min(1, ((r.x - ax) * ex + (r.z - az) * ez) / (ex * ex + ez * ez)));
      assert.ok(Math.hypot(r.x - ax - ex * t, r.z - az - ez * t) >= 3, 'three metres off the path');
    }
  }
});

test("every corner of a rim rock's collider is inside the drawn stone", () => {
  for (const r of summitRimRocks(g, centre)) {
    const { radius, drawn, box } = summitRimRockShape(r);
    // The drawn stone's faces, scaled as the view scales them; both shapes share a centre and a yaw.
    const p = new DodecahedronGeometry(radius).toNonIndexed().getAttribute('position');
    const v = (i: number) => [p.getX(i) * drawn.x, p.getY(i) * drawn.y, p.getZ(i) * drawn.z] as const;
    for (let i = 0; i < p.count; i += 3) {
      const [a, b, c] = [v(i), v(i + 1), v(i + 2)],
        e = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
        f = [c[0] - a[0], c[1] - a[1], c[2] - a[2]],
        n = [e[1]! * f[2]! - e[2]! * f[1]!, e[2]! * f[0]! - e[0]! * f[2]!, e[0]! * f[1]! - e[1]! * f[0]!],
        len = Math.hypot(n[0]!, n[1]!, n[2]!),
        d = (n[0]! * a[0] + n[1]! * a[1] + n[2]! * a[2]) / len;
      assert.ok(d > 0, 'faces wind outward');
      for (const sx of [-1, 1])
        for (const sy of [-1, 1])
          for (const sz of [-1, 1]) {
            const out = (n[0]! * sx * box.x + n[1]! * sy * box.y + n[2]! * sz * box.z) / (2 * len) - d;
            assert.ok(
              out <= 1e-6,
              `a collider corner stands ${out.toFixed(3)} m outside the stone (w ${r.w}, h ${r.h})`,
            );
          }
    }
  }
});
