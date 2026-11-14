// Owner pose protects nearby drops; it is never inventory. Unknown or stale observations fail closed.
export type RailwayPosition = {
  x: number;
  y?: number;
  z: number;
  at: number;
  pid?: string;
  act?: number;
  wary?: number;
};
function freshRailPosition(p: RailwayPosition | null, now: number): p is RailwayPosition {
  return (
    !!p && Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.at) && now - p.at <= 2000 && p.at <= now
  );
}
export function railNobodyNear(people: (RailwayPosition | null)[], now: number, x: number, z: number) {
  return people.every(
    (p) =>
      freshRailPosition(p, now) && (p.x * 100 - x) * (p.x * 100 - x) + (p.z * 100 - z) * (p.z * 100 - z) > 1200 * 1200,
  );
}
