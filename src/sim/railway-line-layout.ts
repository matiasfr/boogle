// Slice 3's staged numeric catalog. Not installed until recovery and client admission support it.
// The line builds on the numeric T1/source layout shared with current headless proofs.
import { RAILWAY_SOURCES, RAILWAY_SUPPLY, RAILWAY_T1 } from './railway-layout.ts';

export const LINE1_CATALOG = 2;
export const LOG = 0;
export const STONE = 1;
export type RailMaterial = typeof LOG | typeof STONE;
export type RailMaterials = [logs: number, stone: number];
export type LineStationId = 'T1' | 'T2' | 'T3';
export type LineStation = {
  id: LineStationId;
  bill: readonly [logs: number, stone: number];
  beam: 0 | 1;
  fromCm: number;
  toCm: number;
  x: number;
  z: number;
  panels: number;
  crate: boolean;
};
// IDs/frames are pinned from Place; no trig, prototype authority or runtime layout imports.
export const LINE1_STATIONS: readonly LineStation[] = [
  { id: 'T1', bill: [24, 0], beam: 0, fromCm: 19100, toCm: 15000, x: 99562, z: -14189, panels: 3, crate: true },
  { id: 'T2', bill: [32, 8], beam: 0, fromCm: 15000, toCm: 11600, x: 97997, z: -12553, panels: 3, crate: true },
  { id: 'T3', bill: [40, 0], beam: 1, fromCm: 11600, toCm: 3000, x: 97744, z: -8873, panels: 6, crate: false },
];
// Rocks have their own typed ID domain: rock 0 must never be treated as ordinary tree 0.
export const LINE1_ROCKS = [
  { id: 0, x: 100100, z: -10600, initial: 8 },
  { id: 1, x: 100800, z: -10100, initial: 8 },
  { id: 2, x: 100700, z: -11000, initial: 8 },
] as const;
export const LINE1_GREAT_TREE = { id: 28, x: 99600, z: -13800 } as const;
/** Where the loose beam may lie: the authored dry approaches at the great tree and T3, or anywhere on the ground of
 * line one's work area (the box around its stations, tree and rocks, 30 m out, at land heights), so a beam put down or
 * left by an absent carrier stays where its carrier stood (owner, 6 November: you keep your load, or it goes down where
 * you stood; you are never pulled back). One left out of reach still recovers to the tree after `age` 21. */
const BEAM_AREA = { x0: 94744, x1: 103800, z0: -17189, z1: -5777, y0: 1000, y1: 8000 } as const;
export const lineBeamGround = (x: number, y: number, z: number) => {
  if (x >= BEAM_AREA.x0 && x <= BEAM_AREA.x1 && z >= BEAM_AREA.z0 && z <= BEAM_AREA.z1)
    return y >= BEAM_AREA.y0 && y <= BEAM_AREA.y1;
  return [
    [LINE1_GREAT_TREE.x, 3000, LINE1_GREAT_TREE.z],
    [LINE1_STATIONS[2]!.x, 3037, LINE1_STATIONS[2]!.z],
  ].some(([ax, ay, az]) => {
    const dx = x - ax!,
      dz = z - az!;
    return dx * dx + dz * dz <= 90000 && Math.abs(y - ay!) <= 100;
  });
};
export const LINE1_AXE_STAND = { x: 98070, z: -8777 } as const;
export const LINE1_JUMP_DEVICE = { x: 95240, y: 2638, z: -7044 } as const;
export const LINE1_HARDWOOD_IDS = [209, 232] as const;
export const LINE1_HARDWOODS = [
  [209, 89882, -4677],
  [232, 92123, -4518],
] as const;
export const LINE1_ORDINARY_SOURCES = RAILWAY_SOURCES;
export const LINE1_INITIAL: readonly [logs: number, stone: number] = [RAILWAY_SUPPLY + 30, 24];
export const LINE1_PANEL_ALLOWANCE = RAILWAY_T1.starterRails;

export type LinePanel = { station: LineStationId; index: number; fromCm: number; toCm: number };
/** Same 3/3/6 partition as track-layer-machine. Integer centimetres close every stop exactly.
 * The 86/6 metre stock panel rounds interior contacts to the nearest centimetre;
 * short closing panels absorb that rounding, never gaps or a thirteenth stock unit.
 */
export function linePanels(): LinePanel[] {
  const panels: LinePanel[] = [];
  const span = (LINE1_STATIONS[2]!.fromCm - LINE1_STATIONS[2]!.toCm) / 6;
  for (const station of LINE1_STATIONS) {
    let from = station.fromCm;
    for (let i = 1; i <= station.panels; i++) {
      const to = i === station.panels ? station.toCm : Math.max(station.toCm, station.fromCm - Math.round(i * span));
      panels.push({ station: station.id, index: panels.length, fromCm: from, toCm: to });
      from = to;
    }
  }
  return panels;
}
