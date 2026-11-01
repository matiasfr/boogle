// `?layout=<name>`: walk a layout option from the layout lab (docs/proposals/island-layout.md) in greybox. Loads
// dev/layouts/<name>.json (the lab's "Copy layout" shape, dev/layout/export.ts) in its own chunk and moves the POI
// sites and the railway's positions to it. Without the flag nothing loads and nothing moves.
//
// How it stays safe with lockstep:
// 1. POI sites are read once, before the terrain is built (./index.ts applies `layout.pois` to them).
// 2. ROUTE positions are moved in place here. The rules read only a section's age and how many there are, never where
//    it is (the wagon's steam clock reads HOME_ROUTE, the shipped positions), so hashes and saves don't change; the
//    drawn wagon (src/sim/wagon.ts) builds its line on first use, after this.
// 3. The land the rules run on (palm cells, the frisbee perch) is pinned to src/world/home-land.json, as the server
//    has it (src/features/walk-layout.ts), so a moved POI can't move a log source or a perch.
// 4. Spawn, court and garden never move (HOME_KEEP, src/island/README.md). Only the first ROUTE.length sections apply;
//    later ones in the file are for the lab.
// Best in its own room (`?room=proto-layout&layout=coast-line`), so the real island's save never sees it.
// Serves DESIGN.md 7 (telegraph everything): try where things sit, and what you can see from where, by walking it.
import { ROUTE } from '../sim/route.ts';

/** A layout file: the export's shape without the terrain. */
export type LayoutFile = {
  version: number;
  name: string;
  pois?: { id: string; x: number; z: number; dir?: [number, number] }[];
  route?: { age: number; x: number; z: number; to: [number, number] }[];
};

const files = import.meta.glob<LayoutFile>('../../dev/layouts/*.json', { import: 'default' });
const wanted = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('layout');

async function load(name: string): Promise<LayoutFile | null> {
  const key = `../../dev/layouts/${name}.json`;
  if (!files[key]) {
    console.warn(`?layout=${name}: no dev/layouts/${name}.json (have: ${Object.keys(files).join(', ')})`);
    return null;
  }
  return files[key]();
}

export const layout: LayoutFile | null = wanted ? await load(wanted) : null;

const ok = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
if (layout?.route)
  layout.route.slice(0, ROUTE.length).forEach((r, s) => {
    if (!ok(r.x) || !ok(r.z) || !ok(r.to?.[0]) || !ok(r.to?.[1])) return;
    Object.assign(ROUTE[s], { x: r.x, z: r.z, to: [r.to[0], r.to[1]] });
  });

/** Moves a POI's site (its default export, in place, so its content module sees it too) to the layout's place. */
export function placeSite(id: string, site: { x: number; z: number; dir?: [number, number] }): void {
  const p = layout?.pois?.find((q) => q.id === id);
  if (!p || !ok(p.x) || !ok(p.z) || id === 'caves') return; // the caves' stamps are in world coordinates
  site.x = p.x;
  site.z = p.z;
  if (p.dir && ok(p.dir[0]) && ok(p.dir[1])) site.dir = [p.dir[0], p.dir[1]];
}
