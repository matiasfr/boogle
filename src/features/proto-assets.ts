// Prototype: the asset pipeline end to end (?proto=assets, also on the ?play island): two scaffold bays rise by spawn,
// one from the Blender kit, one built in code. The body is src/proto/assets/index.ts, in its own chunk. Serves "Small
// and readable" (DESIGN.md). Local: decoration only.
import { protoOn } from '../proto/flags.ts';

if (protoOn('assets')) void import('../proto/assets/index.ts');
