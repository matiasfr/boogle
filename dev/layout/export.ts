// The island as JSON for the layout lab (docs/proposals/island-layout.md): `node dev/layout/export.ts [out.json]`
// writes .look/layout/island.json by default. It holds a 2 m heightmap of the ground with no movable POI on it (the
// caves stay, they don't move), plus each movable POI's own footprint (height change and paint around its site), so the
// lab can drag a POI and redraw the ground: ground = base + every POI's patch at its new place. Also ROUTE, the home
// palms (src/world/home-land.json), spawn, the court and the numbers the lab times things with (run speeds from
// src/physics/physics.ts, the wagon's timetable from src/sim/wagon.ts).
//
// A layout file (dev/layouts/<name>.json, what the lab's "Copy layout" gives you) has the same shape without the
// terrain: { version, name, pois: [{ id, x, z }], route: [{ age, x, z, to }], ... }. `?layout=<name>` in the game reads
// it (src/island/layout.ts).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

(globalThis as { matchMedia?: unknown }).matchMedia ??= () => ({ matches: false }); // src/constants.ts reads it

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] ?? path.join(root, '.look/layout/island.json'));

const { createIsland } = await import('../../src/island/stamps.ts');
const { naturalHeight, MAINLAND, MASSIF } = await import('../../src/island/shape.ts');
const { lerp, smoothstep } = await import('../../src/math-pure.ts');
const { HALF, CELL, COURT, SEA, SEABED } = await import('../../src/world/grid.ts');
const { ROUTE, RING_R } = await import('../../src/sim/route.ts');
const { WAGON_CRUISE, WAGON_ACCEL, WAGON_DWELL } = await import('../../src/sim/wagon.ts');
const { MS_PER_TICK } = await import('../../src/sim/bank.ts');
const { SPAWN, BALL_SPAWN, FOG_NEAR, FOG_FAR } = await import('../../src/constants.ts');
const { PATCH } = await import('../../src/sim/mushrooms.ts');
type Site = import('../../src/island/stamps.ts').Site;

// Every POI's site, in folder order (src/island/index.ts composes them the same way).
const poiDir = path.join(root, 'src/pois');
const ids = fs
  .readdirSync(poiDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(poiDir, d.name, 'site.ts')))
  .map((d) => d.name)
  .sort();
const sites: (Site & { id: string })[] = [];
for (const id of ids) sites.push({ id, ...(await import(`../../src/pois/${id}/site.ts`)).default });
// The caves' stamps are in world coordinates around their tunnels: they stay put, so they're part of the base.
const FIXED = new Set(['caves']);

// The court is levelled to its centre height (src/island/ground.ts), the same everywhere.
type Island = ReturnType<typeof createIsland>;
const levelled = (isl: Island) => {
  const hc = isl.heightAt(COURT.x, COURT.z);
  return (x: number, z: number) =>
    lerp(isl.heightAt(x, z), hc, 1 - smoothstep(COURT.r, COURT.r + 6, Math.hypot(x - COURT.x, z - COURT.z)));
};

const STEP = 2; // metres per cell
const N = Math.round((2 * HALF) / STEP);
const cx = (i: number) => -HALF + (i + 0.5) * STEP;
const cz = (j: number) => -HALF + (j + 0.5) * STEP;
const fixedSites = sites.filter((s) => FIXED.has(s.id));
const baseIsland = createIsland(fixedSites);
const baseH = levelled(baseIsland);
const base = new Array<number>(N * N);
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) base[j * N + i] = Math.round(baseH(cx(i), cz(j)) * 10);

// Paint: a palette of colours, cells hold palette index * 16 + strength (0..15); 0 = no paint.
const palette: string[] = [];
const paintCode = (p: number[] | null | undefined): number => {
  if (!p || p[3] < 0.04) return 0;
  const hex =
    '#' +
    [0, 1, 2]
      .map((k) =>
        Math.round(Math.min(1, Math.max(0, p[k])) * 15)
          .toString(16)
          .repeat(2),
      )
      .join('');
  let k = palette.indexOf(hex);
  if (k < 0) k = palette.push(hex) - 1;
  return (k + 1) * 16 + Math.min(15, Math.round(p[3] * 15));
};
const basePaint = new Array<number>(N * N);
for (let j = 0; j < N; j++)
  for (let i = 0; i < N; i++) basePaint[j * N + i] = paintCode(baseIsland.paintAt(cx(i), cz(j)));

