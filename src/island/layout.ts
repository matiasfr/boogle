// `?layout=<name>`: walk a layout option from the layout lab (docs/proposals/island-layout.md) in greybox. Loads
// dev/layouts/<name>.json (the lab's "Copy layout" shape, dev/layout/export.ts) in its own chunk and moves the POI
// sites and the railway's positions to it. Without the flag nothing loads and nothing moves.
//
// How it stays safe with lockstep:
// 1. POI sites are read once, before the terrain is built (./index.ts applies `layout.pois` to them).
// 2. ROUTE positions are moved in place here. The rules read only a section's age and how many there are, never where
//    it is, so hashes and saves don't change; the drawn wagon (src/sim/wagon.ts) builds its line on first use, after this.
// 3. The land the rules run on (palm cells, the frisbee perch) is pinned to src/world/home-land.json, as the server
//    has it (src/features/walk-layout.ts), so a moved POI can't move a log source or a perch.
// 4. Spawn, court and seed stand never move (HOME_KEEP, src/island/README.md). Only the first ROUTE.length sections apply;
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
  /** Scenery left out so a long line runs clear (the placing and the palm cells don't change): metres each side of the
   * route, and discs for what stands beside it. */
  clear?: { line?: number; discs?: { x: number; z: number; r: number }[] };
};

export type Section = { x: number; z: number; to: number[] };

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
/** The sections a layout file gives: the first `base.length`, each if it's whole, and `base`'s own otherwise. */
export function routeIn(file: LayoutFile | null, base: readonly Section[]): Section[] {
  return base.map((def, s) => {
    const r = file?.route?.[s];
    return r && ok(r.x) && ok(r.z) && ok(r.to?.[0]) && ok(r.to?.[1]) ? r : def;
  });
}
routeIn(layout, ROUTE).forEach((r, s) => {
  if (r !== ROUTE[s]) Object.assign(ROUTE[s]!, { x: r.x, z: r.z, to: [r.to[0], r.to[1]] });
});

/** Moves a POI's site (its default export, in place, so its content module sees it too) to the layout's place. */
export function placeSite(id: string, site: { x: number; z: number; dir?: [number, number] }): void {
  moveSite(layout, id, site);
}
/** placeSite for any layout file: `npm run level-check` composes each one. */
export function moveSite(
  file: LayoutFile | null,
  id: string,
  site: { x: number; z: number; dir?: [number, number] },
): void {
  const p = file?.pois?.find((q) => q.id === id);
  if (!p || !ok(p.x) || !ok(p.z) || id === 'caves') return; // the caves' stamps are in world coordinates
  site.x = p.x;
  site.z = p.z;
  if (p.dir && ok(p.dir[0]) && ok(p.dir[1])) site.dir = [p.dir[0], p.dir[1]];
}

/** True where `clear` leaves the scenery out. Only trees and rocks ask (src/entities/props/state.ts, src/render/props.ts); without it, never. */
export const clearedAt = (x: number, z: number): boolean => clearedIn(layout, ROUTE, x, z);
/** clearedAt for any layout file and its route. */
export function clearedIn(file: LayoutFile | null, route: Section[], x: number, z: number): boolean {
  const c = file?.clear;
  if (!c) return false;
  if (c.discs?.some((d) => (x - d.x) ** 2 + (z - d.z) ** 2 < d.r * d.r)) return true;
  if (!c.line) return false;
  return route.some((r) => {
    const dx = r.to[0]! - r.x,
      dz = r.to[1]! - r.z;
    const u = Math.max(0, Math.min(1, ((x - r.x) * dx + (z - r.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - r.x - u * dx, z - r.z - u * dz) < c.line!;
  });
}
