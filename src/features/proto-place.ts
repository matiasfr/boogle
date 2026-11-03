// A real place (docs/plans/find-the-fun.md, step 8): behind ?proto=place, a slice of Threefold Reach with a gorge, two
// camps to walk to and claim, a trestle and a town that grows (src/proto/place/, in its own chunk). Also the default
// game; flags.ts resolves its room and clean co-op defaults, with ?classic=1 retaining the old island. Serves
// DESIGN.md 1 (Toys before chores) and 9 (Leave something for the next visitor).
import { protoOn } from '../proto/flags.ts';
import { warmUp } from '../render/precompile.ts';

if (protoOn('place')) {
  const loaded = import('../proto/place/index.ts');
  warmUp(() => loaded); // the opening must never become playable before its land and colliders exist
}