// Each movable POI's footprint: what it changes against the base, in a window around its site, in the site's own
// frame offset (cells relative to the site's cell), so the lab can paste it anywhere.
const R = 36; // cells each way (72 m)
const pois = sites.map((s) => {
  const keepOut = (s.keepOut ?? []).map((k) => ({ x: k.x ?? 0, z: k.z ?? 0, r: k.r }));
  const poi = {
    id: s.id,
    name: s.name ?? s.id,
    x: s.x,
    z: s.z,
    dir: s.dir ?? [0, 1],
    movable: !FIXED.has(s.id),
    keepOut,
  };
  if (FIXED.has(s.id)) return poi;
  const isl = createIsland([...fixedSites, s]);
  const h = levelled(isl);
  const si = Math.round((s.x + HALF) / STEP - 0.5),
    sj = Math.round((s.z + HALF) / STEP - 0.5);
  const dh: number[] = [],
    paint: number[] = [];
  for (let b = -R; b <= R; b++)
    for (let a = -R; a <= R; a++) {
      const i = si + a,
        j = sj + b;
      const inside = i >= 0 && j >= 0 && i < N && j < N;
      dh.push(inside ? Math.round(h(cx(i), cz(j)) * 10) - base[j * N + i] : 0);
      paint.push(inside ? paintCode(isl.paintAt(cx(i), cz(j))) : 0);
    }
  return { ...poi, patch: { i: si, j: sj, r: R, dh, paint } };
});

// The home palms the wood age's log bundles lie under: the server's land (src/world/home-land.json).
const land = JSON.parse(fs.readFileSync(path.join(root, 'src/world/home-land.json'), 'utf8'));
const atCell = (c: { i: number; j: number }) => ({
  x: +(c.i * CELL - HALF).toFixed(2),
  z: +(HALF - c.j * CELL).toFixed(2),
});

// Run speeds, read from the player's movement code so the lab follows it.
const physics = fs.readFileSync(path.join(root, 'src/physics/physics.ts'), 'utf8');
const sp = physics.match(/me\.sprint \? ([\d.]+) : ([\d.]+)\) \* \(me\.swimming \? ([\d.]+)/);
if (!sp) throw new Error('run speeds not found in src/physics/physics.ts');

const json = {
  version: 1,
  name: 'as-built',
  about: 'Boogle island export (dev/layout/export.ts). x east, z south (towards home), metres; heights in decimetres.',
  grid: { step: STEP, n: N, x0: -HALF, z0: -HALF, sea: SEA, seabed: SEABED },
  terrain: { base, paint: basePaint, palette },
  regions: { mainland: MAINLAND, massif: MASSIF },
  pois,
  fixed: {
    spawn: SPAWN,
    ball: BALL_SPAWN,
    court: COURT,
    stall: { x: 15.2, z: 13.4 }, // src/adapters/mushroom-garden.ts STALL
    garden: {
      x0: PATCH.i0 * CELL - HALF,
      x1: (PATCH.i0 + PATCH.w) * CELL - HALF,
      z0: HALF - (PATCH.j0 + PATCH.h) * CELL,
      z1: HALF - PATCH.j0 * CELL,
    },
  },
  route: ROUTE.map((r) => ({ age: r.age, x: r.x, z: r.z, to: [...r.to] })),
  ring: RING_R,
  trees: land.layout.trees.map(atCell),
  perches: land.layout.perches.map(atCell),
  speeds: { sprint: +sp[1], walk: +sp[2], swim: +sp[3] },
  view: { fogNear: FOG_NEAR, fogFar: FOG_FAR, eye: 1.6 }, // how far you can see (src/render/scene.ts fog)
  wagon: { cruise: WAGON_CRUISE, accel: WAGON_ACCEL, dwell: WAGON_DWELL, msPerTick: MS_PER_TICK },
};
// Sanity: the natural ground at spawn is land.
if (naturalHeight(SPAWN.x, SPAWN.z) <= 0) throw new Error('spawn is under water?');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(json));
console.log(
  `${path.relative(root, out)}  ${N}x${N} cells of ${STEP} m, ${pois.length} POIs, ${json.trees.length} palms, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`,
);
