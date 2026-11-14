// The coast texture in regions (docs/plans/ring-island-build1.md, step R2a): shores far apart bake as separate regions
// packed as rows of one texture, and Home and Place keep their baked bytes when a far region is added.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three/webgpu';
import { CELL, GRID_RES, HALF, SEA } from '../src/constants.ts';
import { gridBedAt, registerShoreProvider } from '../src/render/water/shore-providers.ts';
import { createCoast, type Coast } from '../src/render/water/coast.ts';
import { GRID, ORIGIN } from '../src/place/layout.ts';
import { heights as placeHeights, NX, NZ, at, fineHeightAt } from '../src/place/terrain.ts';
import { coveSurface } from '../src/place/cove.ts';

// Home's heights come from Vite-only layout data, so Home here is a stand-in island on Home's own grid, bounds and
// extent; Place is its real terrain and bed query (src/place/water.ts).
function registerToday() {
  const home = (i: number, j: number) => {
    const x = i * CELL - HALF,
      z = HALF - j * CELL;
    return 14 - Math.hypot(x * 0.9, z * 1.1) / 9 + 2 * Math.sin(x / 23) * Math.cos(z / 31);
  };
  const off = [
    registerShoreProvider({
      id: 'home',
      bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
      seaLevel: SEA,
      revision: 'test-home',
      extent: 512,
      bedAt: gridBedAt({ x0: -HALF, z0: HALF, dx: CELL, dz: -CELL, nx: GRID_RES, nz: GRID_RES, height: home }),
    }),
  ];
  const bounds = {
    minX: ORIGIN.x + GRID.x0,
    maxX: ORIGIN.x + GRID.x1,
    minZ: ORIGIN.z + GRID.z0,
    maxZ: ORIGIN.z + GRID.z1,
  };
  const gridBed = gridBedAt({
    x0: bounds.minX,
    z0: bounds.minZ,
    dx: GRID.cell,
    dz: GRID.cell,
    nx: NX,
    nz: NZ,
    height: (i, j) => placeHeights[at(i, j)]!,
    triangles: true,
  });
  off.push(
    registerShoreProvider({
      id: 'place',
      bounds,
      seaLevel: SEA,
      revision: 'test-place',
      extent: 1024,
      bedAt: (x, z) => {
        const bed = gridBed(x, z);
        const lx = x - ORIGIN.x,
          lz = z - ORIGIN.z;
        return bed.valid ? { valid: true, height: coveSurface(lx, lz, fineHeightAt(lx, lz, bed.height)) } : bed;
      },
    }),
  );
  return () => off.forEach((f) => f());
}

/** The texture's bytes and every CPU sample on a lattice over the shores and the sea around them, hashed. */
function digest(coast: Coast) {
  const tex = coast.texture();
  const texture = createHash('sha256')
    .update(new Uint8Array((tex.image.data as Uint16Array).buffer))
    .digest('hex');
  const samples = new Float64Array(5 * 720 * 400);
  let n = 0;
  for (let x = -700; x < 1960; x += 3.7)
    for (let z = -700; z < 760; z += 3.7) {
      const s = coast.sampleAt(x, z);
      samples[n++] = s.bed;
      samples[n++] = s.shade;
      samples[n++] = s.normal[0];
      samples[n++] = s.normal[1];
    }
  const sampled = createHash('sha256')
    .update(new Uint8Array(samples.buffer, 0, n * 8))
    .digest('hex');
  return { width: tex.image.width, height: tex.image.height, texture, sampled, n };
}

// v36 Home flip: terrain inputs changed through layout.ts; coast/shader code is unchanged.
// Print replacement texture/sample digests after an intentional terrain change (then review and update only those pins):
// PRINT_COAST_BASELINE=1 node --test --test-name-pattern='two shores' test/coast-regions.test.ts
// Size, transform, lattice bounds and region assertions remain independent of regeneration.
const COAST_BASELINE = {
  width: 2015,
  height: 780,
  texture: '0b1e7b2783241492cff196cd0c46ccca8aecf4daec8d97175ed45aa5ba3ca62d',
  sampled: '39bbe9345c7a46414d3da0d3509523107b394814f7b2575e9b1b58d15f423fdb',
  transform: [-375, -400, 0.0004962779156327543, 0.001282051282051282],
};

