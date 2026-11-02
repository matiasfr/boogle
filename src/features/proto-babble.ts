// ?proto=babble: The Boogler's voice, a small formant synth that speaks as his line types out
// (docs/research/npc-babble-voices.md). Serves DESIGN.md "Small and readable".
import { protoOn } from '../proto/flags.ts';

if (protoOn('babble')) void import('../proto/babble/index.ts');
