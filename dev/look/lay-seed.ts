// A railway save for watching the track layer at cruise: `--rail-seed q5-held` is Q4 laid and Q5's bill paid in full
// with the sea switch not yet pulled, so the 260 m double-track stretch (9 m/s, 29 s of laying) starts when the page
// pulls it (dev/look/evals/track-layer-cross.ts), not while the page is still mounting. Accepted ops only. Looks only.
import { logs, rails, railwayAtQ5 } from '../../src/sim/railway-seed-route.ts';
import { seedDoc } from './ring-mid-seed.ts';

export const layStage = (stage: string) => (stage === 'q5-held' ? stage : null);
export function buildLayDoc() {
  const seed = railwayAtQ5('q4-done');
  logs(seed, 'a', 'Q5', 24);
  rails(seed, 'b', 'Q5', 24);
  return seedDoc(seed);
}
