// The server samples the exact centimetre grid and obstacle discs captured from the initialized client.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadBooglerLand } from '../src/host/land.ts';
import { heightIn } from '../../src/world/heights.ts';
import { GRID_RES, CELL, HALF, SEABED } from '../../src/world/grid.ts';
import type { BooglerLandBake } from '../../src/world/boogler-land.ts';

const file = new URL('../../src/world/boogler-land.json', import.meta.url);
const read = () => JSON.parse(fs.readFileSync(file, 'utf8')) as BooglerLandBake;

test('the baked Boogler land loads a dry meadow and the sea', () => {
  const land = loadBooglerLand();
  assert.ok(land.height(30, 2.5) >= 0.45);
  assert.equal(land.blocked(30, 2.5, 0.8), false);
  assert.ok(land.height(200, 200) < 0.45);
  assert.equal(land.height(HALF + 1, 0), SEABED);
  assert.equal(land.height(0, -HALF), SEABED);
  assert.equal(land.blocked(15.2, 13.4), true, 'includes the stall disc added after props initialize');
});

test('server heights equal heightIn exactly at cells and fractional positions', () => {
  const bake = read();
  const bytes = Buffer.from(bake.heights, 'base64');
  assert.equal(bake.n, GRID_RES);
  assert.equal(bytes.length, GRID_RES * GRID_RES * 2);
  const columns = Array.from({ length: bake.n }, (_, i) =>
    Array.from({ length: bake.n }, (_, j) => bytes.readInt16LE((i * bake.n + j) * 2) / 100),
  );
  const land = loadBooglerLand();
  for (let i = 0; i < GRID_RES - 1; i += 13)
    for (let j = 0; j < GRID_RES - 1; j += 17)
      for (const fraction of [0, 0.37]) {
        const x = (i + fraction) * CELL - HALF;
        const z = HALF - (j + fraction) * CELL;
        assert.equal(land.height(x, z), heightIn(columns, x, z));
      }
});

test('bucketed obstacles equal a full disc scan, including padding and disc edges', () => {
  const bake = read();
  const land = loadBooglerLand();
  const scan = (x: number, z: number, pad: number) =>
    bake.obstacles.some(([ox, oz, r]) => (ox - x) ** 2 + (oz - z) ** 2 < (r + pad) ** 2);
  for (const [ox, oz, radius] of bake.obstacles)
    for (const pad of [0, 0.8, 1.3, 20])
      for (const offset of [0, radius + pad - 0.001, radius + pad + 0.001]) {
        const x = ox + offset;
        assert.equal(land.blocked(x, oz, pad), scan(x, oz, pad), `${x},${oz}; pad=${pad}`);
      }
  assert.equal(land.blocked(NaN, NaN), false, 'the brain uses a missing origin to test initial clearance');
  assert.deepEqual(
    land.keepOut,
    bake.keepOut.map(([x, z, r]) => ({ x, z, r })),
  );
  assert.deepEqual(land.mainland, bake.mainland);
});

test('a malformed baked grid fails instead of supplying partial land', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boogler-land-'));
  const malformed = path.join(dir, 'land.json');
  try {
    fs.writeFileSync(malformed, JSON.stringify({ ...read(), heights: '' }));
    assert.throws(() => loadBooglerLand(malformed), /Boogler land.*heights/);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
