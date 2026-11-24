// The reusable rotunda's dimensions and frames. Local static geometry in site-local metres; no renderer or rules.
import type { XZ } from './home-station.ts';
import { LINE2 } from '../sim/railway-lines.ts';
import { ROW_LINE } from '../sim/railway-route.ts';

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

/** Garage step 4 (docs/plans/garage-step4.md, "The bays"): each line's works copy waits in its own bay while another
 * line's stands on the table, door open, the line's colour on a plate (placeholder colours): line 2 at 170°, the
 * north–south line at 210°, the bay line at 230° (signed bay offsets; `line` is the sim's line index). */
export const COPY_BAYS: readonly { line: number; bay: number; colour: `#${string}` }[] = [
  { line: LINE2, bay: -1, colour: '#c79a3e' },
  { line: ROW_LINE.ns, bay: 1, colour: '#3f7fbf' },
  { line: ROW_LINE.bay, bay: 2, colour: '#2f9e8f' },
];
/** The copy's engine centre and its Strong flatbed's, metres out from the table along the bay (the flatbed couples
 * 0.6 m behind, as a train's first car does; its end stays clear of the back wall's 24.3 m face). */
export const COPY_AT = { engine: 17.9, flatbed: 22.1 } as const;
/** What stands in the bays: the waiting engines, in departure order (signed bay offsets: 250°, 150°, then 170°, 210°,
 * 230°), and the works copies. The first engine already belongs to the line. Building a bay never adds or removes an
 * engine: these stand in the ruins too. Use the actual serving count, not the route's target fleet, so a delayed join
 * still waits. `copies` are the lines whose copy is off the table (garage step 4); a copy takes its bay only when no
 * waiting engine is in it. The working bay and the store are owned separately; Port Quay has no waiting fleet yet. */
export function bayOccupants(
  site: RotundaSite,
  facts: { serving: number; copies?: readonly number[] },
): { waiting: number[]; copies: (typeof COPY_BAYS)[number][] } {
  if (site.id !== 'home') return { waiting: [], copies: [] };
  const waiting = [3, -2, -1, 1, 2].slice(Math.max(0, facts.serving - 1)).filter((bay) => site.order.includes(bay));
  const copies = COPY_BAYS.filter((c) => facts.copies?.includes(c.line) && !waiting.includes(c.bay));
  return { waiting, copies };
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

// ---------------------------------------------------------------- the blockout (docs/plans/roundhouse-rotunda.md, 1b)
/** The blockout's own sizes, beside the kit's: the door wall and back wall heights, the roof slab, a pier's depth
 * (the door reveal), the kerb's rise, and the ring painted on the table for the smaller diameter the owner compares. */
export const ROTUNDA_BLOCK = { wall: 6.2, back: 4.8, roof: 0.3, reveal: 0.8, kerb: 0.15, compareR: 7 } as const;
export type RotundaPart = 'table' | 'shell' | 'ruin' | 'door' | 'wall' | 'outline';
/** One piece of a site's blockout: `turn` is where it stands round the table in bays from `mid` (a bay's own offset;
 * an end wall stands on the edge between two, at a half). */
export type RotundaPiece = { id: string; part: RotundaPart; turn: number };
/** How many bays past the site's last the blockout paints on the ground each side, to show what a wider arc takes. */
export const ROTUNDA_PREVIEW = 1;
/** Every piece a site's blockout can show, in a fixed order: the table; then for each bay its shell, its ruin (door
 * piers at broken heights) and its closed door; a wall for each edge of the arc; and painted outlines past its ends.
 * The first bay in build order is the working one: the view owns its ruin and its door (the cracked slab, the
 * sockets), so it has neither here. */
export function rotundaPieces(site: RotundaSite): RotundaPiece[] {
  const name = (turn: number) => String(site.mid + turn * ROTUNDA_KIT.bayDeg);
  const bays = [...site.order].sort((a, b) => a - b),
    lo = bays[0]!,
    hi = bays.at(-1)!;
  const out: RotundaPiece[] = [{ id: 'table', part: 'table', turn: 0 }];
  for (const bay of bays) {
    out.push({ id: `bay-${name(bay)}`, part: 'shell', turn: bay });
    if (bay === site.order[0]) continue;
    out.push({ id: `ruin-${name(bay)}`, part: 'ruin', turn: bay });
    out.push({ id: `door-${name(bay)}`, part: 'door', turn: bay });
  }
  for (let edge = lo - 0.5; edge <= hi + 0.5; edge++) out.push({ id: `wall-${name(edge)}`, part: 'wall', turn: edge });
  for (let k = 1; k <= ROTUNDA_PREVIEW; k++)
    for (const bay of [lo - k, hi + k]) out.push({ id: `outline-${name(bay)}`, part: 'outline', turn: bay });
  return out;
}
/** Whether a piece stands at a stage. Built bays are the stage's; a built bay other than the working one keeps its
 * door shut (nothing stands in it); an unbuilt bay stands as a ruin while it is within the arc promised next, which
 * at arrival is already the second stage's (design review, finding 1: five standing ruins at arrival); an end wall
 * stands where a built bay meets an unbuilt one. */
export function rotundaShows(site: RotundaSite, stage: number, piece: RotundaPiece): boolean {
  const built = new Set(rotundaBays(site, stage));
  const promised = new Set(site.order.slice(0, site.stages[Math.max(stage + 1, 2)] ?? site.order.length));
  switch (piece.part) {
    case 'table':
    case 'outline':
      return true;
    case 'shell':
    case 'door':
      return built.has(piece.turn);
    case 'ruin':
      return !built.has(piece.turn) && promised.has(piece.turn);
    case 'wall':
      return built.has(piece.turn - 0.5) !== built.has(piece.turn + 0.5);
  }
}
/** Where a piece stands: the site's centre on its ground, turned so the piece's own +z runs out along its bearing. */
export function rotundaPose(site: RotundaSite, turn: number): { x: number; y: number; z: number; yaw: number } {
  return { x: site.centre.x, y: site.y, z: site.centre.z, yaw: bayFrame(site, turn).yaw };
}
