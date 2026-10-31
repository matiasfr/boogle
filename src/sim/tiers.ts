// Contribution tiers (brief 8 section 3): a lifetime rank per room, derived from plaque points (1 point = 1% of a
// section's cost, any ring), so it can never drift from the plaques. Credit only: it only rises, and nothing shows
// anyone else's. Pure.
export const TIERS = [
  { name: 'Hand', pts: 25 },
  { name: 'Porter', pts: 100 },
  { name: 'Navvy', pts: 300 },
  { name: 'Ganger', pts: 600 },
  { name: 'Foreman', pts: 1000 },
  { name: 'Engineer', pts: 1600 },
  { name: 'Stationmaster', pts: 2500 },
];
// The highest tier reached with this many points, as an index into TIERS; -1 below the first.
export function tierOf(pts: number): number {
  let t = -1;
  while (t + 1 < TIERS.length && pts >= TIERS[t + 1].pts) t++;
  return t;
}
