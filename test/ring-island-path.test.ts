// Owner-requested pure place checks (docs/plans/ring-summit-path.md).
import '../dev/sim/hooks.ts';
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
import * as THREE from 'three';
import { PLAYER_R } from '../src/constants.ts';
import { sourceFunction } from '../dev/level/source.ts';
import { siteExit } from '../src/place/site-clearance.ts';
import { SUMMIT_BRIDGE } from '../src/entities/ring-island/path.ts';
import { ringGroundPlacements } from './helpers/ring-island-golden.ts';

const centre = { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z };
const g = createIslandGround(RING_CONES, centre);
const facts = summitPathFacts(g, centre);
type Box = { kind: 'box'; hx: number; hy: number; hz: number; offset: THREE.Vector3; rotation: THREE.Quaternion };
/** The footbridge's solids as the level places them (content/levels/ring-island.ts, `bridge/`, resolved by the view):
 * each placement's record colliders, in world space. */
async function bridgeSolids() {
  return (await ringGroundPlacements(g, 'bridge/')).flatMap(({ placement: p, record }) =>
    record.colliders.map((c): Box & { id: string } => {
      assert.equal(c.shape, 'box');
      if (c.shape !== 'box') throw new Error('box');
      const [sx, sy, sz] = p.scale ?? [1, 1, 1],
        [yaw, pitch, roll] = p.rot ?? [0, 0, 0];
      const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
      return {
        id: p.id,
        kind: 'box',
        hx: c.half[0] * sx,
        hy: c.half[1] * sy,
        hz: c.half[2] * sz,
        offset: new THREE.Vector3(...c.at)
          .multiply(new THREE.Vector3(sx, sy, sz))
          .applyQuaternion(rotation)
          .add(new THREE.Vector3(...p.pos)),
        rotation,
      };
    }),
  );
}
/** The height of a box's top face over the world (x, z), which must lie over that face. */
function topAt(box: Box, x: number, z: number) {
  const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(box.rotation);
  const y = box.offset.y + (box.hy - direction.x * (x - box.offset.x) - direction.z * (z - box.offset.z)) / direction.y;
  const local = new THREE.Vector3(x, y, z).sub(box.offset).applyQuaternion(box.rotation.clone().invert());
  assert.ok(Math.abs(local.x) <= box.hx && Math.abs(local.z) <= box.hz);
  return y;
}
const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 0.1, `${actual} vs ${expected}`);

test('the summit path starts at the west platform ramp foot', () => {
  const foot = summitPathFoot();
  near(foot.x, 1395.8);
  near(foot.z, -836.3);
});

test('the summit bridge stays at its surveyed elevation and clears the railway', () => {
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
  assert.ok(Math.abs(a.y - 14.932) <= 0.001);
  assert.ok(facts.bridge.abutmentCut > 0.28);
  near(approach.x, 1374.5);
  near(approach.z, -872.3);
  near(Math.hypot(approach.x - a.x, approach.z - a.z), 8);
  // The approach is behind a on the deck's axis, with no turn at the abutment.
  const cross = (a.x - approach.x) * (b.z - a.z) - (a.z - approach.z) * (b.x - a.x);
  assert.ok(Math.abs(cross) < 1e-8);
  assert.ok((a.x - approach.x) * (b.x - a.x) + (a.z - approach.z) * (b.z - a.z) > 0);
  assert.ok(g.cone(approach.x, approach.z) - g.islandH(approach.x, approach.z) < 0.1);
});

test('the first four metres clear the timber underside across the deck and its half-metre shoulders', () => {
  const { a, b } = summitBridge(g),
    span = Math.hypot(b.x - a.x, b.z - a.z);
  const ux = (b.x - a.x) / span,
    uz = (b.z - a.z) / span;
  for (let along = 0; along <= 4; along += 0.0625) {
    const pitch = Math.atan2(b.y - a.y, span);
    const cap = a.y + Math.tan(pitch) * along - (SUMMIT_BRIDGE.thick / 2) * (1 + 1 / Math.cos(pitch)) - 0.1;
    for (let side = -2; side <= 2; side += 0.0625)
      assert.ok(g.islandH(a.x + ux * along - uz * side, a.z + uz * along + ux * side) <= cap, `${along}, ${side}`);
  }
});

test('the deck meets the landing, clears an overlapping player and leaves resting contact alone', async () => {
  // The deck is the one walk surface: the landing before it is the ground (ground.ts LANDING).
  const { a, b } = summitBridge(g);
  const solids_ = await bridgeSolids();
  const decks = solids_.filter((box) => box.id === 'bridge/deck');
  assert.equal(decks.length, 1);
  const deck = decks[0]!;
  assert.ok(Math.abs(topAt(deck, a.x, a.z) - 14.932) <= 0.001);
  const outOf = sourceFunction('src/place/sites.ts', 'outOf', {});
  const make = sourceFunction<(shape: Box) => { exit(position: THREE.Vector3Like): unknown }>(
    'src/entities/ring-island/view.ts',
    'clearanceShape',
    {
      THREE,
      PLAYER_R,
      siteExit,
      outOf,
    },
  );
  const clearance = make(deck),
    solids = [clearance];
  const resolve = sourceFunction<
    (position: THREE.Vector3Like, solids: unknown[], height: typeof g.islandH) => THREE.Vector3Like | null
  >('src/entities/ring-island/view.ts', 'ringSceneryExit', { THREE, PLAYER_R });
  const span = Math.hypot(b.x - a.x, b.z - a.z),
    ux = (b.x - a.x) / span,
    uz = (b.z - a.z) / span;
  // In the timber a metre out from a: lifted onto the deck's top.
  const inside = { x: a.x + ux, y: a.y - SUMMIT_BRIDGE.thick / 2, z: a.z + uz };
  const exit = resolve(inside, solids, g.islandH);
  assert.ok(exit && exit.y >= a.y && !clearance.exit(exit));
  // Resting on the landing at the deck's end, on the axis and as far out as the parapets let a body walk (their inner
  // faces are 1.38 m out): left where it stands.
  for (const d of [-0.05, -0.5])
    for (const side of [-0.9, 0, 0.9]) {
      const x = a.x + ux * d - uz * side,
        z = a.z + uz * d + ux * side;
      assert.equal(resolve({ x, y: g.islandH(x, z) + PLAYER_R, z }, solids, g.islandH), null, `${d}, ${side}`);
      // Nor does any other solid of the footbridge (the parapets, abutments and bents) move them.
      assert.equal(
        resolve(
          { x, y: g.islandH(x, z) + PLAYER_R, z },
          solids_.map((box) => make(box)),
          g.islandH,
        ),
        null,
        `${d}, ${side} with the footbridge's solids`,
      );
    }
  const resting = new THREE.Vector3(0, deck.hy + PLAYER_R - 0.01, 0).applyQuaternion(deck.rotation).add(deck.offset);
  assert.equal(clearance.exit(resting), null);
});

