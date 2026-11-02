// Prototype: the rig path end to end (?proto=assets): a jointed hero stands between the scaffold bays, posed by code,
// with outfits and an authored wave on Interact. Also in the look lab (?proto=look&hero=<outfit>), to see it under the
// scene's render presets. The body is src/proto/hero/rig.ts, in its own chunk. Local: decoration only.
import { protoOn } from '../proto/flags.ts';

if (protoOn('assets') || new URLSearchParams(location.search).has('hero')) void import('../proto/hero/rig.ts');
