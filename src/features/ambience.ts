// The sea, far gulls and a breeze under everything (src/render/ambience.ts), in Place's world: the live game and
// ?proto=place, whose land it listens to. Local and cosmetic. Serves DESIGN.md 1 (Toys before chores).
import { onStart } from '../loop.ts';
import { background } from '../async.ts';
import { productionRailway, protoOn } from '../proto/flags.ts';
import { startAmbience } from '../render/ambience.ts';

onStart(() => {
  if (productionRailway || protoOn('place')) background(startAmbience(), 'ambience');
});
