// The terrain pass on Home against the collider it must never leave where anyone stands (docs/plans/terrain-pass.md).
// The measurements come from dev/terrain-pass/drawn.ts, which reads only the pass's output (vertex heights and
// triangles) and the collider's own triangles: it does not ask the pass how it classified a vertex. The first two tests
// are the independent review's two findings (14 November), island-wide.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRID,
  HALTS,
  LINES,
  LINKS,
  ROOM_PLOTS,
  TOWN,
  FORGE,
  FORGE_FRAME,
  lineAt,
  type LinePoint,
} from '../src/place/layout.ts';
import { PROPS, SHELF_B, TABLE } from '../src/place/home-station.ts';
import { frameBesideLine, FRAME_D, FRAME_W } from '../src/place/spatial-station.ts';
import { CELL, GRADED, NX, NZ, cellX, cellZ } from '../src/place/terrain.ts';
import { GROUND_KEEPS, KEEP_MARGIN } from '../src/proto/terrain-pass/island.ts';
import { TOLERANCE, vertexNy } from '../src/proto/terrain-pass/surface.ts';
import { TILE, collider, drawnHome, measureHome, measureKeeps } from '../dev/terrain-pass/drawn.ts';

const home = drawnHome();
const s = home.surface;
/** What a player's feet may differ by from the drawn ground, metres. */
const FEET = 0.05;

test('every walkable collider face is drawn within 5 cm, island-wide', () => {
  const worst = measureHome(home);
  assert.ok(worst.walkable.triangles > 2000, 'walkable faces inside 1 m cells are measured');
  assert.ok(
    worst.walkable.gap <= FEET,
    `a walkable face (normal Y ${worst.walkable.ny}) centred at ${worst.walkable.at} is drawn ${worst.walkable.gap} m off the collider`,
  );
  // The face the review found: centred at (29.333, -139.667), normal Y 0.5734, sank 0.4856 m at one corner.
  const face = collider(29.333, -139.667);
  assert.ok(face.ny > 0.55 && face.ny < 0.6, 'the reviewed face is still a walkable one beside rock');
  for (const [x, z] of [
    [28, -140],
    [30, -140],
    [30, -138],
    [29.333, -139.667],
  ] as const)
    assert.ok(Math.abs(home.heightAt(x, z) - collider(x, z).height) <= FEET, `the reviewed face moved at ${x}, ${z}`);
  // Rock nobody can stand on keeps its ledges, bounded along each face's own normal.
  assert.ok(worst.steep.gap <= TOLERANCE.steep + 1e-5, `rock strays ${worst.steep.gap} m along its normal`);
  assert.ok(worst.steep.gap > 0.1, 'the ledges are there');
});

test('a vertex counts every collider face that touches it', () => {
  // Six triangles meet at a grid vertex. Probing strictly inside each must never find a flatter face than vertexNy did.
  let checked = 0;
  for (const cell of s.triangles.keys()) {
    const i = cell % NX,
      j = Math.floor(cell / NX);
    for (const [di, dj] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ] as const) {
      const x = cellX(i + di),
        z = cellZ(j + dj);
      let flattest = 0;
      for (let n = 0; n < 24; n++) {
        const angle = ((n + 0.5) / 24) * 2 * Math.PI;
        flattest = Math.max(flattest, collider(x + 0.01 * Math.cos(angle), z + 0.01 * Math.sin(angle)).ny);
      }
      assert.ok(vertexNy(x, z) >= flattest - 1e-9, `vertexNy missed a face at ${x}, ${z}`);
      checked++;
    }
  }
  assert.ok(checked > 10000);
});

test('the drawn ground is the collider under and 1 m around everything in the keep list', () => {
  assert.ok(
    GRADED.some((g) => g.kind === 'pad') && GRADED.some((g) => g.kind === 'strip'),
    'the terrain records what it grades',
  );
  assert.ok(GRADED.some((g) => g.kind === 'support'));
  assert.equal(GROUND_KEEPS.filter((k) => k.kind === 'pad').length, GRADED.filter((g) => g.kind === 'pad').length);
  const worst = measureKeeps(home, GROUND_KEEPS);
  assert.ok(worst.samples > 100000);
  assert.ok(
    worst.gap <= FEET,
    `under the ${worst.kind} at ${worst.keep}, the drawn ground at ${worst.at} is ${worst.gap} m off the collider`,
  );
  // The spot the review found, under the awakened timber camp's block at (32, -144): it sank 0.8063 m.
  assert.ok(Math.abs(home.heightAt(33.0417, -143) - collider(33.0417, -143).height) <= FEET);
});

