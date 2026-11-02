// Prototype: riding (?proto=ride). A greybox flatbed shuttles beside the court to prove platform carry
// (src/physics/platforms.ts); the body is src/proto/ride/index.ts, in its own chunk. Without the flag nothing loads.
// Serves DESIGN.md 1 (Toys before chores). Local: each tab runs its own flatbed.
import { protoOn } from '../proto/flags.ts';

if (protoOn('ride')) void import('../proto/ride/index.ts');
