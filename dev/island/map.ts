// Top-down map of the island as composed from src/island/shape.ts and every src/pois/*/site.js, with each POI's
// keep-out discs and name. `npm run island-map` writes .look/island-map.png (and prints the land area).
// Use it when adding, moving or removing a POI: it runs in a second, no browser needed.
// `npm run island-map -- --protos` writes the protos page's heat-map backdrop instead (protos/island.png: 1 m/px, no
// keep-out rings or axes, cropped to the land plus a margin) and prints the bounds protos/heat.ts must match.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

globalThis.matchMedia ??= (() => ({ matches: false })) as unknown as typeof matchMedia; // src/constants.ts reads it at import time

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// The same sites, in the same order, as the game composes. src/island/index.ts finds them with Vite's
// import.meta.glob('../pois/*/site.js'), which Node lacks: this reads the same folders and sorts by the same key.
const islandDir = new URL('../../src/island/', import.meta.url); // the glob's keys are relative to index.js
const keys = fs
  .readdirSync(path.join(root, 'src/pois'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, 'src/pois', d.name, 'site.ts')))
  .map((d) => '../pois/' + d.name + '/site.ts')
  .sort();
const sites = await Promise.all(
  keys.map(async (key) => ({ id: key.split('/').at(-2)!, ...(await import(new URL(key, islandDir).href)).default })),
);
const { createIsland } = await import('../../src/island/stamps.ts');
const island = createIsland(sites);
const { HALF, CELL } = await import('../../src/constants.ts');

const PROTOS = process.argv.includes('--protos');
const SCALE = PROTOS ? 1 : Number(process.argv[2]) || 2; // metres per pixel
const N = Math.round((2 * HALF) / SCALE);
const rgb = Buffer.alloc(N * N * 3);
let land = 0;
const h = new Float32Array(N * N);
for (let j = 0; j < N; j++)
  for (let i = 0; i < N; i++) h[j * N + i] = island.heightAt(-HALF + (i + 0.5) * SCALE, -HALF + (j + 0.5) * SCALE);
for (let j = 0; j < N; j++)
  for (let i = 0; i < N; i++) {
    const x = -HALF + (i + 0.5) * SCALE,
      z = -HALF + (j + 0.5) * SCALE;
    const v = h[j * N + i];
    let c: number[];
    if (v <= 0) {
      const t = Math.min(1, -v / 7.5);
      c = [40 - 25 * t, 150 - 70 * t, 205 - 50 * t];
    } else {
      land++;
      if (v < 1.4) c = [236, 216, 158];
      else {
        const t = Math.min(1, (v - 1.4) / 26);
        c = [110 + 120 * t, 180 - 40 * t, 80 + 130 * t];
      }
      const p = island.paintAt(x, z);
      if (p) for (let k = 0; k < 3; k++) c[k] += (p[k] * 255 - c[k]) * p[3];
      const right = i + 1 < N ? h[j * N + i + 1] : v;
      if (Math.floor(v / 3) !== Math.floor(right / 3)) c = c.map((q) => q * 0.72); // 3 m contours
    }
    if (PROTOS) {
      rgb.set(
        c.map((q) => Math.max(0, Math.min(255, q))),
        (j * N + i) * 3,
      );
      continue;
    }
    for (const k of island.keepOut) {
      const d = Math.hypot(x - k.x, z - k.z);
      if (Math.abs(d - k.r) < SCALE * 0.6) c = [220, 40, 60];
    }
    if (Math.abs(x) < SCALE / 2 || Math.abs(z) < SCALE / 2) c = c.map((q) => q * 0.6); // world axes
    rgb.set(
      c.map((q) => Math.max(0, Math.min(255, q))),
      (j * N + i) * 3,
    );
  }

// Minimal PNG encoder (RGB, no filtering).
function png(w: number, hgt: number, data: Buffer) {
  const raw = Buffer.alloc((w * 3 + 1) * hgt);
  for (let y = 0; y < hgt; y++) data.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const chunk = (type: string, body: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const tb = Buffer.concat([Buffer.from(type), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(tb));
    return Buffer.concat([len, tb, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(hgt, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

if (PROTOS) {
  // Crop to the land plus MARGIN metres, snapped to 10 m, so the backdrop stays small.
  const MARGIN = 20;
  let i0 = N,
    i1 = 0,
    j0 = N,
    j1 = 0;
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++)
      if (h[j * N + i] > 0) {
        i0 = Math.min(i0, i);
        i1 = Math.max(i1, i);
        j0 = Math.min(j0, j);
        j1 = Math.max(j1, j);
      }
  const snap = (m: number, f: (x: number) => number) => f(m / 10) * 10;
  const x0 = Math.max(-HALF, snap(-HALF + i0 - MARGIN, Math.floor)),
    x1 = Math.min(HALF, snap(-HALF + i1 + 1 + MARGIN, Math.ceil));
  const z0 = Math.max(-HALF, snap(-HALF + j0 - MARGIN, Math.floor)),
    z1 = Math.min(HALF, snap(-HALF + j1 + 1 + MARGIN, Math.ceil));
  const w = Math.round(x1 - x0),
    hh = Math.round(z1 - z0),
    oi = Math.round(x0 + HALF),
    oj = Math.round(z0 + HALF);
  const crop = Buffer.alloc(w * hh * 3);
  for (let y = 0; y < hh; y++) rgb.copy(crop, y * w * 3, ((oj + y) * N + oi) * 3, ((oj + y) * N + oi + w) * 3);
  const file = path.join(root, 'protos/island.png');
  fs.writeFileSync(file, png(w, hh, crop));
  console.log(`${file}  (${w}x${hh} px, ${fs.statSync(file).size} bytes)`);
  console.log(`bounds for protos/heat.ts: { x0: ${x0}, z0: ${z0}, w: ${w}, h: ${hh} } (1 m/px, +z down)`);
  process.exit(0);
}
const out = path.join(root, '.look/island-map.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png(N, N, rgb));
console.log(`${out}  (${N}x${N} px, ${SCALE} m/px, +z down, origin at the cross)`);
console.log(`land: ${Math.round(land * SCALE * SCALE)} m2; grid ${Math.round((2 * HALF) / CELL) + 1} cells a side`);
for (const s of sites) console.log(`  ${s.id.padEnd(12)} ${s.name ?? ''}  at (${s.x}, ${s.z})`);