test('buildings and stations named by the layout stand on drawn ground that is the collider', () => {
  // Named here from the catalogs themselves, not from the keep list, so a catalog the terrain never graded for would
  // show up as a failure rather than as a gap in both. Each is a box (or a disc) with a metre around it.
  type Site = { id: string; x: number; z: number; w: number; d: number; yaw: number };
  const sites: Site[] = [];
  const plots = [
    ...TOWN.start.map((p, n) => ({ id: `town start ${n} ${p.type}`, p })),
    ...TOWN.wood.flatMap((tier, t) => tier.map((p, n) => ({ id: `town wood ${t}.${n} ${p.type}`, p }))),
    ...TOWN.stone.flatMap((tier, t) => tier.map((p, n) => ({ id: `town stone ${t}.${n} ${p.type}`, p }))),
    ...TOWN.camps.flatMap((camp, c) => [
      ...camp.asleep.map((p, n) => ({ id: `camp ${c} asleep ${n} ${p.type}`, p })),
      ...camp.awake.map((p, n) => ({ id: `camp ${c} awake ${n} ${p.type}`, p })),
    ]),
  ];
  for (const { id, p } of plots) sites.push({ id, x: p.x, z: p.z, w: p.w ?? 6, d: p.d ?? 6, yaw: p.yaw ?? 0 });
  for (const [id, p] of Object.entries(ROOM_PLOTS)) sites.push({ id: `room ${id}`, ...p });
  sites.push({ id: 'forge', x: FORGE.x, z: FORGE.z, w: FORGE.w, d: FORGE.d, yaw: 0 });
  sites.push({ id: 'forge frame', x: FORGE_FRAME.x, z: FORGE_FRAME.z, w: FRAME_D, d: FRAME_W, yaw: FORGE_FRAME.yaw });
  for (const [id, p] of Object.entries(PROPS)) sites.push({ id: `station ${id}`, x: p.x, z: p.z, w: 3, d: 3, yaw: 0 });
  sites.push({ id: 'curio shelf', x: SHELF_B.x, z: SHELF_B.z, w: 6, d: 2, yaw: SHELF_B.yaw });
  sites.push({ id: 'turntable', x: TABLE.x, z: TABLE.z, w: 2 * TABLE.r, d: 2 * TABLE.r, yaw: 0 });
  for (const link of LINKS)
    for (const spec of link.stations) {
      const f = frameBesideLine(spec, link.line, link.dir);
      sites.push({ id: `station frame ${spec.id}`, x: f.x - 1000, z: f.z, w: FRAME_D, d: FRAME_W, yaw: f.yaw });
    }
  // Halts stand beside their line: a deck from s0 to s1, `lat` to the side.
  const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  const lines = Object.values(LINES);
  for (const halt of HALTS)
    for (let at = halt.s0; at <= halt.s1; at += 2) {
      lineAt(lines[halt.line]!, at, P);
      sites.push({
        id: `halt ${halt.name}`,
        x: P.x - P.uz * halt.lat,
        z: P.z + P.ux * halt.lat,
        w: 3,
        d: 3,
        yaw: Math.atan2(P.ux, P.uz),
      });
    }
  assert.ok(sites.length > 40);
  let samples = 0;
  for (const site of sites) {
    const cos = Math.cos(site.yaw),
      sin = Math.sin(site.yaw);
    const hw = site.w / 2 + KEEP_MARGIN,
      hd = site.d / 2 + KEEP_MARGIN;
    for (let u = -hw; u <= hw + 1e-9; u += 0.5)
      for (let v = -hd; v <= hd + 1e-9; v += 0.5) {
        const x = site.x + u * cos + v * sin,
          z = site.z - u * sin + v * cos;
        if (x <= GRID.x0 || x >= GRID.x1 || z <= GRID.z0 || z >= GRID.z1) continue;
        samples++;
        const gap = Math.abs(home.heightAt(x, z) - collider(x, z).height);
        assert.ok(
          gap <= FEET,
          `${site.id}: the drawn ground at ${x.toFixed(2)}, ${z.toFixed(2)} is ${gap} m off the collider`,
        );
      }
  }
  assert.ok(samples > 5000);
});

test('nothing moves on a far-ground tile border or beside a 2 m cell', () => {
  const onBorder = (v: number) => Math.abs(v / (TILE * CELL) - Math.round(v / (TILE * CELL))) < 1e-9;
  for (const t of home.triangles())
    for (const [x, y, z] of t)
      if (onBorder(x - GRID.x0) || onBorder(z - GRID.z0))
        assert.ok(Math.abs(y - collider(x, z).height) < 1e-4, `a tile-border vertex moved at ${x}, ${z}`);
  // A grid vertex moves only when all four cells around it are 1 m cells.
  for (const [id] of s.moved) {
    const i = id % NX,
      j = Math.floor(id / NX);
    for (const [di, dj] of [
      [-1, -1],
      [0, -1],
      [-1, 0],
      [0, 0],
    ] as const)
      assert.ok(s.fine(i + di, j + dj), `vertex ${i}, ${j} moved beside a 2 m cell`);
  }
});

test('every 1 m cell is eight triangles over the land and new vertices', () => {
  assert.ok(s.fineCells > 3000, 'the unwalkable cells are found');
  assert.equal(s.triangles.size, s.fineCells);
  const count = NX * NZ + s.position.length / 3;
  for (const list of s.triangles.values()) {
    assert.equal(list.length, 24);
    for (const v of list) assert.ok(v >= 0 && v < count);
  }
});