test('off the bridge the path is never within 1.3 m of cut ground (under 0.2 m)', () => {
  assert.ok(facts.cut.depth < 0.2, `${facts.cut.depth} m cut at ${facts.cut.at} m`);
});

test('the unaffected abutment b still stands on uncut ground around its full margin', () => {
  const { b } = summitBridge(g);
  for (let radius = 0; radius <= 2; radius += 0.5) {
    for (let sample = 0; sample < 32; sample++) {
      const angle = (sample * Math.PI) / 16,
        x = b.x + radius * Math.cos(angle),
        z = b.z + radius * Math.sin(angle);
      assert.ok(g.cone(x, z) - g.islandH(x, z) < 0.1);
    }
  }
});

test('the walk from the trail over the landing onto the deck steps at most 10 cm, on the axis and both edges', async () => {
  const decks = (await bridgeSolids()).filter((box) => box.id === 'bridge/deck');
  assert.equal(decks.length, 1);
  const deck = decks[0]!,
    { a, b } = summitBridge(g),
    span = Math.hypot(b.x - a.x, b.z - a.z),
    ux = (b.x - a.x) / span,
    uz = (b.z - a.z) / span;
  // Underfoot from 7 m before a to 1 m past it: the finished ground, then the deck collider's top (3 m wide, no roll).
  for (const side of [-1.3, -1.2, 0, 1.2, 1.3]) {
    let previous = NaN,
      worst = { step: 0, at: 0 };
    for (let k = -140; k <= 20; k++) {
      const d = k * 0.05,
        x = a.x + ux * d - uz * side,
        z = a.z + uz * d + ux * side,
        y = d >= 0 ? topAt(deck, x, z) : g.islandH(x, z);
      if (Math.abs(y - previous) > worst.step) worst = { step: Math.abs(y - previous), at: d };
      previous = y;
    }
    assert.ok(worst.step <= 0.1, `${side} m off the axis: a ${worst.step.toFixed(3)} m step at ${worst.at} m`);
  }
});

test('a mount correction clears the lower sphere against the sloping ground beside the landing', () => {
  const resolve = sourceFunction<
    (position: THREE.Vector3Like, solids: never[], height: typeof g.islandH) => THREE.Vector3Like | null
  >('src/entities/ring-island/view.ts', 'ringSceneryExit', { THREE, PLAYER_R });
  const x = 1379.69,
    z = -878.461;
  const exit = resolve({ x, y: g.islandH(x, z), z }, [], g.islandH);
  assert.ok(exit);
  const uphill = new THREE.Vector3(exit.x - 0.14, g.islandH(exit.x - 0.14, exit.z), exit.z);
  const distance = uphill.distanceTo(exit);
  assert.ok(distance >= PLAYER_R - 0.02, `ground is ${(PLAYER_R - distance).toFixed(3)} m inside the sphere`);
});

test('taper clearance includes the wider upper rim when the top radius exceeds the base', () => {
  const outOf = sourceFunction('src/place/sites.ts', 'outOf', {});
  const make = sourceFunction<(shape: object) => { exit(position: THREE.Vector3Like): unknown }>(
    'src/entities/ring-island/view.ts',
    'clearanceShape',
    { THREE, PLAYER_R, siteExit, outOf },
  );
  const taper = make({ kind: 'cylinder', rTop: 2, rBottom: 1, h: 2, segments: 7 });
  assert.ok(taper.exit({ x: 2.1, y: 1, z: 0 }), 'body sphere overlaps the top vertex at (2, 1, 0)');
});

test('off the bridge the path, the landing included at every offset, is never steeper than MOVER.walkSlope', () => {
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

test("every rim rock's collider top stands at least 0.45 m over its ground", () => {
  // src/place/pose.ts's safe() sweeps down to 0.4 m over the ground: a lower box would let a saved pose return
  // inside a rock (test/ring-island-rim-pose.test.ts runs that policy on the real colliders).
  for (const r of summitRimRocks(g, centre)) {
    const { lift, box } = summitRimRockShape(r),
      top = lift + box.y / 2;
    assert.equal(r.y, g.islandH(r.x, r.z));
    assert.ok(top >= 0.45, `collider top ${top.toFixed(3)} m over the ground at ${r.x}, ${r.z}`);
  }
});
