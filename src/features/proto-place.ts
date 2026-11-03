// A real place (docs/plans/find-the-fun.md, step 8): behind ?proto=place, a slice of Threefold Reach with a gorge, two
// camps to walk to and claim, a trestle and a town that grows (src/proto/place/, in its own chunk). Without the flag
// nothing loads and the game is unchanged. Its own room, `proto-place`: an address without it reloads with it. Serves
// DESIGN.md 1 (Toys before chores) and 9 (Leave something for the next visitor).
import { protoOn } from '../proto/flags.ts';

if (protoOn('place')) {
  const q = new URLSearchParams(location.search);
  if (!q.get('room')?.startsWith('proto-place')) {
    q.set('room', q.get('coop') === '1' ? 'proto-place-coop' : 'proto-place'); // &coop=1: src/proto/place/coop.ts
    location.replace(`${location.pathname}?${q}`);
  } else void import('../proto/place/index.ts');
}
