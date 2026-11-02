// The long crossing prototype (docs/plans/find-the-fun.md, step 7): behind ?proto=crossing, a fast train over a long
// viaduct to a far greybox island (src/proto/crossing/, in its own chunk). Without the flag nothing loads and the game
// is unchanged. Serves DESIGN.md 1 (Toys before chores).
import { protoOn } from '../proto/flags.ts';

if (protoOn('crossing')) void import('../proto/crossing/index.ts');