test('the two shores bake as one region with the pinned terrain bytes', () => {
  const off = registerToday();
  const coast = createCoast();
  try {
    coast.sync();
    const { n, ...d } = digest(coast);
    if (process.env.PRINT_COAST_BASELINE === '1') console.log(JSON.stringify(d, null, 2));
    assert.deepEqual(d, {
      width: COAST_BASELINE.width,
      height: COAST_BASELINE.height,
      texture: COAST_BASELINE.texture,
      sampled: COAST_BASELINE.sampled,
    });
    assert.ok(n > 1e6);
    const { coast: c } = coast.inspect();
    assert.equal(c.regions.length, 1);
    assert.deepEqual(c.regions[0]!.ids, ['home', 'place']);
    assert.deepEqual(c.regions[0]!.transform, COAST_BASELINE.transform);
    assert.equal(c.textureBytes, COAST_BASELINE.width * COAST_BASELINE.height * 4);
  } finally {
    coast.dispose();
    off();
  }
});

test('a far island bakes as its own region at 1 m, and the sea between reads open', () => {
  const off = registerToday();
  // A 700 m island 1.5 km south of Place's grid: a cone 20 m high, its shore about 250 m from its centre.
  const island = { minX: 1000, maxX: 1700, minZ: -280 - 1500 - 700, maxZ: -280 - 1500 };
  const cx = (island.minX + island.maxX) / 2,
    cz = (island.minZ + island.maxZ) / 2;
  const offIsland = registerShoreProvider({
    id: 'ring-test',
    bounds: island,
    seaLevel: SEA,
    revision: 1,
    extent: 1024,
    bedAt: (x, z) => ({ valid: true, height: 20 - Math.hypot(x - cx, z - cz) * 0.08 }),
  });
  const coast = createCoast();
  try {
    coast.sync();
    const { coast: c } = coast.inspect();
    assert.equal(c.regions.length, 2);
    assert.deepEqual(
      c.regions.map((r) => [r.ids, r.cell]),
      [
        [['home', 'place'], 1],
        [['ring-test'], 1],
      ],
    );
    assert.deepEqual(c.regions[0]!.transform, COAST_BASELINE.transform, 'Home and Place keep their texels');
    assert.equal(c.regions[1]!.row, COAST_BASELINE.height);
    assert.ok(c.height <= 2048 && c.width === COAST_BASELINE.width);
    // Home and Place's rows are today's bytes; the island's sit below them.
    const data = coast.texture().image.data as Uint16Array;
    const rows = createHash('sha256')
      .update(new Uint8Array(data.buffer, 0, COAST_BASELINE.width * COAST_BASELINE.height * 4))
      .digest('hex');
    assert.equal(rows, COAST_BASELINE.texture);
    // The island's own bed, its shore and its waterline normal pointing out to sea.
    assert.ok(Math.abs(coast.sampleAt(cx, cz).bed - 20) < 0.1);
    const shore = coast.sampleAt(cx + 250, cz);
    assert.ok(Math.abs(shore.bed) < 0.1);
    assert.ok(shore.normal[0] > 0.9, `normal ${shore.normal}`);
    // Between the regions: the nearest region's open-sea margin. The CPU reads its deep bed (swimming); the shader clamps
    // to the region's border texels, which are open sea in both channels.
    const between = coast.sampleAt(1350, (-280 - 1500) / 2 - 140);
    assert.ok(between.bed < SEA - 40, `between ${JSON.stringify(between)}`);
    const half = (k: number) => THREE.DataUtils.fromHalfFloat(data[k]!);
    const r = c.regions[1]!;
    for (let i = 0; i < r.nx; i += 37) {
      const top = (r.row * c.width + i) * 2,
        bottom = ((r.row + r.nz - 1) * c.width + i) * 2;
      assert.equal(half(top + 1), -60);
      assert.equal(half(bottom + 1), -60);
      assert.equal(half(top), SEA - 34.5);
    }
  } finally {
    coast.dispose();
    offIsland();
    off();
  }
});
