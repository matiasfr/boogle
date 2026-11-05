// Durable T1 supply maintenance. Host-stamped whole minutes; never reads presence or a wall clock.
import { RAILWAY_SOURCES, RAILWAY_SUPPLY, RAILWAY_T1 as T1 } from './railway-layout.ts';
import type { Railway } from './railway.ts';

export const RECOVERY_MINUTES = 21; // minute quantization still leaves at least twenty minutes
export const REGROW_MINUTES = 31;
export const RECOVERY_RACK = { x: 90500, z: 100 };
// Pinned centimetre bounds of the two initially laid stubs and T1's whole corridor, plus 8 m clearance.
// Clear the eventual corridor throughout construction too; never recreate an obstruction around finished track.
export const RAILWAY_TRACK_CLEARINGS = [
  [91000, 94574, -1859, 2000],
  [96400, 103164, -15744, -11403],
] as const;
export const railGrowthAllowed = (k: number) => {
  const source = RAILWAY_SOURCES[k];
  return (
    !!source &&
    !RAILWAY_TRACK_CLEARINGS.some(
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
export const railGrowthStage = (age: number) => Math.max(0, age - REGROW_MINUTES);
export type RailSupply = { marker: number; ages: number[]; rack: number; produced: number };
export type RailSupplyJSON = Omit<RailSupply, 'ages'> & { ages: string };
export type SupplyPulse = { marker: number; grow: string; recover: number[] };
export type SupplyIntervals = { regrow: number; recover: number };
const DEFAULT_INTERVALS: SupplyIntervals = { regrow: REGROW_MINUTES, recover: RECOVERY_MINUTES };
/** Keep the saved 31/21 progress units and stage codes unchanged. The global minute phase supplies a
 * deterministic fractional remainder without more per-source state. Tuning preserves earned progress;
 * its current interval applies to the next accepted pulse. Bounds are enforced by the existing tune API.
 * Clamp elapsed time before multiplying, so even a maximum safe-integer marker cannot overflow.
 */
const progressUnits = (marker: number, minutes: number, interval: number, units: number) => {
  const phase = marker % interval;
  return (
    Math.floor(((phase + Math.min(minutes, interval)) * units) / interval) - Math.floor((phase * units) / interval)
  );
};
export const createRailSupply = (): RailSupply => ({
  marker: 0,
  ages: RAILWAY_SOURCES.map(() => 0),
  rack: 0,
  produced: 0,
});
export const saveRailSupply = (s: RailSupply): RailSupplyJSON => ({
  ...s,
  ages: s.ages.map((age) => age.toString(36)).join(''),
});
export function loadRailSupply(value: unknown): RailSupply {
  const s = value as RailSupplyJSON | null;
  const integer = (n: unknown, max: number) =>
    Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) <= max && !Object.is(n, -0);
  if (
    !s ||
    Object.keys(s).sort().join() !== 'ages,marker,produced,rack' ||
    !integer(s.marker, Number.MAX_SAFE_INTEGER) ||
    !integer(s.rack, 2147483647) ||
    !integer(s.produced, 2147483647 - RAILWAY_SUPPLY) ||
    s.produced % T1.sourceYield !== 0 ||
    typeof s.ages !== 'string' ||
    s.ages.length !== RAILWAY_SOURCES.length ||
    !/^[0-9a-z]+$/.test(s.ages)
  )
    throw new Error('railway: supply');
  return { ...s, ages: [...s.ages].map((age) => Number.parseInt(age, 36)) };
}
/** Idempotent accepted event. Nearby/unknown players are excluded by the host before it stamps recover ids. */
export function railSupplyPulse(s: Railway, e: SupplyPulse, intervals = DEFAULT_INTERVALS) {
  const supply = s.supply;
  if (!supply || e.marker < supply.marker) return 0;
  const minutes = supply.marker ? Math.min(1440, e.marker - supply.marker) : 0;
  const regrow = progressUnits(supply.marker, minutes, intervals.regrow, REGROW_MINUTES);
  const recover = progressUnits(supply.marker, minutes, intervals.recover, RECOVERY_MINUTES);
  supply.marker = e.marker;
  let moved = 0;
  for (const pile of s.piles) {
    pile.age = Math.min(RECOVERY_MINUTES, (pile.age ?? 0) + recover);
    if (pile.age === RECOVERY_MINUTES && e.recover.includes(pile.id)) {
      supply.rack += pile.n;
      moved += pile.n;
      pile.n = 0;
    }
  }
  s.piles = s.piles.filter((pile) => pile.n > 0);
  for (let k = 0; k < s.sources.length; k++) {
    if (s.sources[k] !== 0) continue;
    const age = supply.ages[k]!;
    if (age < REGROW_MINUTES) supply.ages[k] = Math.min(REGROW_MINUTES, age + regrow);
    // Each visible stage takes a separate accepted minute, even after a long offline gap.
    if (
      age < REGROW_MINUTES ||
      !minutes ||
      !railGrows(e.grow, k) ||
      !railGrowthAllowed(k) ||
      supply.produced > 2147483647 - RAILWAY_SUPPLY - T1.sourceYield
    )
      continue;
    supply.ages[k] = age + 1;
    if (supply.ages[k] !== 35) continue;
    s.sources[k] = T1.sourceYield;
    s.work[k] = 0;
    s.falls!.yaw[k] = 0;
    s.falls!.collapsed[k] = false;
    supply.produced += T1.sourceYield;
  }
  return moved;
}
