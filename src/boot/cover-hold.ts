// Local. The loading screen (./splash.ts) can be asked to stay up a little longer: a view that must settle where the
// player stands before anyone sees them (a recent return, src/entities/railway/arrival.ts) holds it, and src/main.ts
// waits here just before it lifts. No game or renderer imports: the page's entry can load it.
//
//   holdCover(pending)     keep the cover up while pending() is true; returns its release
//   coverReleased(limit)   resolves when nothing holds the cover, or after `limit` ms (the cover never waits for ever)
//   coverLifted()          the cover has started to lift: from now on the player sees the world
const holds = new Set<() => boolean>();
let lifted = false;

export function holdCover(pending: () => boolean) {
  holds.add(pending);
  return () => {
    holds.delete(pending);
  };
}
export const coverHeld = () => [...holds].some((pending) => pending());
export const coverLifted = () => lifted;
export async function coverReleased(limitMs: number) {
  const until = performance.now() + limitMs;
  while (coverHeld() && performance.now() < until) await new Promise((r) => setTimeout(r, 50));
  lifted = true;
}
