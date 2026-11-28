import type { ReturnCandidate, ReturnPosition } from './return-spot.ts';

type XZ = Pick<ReturnPosition, 'x' | 'z'>;
const distance = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);

/** Called once the railway is ready. Only a returning visitor without a recent spot waits for presence. */
export function friendArrivalStep(first: boolean, recent: boolean, trains: boolean, poses: number, elapsedMs: number) {
  if (recent) return 'resume';
  if (first || !trains) return 'skip';
  if (poses) return 'choose';
  return elapsedMs < 1500 ? 'wait' : 'skip';
}

/** Filter before ranking: the friend working nearest the bill must themselves be within reach of an open halt. */
export function friendDestination<T extends XZ>(
  friends: readonly T[],
  standing: readonly ReturnCandidate[],
  home: XZ,
  works: XZ,
) {
  const visitors = friends
    .filter((p) => distance(p, home) > 150)
    .sort((a, b) => distance(a, works) - distance(b, works));
  for (const friend of visitors) {
    const reach = (p: ReturnCandidate) => distance(p.platform ?? p, friend);
    const ordered = [...standing].sort((a, b) => reach(a) - reach(b));
    const nearest = ordered[0];
    if (nearest && reach(nearest) <= 250) return { friend, platforms: ordered.filter((p) => p.halt === nearest.halt) };
  }
  return null;
}
