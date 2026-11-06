// A real place (docs/plans/find-the-fun.md, step 8): behind ?proto=place, a slice of Threefold Reach with a gorge, two
// camps to walk to and claim, a trestle and a town that grows (src/proto/place/, in its own chunk). Also the default
// game's world; flags.ts resolves its room and clean co-op defaults. The classic island stands in the same world. Serves
// DESIGN.md 1 (Toys before chores) and 9 (Leave something for the next visitor).
import { protoOn, productionRailway } from '../proto/flags.ts';
import { warmUp } from '../render/precompile.ts';

if (protoOn('place') && !productionRailway) {
  const loaded = import('../proto/place/index.ts');
  warmUp(() => loaded, { beforeScene: true }); // include its first-use meshes in the loading frame, too
}
