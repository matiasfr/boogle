// Supply maintenance's constants and growth masks; the pulse itself is the rail.supply system
// (./railway-sys-away.ts). Host-stamped whole minutes; never reads presence or a wall clock.
import { RAILWAY_SOURCES } from './railway-layout.ts';

/** A felled tree's wait to regrow, in minutes: past it its age counts the visible growth stages (to 35). */
export const REGROW_MINUTES = 31;
export const RECOVERY_MINUTES = 21; // minute quantization still leaves at least twenty minutes
export const RECOVERY_RACK = { x: 90500, z: 100 };
// Pinned centimetre bounds of the two initially laid stubs and T1's whole corridor, plus 8 m clearance.
// Clear the eventual corridor throughout construction too; never recreate an obstruction around finished track.
export const RAILWAY_TRACK_CLEARINGS = [
  [91000, 94574, -1859, 2000],
  [96400, 103164, -15744, -11403],
] as const;
export const railGrowthAllowed = (k: number, line1 = false) => {
  const source = RAILWAY_SOURCES[k];
  return (
    !!source &&
    !(line1 ? [...RAILWAY_TRACK_CLEARINGS, [93000, 99500, -13400, 0]] : RAILWAY_TRACK_CLEARINGS).some(
      ([x0, x1, z0, z1]) => source[1] >= x0 && source[1] <= x1 && source[2] >= z0 && source[2] <= z1,
    )
  );
};
export const RAIL_GROW_MASK_LENGTH = Math.ceil(RAILWAY_SOURCES.length / 4);
/** Fixed catalog-index mask keeps one whole minute's eligible growth inside the bounded durable tail. */
export function railGrowthMask(indices: number[]) {
  const mask = Array.from({ length: RAIL_GROW_MASK_LENGTH }, () => 0);
  for (const k of indices)
    if (Number.isInteger(k) && k >= 0 && k < RAILWAY_SOURCES.length) mask[Math.floor(k / 4)]! |= 1 << (k % 4);
  return mask.map((n) => n.toString(16)).join('');
}
export const railGrows = (mask: string, k: number) =>
  (Number.parseInt(mask[Math.floor(k / 4)]!, 16) & (1 << (k % 4))) !== 0;

export type RailSupply = { marker: number; ages: number[]; rack: number; produced: number };
export type SupplyPulse = { marker: number; grow: string; recover: number[]; beam?: number; boiler?: number };
export type SupplyIntervals = { regrow: number; recover: number };
