// A level as the checks read it: the same data the game composes (POI sites, the route, scattered props), for today's
// island or with a dev/layouts/*.json applied, on the same ground the game builds, with no scene or renderer.
import fs from 'node:fs';
import path from 'node:path';
import { BALL_SPAWN, CELL, COURT, GRID_RES, HALF, SEABED, SPAWN } from '../../src/constants.ts';
import { isHomePalm, scatterProps, type PropPlacement } from '../../src/blueprints/props.ts';
import { islandBaseCm } from '../../src/island/ground.ts';
import { clearedIn, moveSite, type LayoutFile } from '../../src/island/layout.ts';
import { createIsland, siteFrame, type Site } from '../../src/island/stamps.ts';
import { ROUTE, TRACK, HELPER, ringAt } from '../../src/sim/route.ts';

export const root = path.join(import.meta.dirname, '../..');
const STALL = { x: 15.2, z: 13.4 }; // src/adapters/mushrooms.ts, which draws: not loadable here

export type Target = { name: string; x: number; z: number; file: string };
export type Disc = { name: string; owner: string; x: number; z: number; r: number; file: string };
export type Section = { x: number; z: number; to: number[] };
type IdSite = Site & { id: string };

export type Level = {
  name: string; // "today", or the layout's file name
  layoutFile: string | null;
  sites: IdSite[];
  route: Section[];
  routeFile: string;
  labSections: number; // sections in the layout file past what the game builds: not checked
  /** Metres at i * GRID_RES + j: x = i * CELL - HALF, z = HALF - j * CELL. */
  h: Float64Array;
  groundAt: (x: number, z: number) => number;
  placements: PropPlacement[]; // what stands: a layout's `clear` is already applied
  targets: Target[]; // what a player is meant to reach
  discs: Disc[]; // the ground things have claimed
  spawnNode: number;
};

const poiDir = path.join(root, 'src/pois');
const ids = fs
  .readdirSync(poiDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(poiDir, d.name, 'site.ts')))
  .map((d) => d.name)
  .sort();
const baseSites: IdSite[] = [];
for (const id of ids) baseSites.push({ id, ...(await import(path.join(poiDir, id, 'site.ts'))).default });
export const siteFile = (id: string) => `src/pois/${id}/site.ts`;

export const nodeOf = (x: number, z: number) => {
  const i = Math.min(GRID_RES - 1, Math.max(0, Math.round((x + HALF) / CELL))),
    j = Math.min(GRID_RES - 1, Math.max(0, Math.round((HALF - z) / CELL)));
  return i * GRID_RES + j;
};
export const nodeX = (k: number) => Math.floor(k / GRID_RES) * CELL - HALF;
export const nodeZ = (k: number) => HALF - (k % GRID_RES) * CELL;

export function loadLevel(layoutFile: string | null): Level {
  const layout: LayoutFile | null = layoutFile
    ? JSON.parse(fs.readFileSync(path.resolve(root, layoutFile), 'utf8'))
    : null;
  const sites = baseSites.map((s) => {
    const copy = { ...s };
    moveSite(layout, s.id, copy);
    return copy;
  });
  const island = createIsland(sites);
  const cm = islandBaseCm(island);
  const h = new Float64Array(cm.length);
  for (let k = 0; k < cm.length; k++) h[k] = cm[k]! / 100;
  // src/island/heights.ts's groundHeight, on this level's heights.
  const groundAt = (x: number, z: number) => {
    const fi = (x + HALF) / CELL,
      fj = (HALF - z) / CELL;
    if (fi < 0 || fj < 0 || fi >= GRID_RES - 1 || fj >= GRID_RES - 1) return SEABED;
    const i = Math.floor(fi),
      j = Math.floor(fj),
      u = fi - i,
      v = fj - j;
    const near = h[i * GRID_RES + j]! + (h[(i + 1) * GRID_RES + j]! - h[i * GRID_RES + j]!) * u;
    const far = h[i * GRID_RES + j + 1]! + (h[(i + 1) * GRID_RES + j + 1]! - h[i * GRID_RES + j + 1]!) * u;
    return near + (far - near) * v;
  };

  // As src/island/layout.ts applies it: the game builds ROUTE.length sections, and later ones in a file are for the lab.
  const ok = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const fileRoute = layout?.route ?? [];
  const route: Section[] = ROUTE.map((def, s) => {
    const r = fileRoute[s];
    return r && ok(r.x) && ok(r.z) && ok(r.to?.[0]) && ok(r.to?.[1]) ? r : def;
  });
  const labSections = Math.max(0, fileRoute.length - ROUTE.length);
  const routeFile = layoutFile ?? 'src/sim/route.ts';
  const placements = scatterProps({ groundHeight: groundAt, keptOut: island.keptOut }).filter(
    (p) => isHomePalm(p) || !clearedIn(layout, route, p.x, p.z),
  );

  const targets: Target[] = [
    { name: 'spawn', ...SPAWN, file: 'src/constants.ts' },
    { name: 'the ball', ...BALL_SPAWN, file: 'src/constants.ts' },
    { name: 'the court', x: COURT.x, z: COURT.z, file: 'src/world/grid.ts' },
    { name: 'the stall', ...STALL, file: 'src/adapters/mushrooms.ts' },
  ];
  const discs: Disc[] = [
    { name: 'the court', owner: 'court', x: COURT.x, z: COURT.z, r: COURT.r, file: 'src/world/grid.ts' },
    { name: 'the stall', owner: 'stall', ...STALL, r: 1.5, file: 'src/adapters/mushrooms.ts' },
  ];
  for (const s of sites) {
    const frame = siteFrame(s);
    const file = layout?.pois?.some((p) => p.id === s.id) ? layoutFile! : siteFile(s.id);
    for (const r of s.reach ?? []) {
      const [x, z] = frame.toWorld(r.x ?? 0, r.z ?? 0);
      targets.push({ name: `${s.name}: ${r.name}`, x, z, file });
    }
    for (const k of s.keepOut ?? []) {
      const [x, z] = frame.toWorld(k.x ?? 0, k.z ?? 0);
      discs.push({ name: s.name ?? s.id, owner: s.id, x, z, r: k.r, file });
    }
  }
  route.forEach((sec, s) => {
    targets.push({ name: `track section ${s + 1}, its start`, x: sec.x, z: sec.z, file: routeFile });
    targets.push({ name: `track section ${s + 1}, its end`, x: sec.to[0]!, z: sec.to[1]!, file: routeFile });
    for (const [ring, what] of [
      [TRACK, 'track'],
      [HELPER, 'helper'],
    ] as const) {
      const x = sec.x + ringAt(0, ring).x - ROUTE[0]!.x;
      targets.push({ name: `work site ${s + 1}, its ${what} ring`, x, z: sec.z, file: routeFile });
    }
  });

  return {
    name: layoutFile ? path.basename(layoutFile, '.json') : 'today',
    layoutFile,
    sites,
    route,
    routeFile,
    labSections,
    h,
    groundAt,
    placements,
    targets,
    discs,
    spawnNode: nodeOf(SPAWN.x, SPAWN.z),
  };
}
