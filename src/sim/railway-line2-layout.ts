// Line two's pinned numeric catalog: the forge, Q1-Q3 and the quarry's lever and hook device.
// Coordinates are world centimetres pinned from Place's layout/tech-layout (6 November 2026);
// no runtime prototype imports or native trig in lockstep. Q4 onward is not promoted yet.
import { pairsOf, type LineStation } from './railway-line-layout.ts';

export const RAILS = 2;
/** The forge takes 24 logs for its frame, then 32 for walls and chimney; then it is lit and pours rails. */
export const LINE2_FORGE = {
  bills: [24, 32] as const,
  logs: 56,
  x: 91200,
  z: -1200,
  rackX: 91450,
  rackZ: 540,
  rackMax: 24,
  pourTicks: 5,
  turnTicks: 26,
} as const;
export type Line2StationId = 'Q1' | 'Q2' | 'Q3';
/** `bill[1]` is rails. Panels are the station's rails, evenly spaced; `speed` scales the room's laying speed. */
export type Line2Station = Omit<LineStation, 'id'> & { id: Line2StationId; speed: number; depot: boolean };
export const LINE2_STATIONS: readonly Line2Station[] = [
  {
    id: 'Q1',
    bill: [16, 6],
    beam: 0,
    fromCm: 700,
    toCm: 4200,
    x: 92719,
    z: 1059,
    panels: 6,
    crate: false,
    speed: 100,
    depot: false,
  },
  {
    id: 'Q2',
    bill: [24, 12],
    beam: 0,
    fromCm: 4200,
    toCm: 12200,
    x: 94948,
    z: 3056,
    panels: 12,
    crate: true,
    speed: 120,
    depot: true,
  },
  {
    id: 'Q3',
    bill: [16, 12],
    beam: 0,
    fromCm: 12200,
    toCm: 17800,
    x: 102803,
    z: 2676,
    panels: 12,
    crate: true,
    speed: 120,
    depot: true,
  },
];
/** The depot's cart brings logs from the camp to a rack by the frame: one load every `everyTicks`, never past the bill. */
export const LINE2_DEPOT = { load: 8, everyTicks: 120, reach: 700 } as const;
/** The lever on the quarry apron (2.2 m up), and the hook device on pillar p2's top. */
export const LINE2_LEVER = { x: 109740, z: 4220, y: 2620 } as const;
export const LINE2_HOOK = { x: 99954, z: 2086, y: 2350 } as const;
/** Readiness from accepted completions only: Q2 builds the hook walkway, Q3 the quarry ramp and winch drive. */
export const line2Routes = (completed: number) => ({ hook: completed >= 2, quarry: completed >= 3 });
/** Integer-centimetre rail-pair boundaries for a line-two stretch: each stock rail lays as its rail pairs. */
export function line2Panels(station: Line2Station) {
  const span = station.toCm - station.fromCm;
  return Array.from({ length: station.panels }, (_, i) =>
    pairsOf(
      station.fromCm + Math.round((i * span) / station.panels),
      i === station.panels - 1 ? station.toCm : station.fromCm + Math.round(((i + 1) * span) / station.panels),
    ),
  )
    .flat()
    .map((pair, index) => ({ station: station.id, index, ...pair }));
}
