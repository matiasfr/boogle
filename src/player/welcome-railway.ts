// What the welcome back (src/features/welcome-back.ts) remembers of the railway and compares on return, from rows and
// queries through the adapter's read facade (docs/plans/ecs-migration-railway.md, M10). Pure over a world: the card's
// "stretches of track laid" counts the stations laid on both lines (T1 to T3, then Q1 on), each one a stretch.
import type { RailwayAdapter } from '../adapters/railway-session.ts';
import { aperture, forge, steel, works, jobs, type ReadWorld } from '../sim/railway-rows.ts';
import { line2Completed } from '../sim/railway-queries-line2.ts';

/** Stretches of track laid in `w`: line one's stations laid, and line two's. */
export const stretchesLaid = (w: ReadWorld) => jobs(w).filter((j) => j.completion).length + line2Completed(w);

/** Stretches laid since the remembered count `then` (0 for no change, a malformed memory or fewer than then). */
export const stretchesSince = (then: unknown, now: number) =>
  typeof then === 'number' && Number.isFinite(then) ? Math.max(0, now - then) : 0;

/** The railway's world once its whole state is in, or null (not mounted, connecting, or its storage failed). */
export const railwayKnown = (facade: RailwayAdapter['read'] | null): ReadWorld | null =>
  facade && facade.status() === 'ready' ? facade.world() : null;

import { Plot } from '../sim/railway-components.ts';
import { legsLaid, routeRow } from '../sim/railway-queries-route.ts';
import { RAIL_LEGS } from '../sim/railway-route.ts';
import { WORLD_LINES } from '../sim/railway-world-lines.ts';

const choices = [
  '',
  'Seed Shed',
  'Horn Pavilion',
  'Frisbee Boathouse',
  'Caddy Shed',
  'Dunk Bakery',
  'Lookout Tower',
  'Signal Bellhouse',
  'Echo Horn House',
  'Canyon Hook-Perch',
  'Canopy Bounce Net',
  'Treetop Wind Chime',
];

export function railwaySnapshot(w: ReadWorld) {
  const first = jobs(w).filter((j) => j.completion).length;
  const second = line2Completed(w);
  const lines = first + second;
  const legs = legsLaid(w);
  const places: string[] = [];
  if (forge(w).lit >= 0) places.push('The forge');
  if (first === 3) places.push('Village');
  if (second >= 5) places.push('Far Head');
  if (works(w).lit >= 0) places.push('The kiln');
  if (second >= 6) places.push('Pier');
  if (second >= 7) places.push('Railhead');
  if (aperture(w).joined >= 0) places.push('Ring Island');
  if (steel(w).lit >= 0) places.push("Ring Island's steel works");
  RAIL_LEGS.forEach((spec, k) => {
    if (legs[k]! < spec.sections.length) return;
    const halt = WORLD_LINES.find((line) => line.id === spec.row)?.halts[spec.destRowHalt];
    if (halt) places.push(halt.name);
  });
  if (routeRow(w).arrived >= 0) places.push('Original Island');
  const plots: Record<string, string> = {};
  w.each([Plot], (_id, p) => {
    if (p.at >= 0) plots[p.slot] = choices[p.kind] || `Plot ${(p.slot % 16) + 1}`;
  });
  return { lines, legs, places, plots };
}

const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Numeric memories predate route sections, landmarks and plots. Establish those baselines silently. */
export function railwayDiff(now: ReturnType<typeof railwaySnapshot>, previous: unknown) {
  const old = record(previous);
  const sections = stretchesSince(typeof previous === 'number' ? previous : old.lines, now.lines);
  const legs = old.legs;
  const places = old.places;
  return {
    sections:
      sections + (Array.isArray(legs) ? now.legs.reduce((n, laid, k) => n + stretchesSince(legs[k], laid), 0) : 0),
    places: Array.isArray(places) ? now.places.filter((p) => !places.includes(p)) : [],
    built:
      old.plots && typeof old.plots === 'object'
        ? Object.entries(now.plots)
            .filter(([slot]) => !Object.hasOwn(record(old.plots), slot))
            .map(([, name]) => name)
        : [],
  };
}
