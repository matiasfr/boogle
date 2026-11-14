// The reusable rotunda's dimensions and frames. Local static geometry in site-local metres; no renderer or rules.
import type { XZ } from './home-station.ts';

export type RotundaKit = {
  rim: number;
  doorR: number;
  depth: number;
  bayDeg: number;
  door: { clear: number; high: number };
  pit: number;
};
export const ROTUNDA_KIT: RotundaKit = {
  rim: 0.6,
  doorR: 14,
  depth: 11,
  bayDeg: 20,
  door: { clear: 3.6, high: 4.6 },
  pit: 0.9,
};
/** Bearings clockwise from north (-z); order contains signed bay offsets from mid, in build order.
 * Stages are site-owned counts, not shared progression triggers. */
export type RotundaSite = {
  id: string;
  centre: XZ;
  y: number;
  tableR: number;
  approach: number;
  mid: number;
  order: readonly number[];
  stages: readonly number[];
};
const rad = (deg: number) => (deg * Math.PI) / 180;
const at = (site: RotundaSite, bearing: number, r: number): XZ => ({
  x: site.centre.x + Math.sin(rad(bearing)) * r,
  z: site.centre.z - Math.cos(rad(bearing)) * r,
});

/** Bay is a signed offset, not an index in build order. Corners: inner left/right, outer right/left. */
export function bayFrame(site: RotundaSite, bay: number) {
  const bearing = site.mid + bay * ROTUNDA_KIT.bayDeg;
  const u = { x: Math.sin(rad(bearing)), z: -Math.cos(rad(bearing)) };
  const { doorR, depth, bayDeg } = ROTUNDA_KIT;
  const corners: [XZ, XZ, XZ, XZ] = [
    at(site, bearing - bayDeg / 2, doorR),
    at(site, bearing + bayDeg / 2, doorR),
    at(site, bearing + bayDeg / 2, doorR + depth),
    at(site, bearing - bayDeg / 2, doorR + depth),
  ];
  return {
    bearing,
    u,
    yaw: Math.atan2(u.x, u.z),
    rim: at(site, bearing, site.tableR),
    door: at(site, bearing, doorR),
    back: at(site, bearing, doorR + depth),
    centre: at(site, bearing, doorR + depth / 2),
    corners,
  };
}

export function rotundaBays(site: RotundaSite, stage: number): number[] {
  return site.order.slice(0, site.stages[stage] ?? 0);
}

/** Steel waits on the open apron, 80° off the approach road, between the camera and garage post at Home.
 * A metre of walking space outside the kerb,
 * measured to the pallet's bounding circle, follows the site's table size rather than the old disc offsets. */
export function rotundaSteelPallet(site: RotundaSite) {
  const w = 1.5,
    d = 2.1;
  return { ...at(site, site.approach + 80, site.tableR + ROTUNDA_KIT.rim + Math.hypot(w, d) / 2 + 1), w, d };
}

/** A closed keep-clear outline: pit including kerb, bay arc and the apron joining them. Includes gaps in an arc.
 * The pit is circumscribed at <=5-degree intervals, so clearance checks never understate its circular edge.
 * Bay count selects the first entries in build order, independently of the site's stage ladder. */
export function rotundaFootprint(site: RotundaSite, bays: number): XZ[] {
  const offsets = site.order.slice(0, bays);
  const half = ROTUNDA_KIT.bayDeg / 2;
  const lo = offsets.length ? site.mid + Math.min(...offsets) * ROTUNDA_KIT.bayDeg - half : 0;
  const hi = offsets.length ? site.mid + Math.max(...offsets) * ROTUNDA_KIT.bayDeg + half : 0;
  const out: XZ[] = [];
  if (offsets.length) {
    for (let bearing = lo; bearing <= hi; bearing += ROTUNDA_KIT.bayDeg)
      out.push(at(site, bearing, ROTUNDA_KIT.doorR + ROTUNDA_KIT.depth));
  }
  if (hi - lo >= 360) {
    out.push(out[0]!);
    return out;
  }
  const steps = Math.ceil((360 - (hi - lo)) / 5);
  const step = (360 - (hi - lo)) / steps;
  const r = (site.tableR + ROTUNDA_KIT.rim) / Math.cos(rad(step / 2));
  for (let i = 0; i <= steps; i++) out.push(at(site, hi + i * step, r));
  out.push(out[0]!);
  return out;
}
