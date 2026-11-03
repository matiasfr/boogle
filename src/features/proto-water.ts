// Ultra Water's ocean in our renderer (docs/research/ultra-water.md): behind ?proto=water, on a test island (src/proto/water/,
// in its own chunk). Without the flag nothing loads and the game is unchanged. Serves DESIGN.md 1 (Toys before chores).
import { protoOn } from '../proto/flags.ts';

if (protoOn('water')) void import('../proto/water/index.ts');
