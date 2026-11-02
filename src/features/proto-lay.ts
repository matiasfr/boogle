// Prototype: the laying run's solo panel, behind `?room=proto-lay&proto=lay` (docs/game-design/haul.md,
// "Machine runs"). The panel (src/proto/lay/) loads only with the flag, so without it nothing changes.
import { protoOn } from '../proto/flags.ts';
if (protoOn('lay')) import('../proto/lay/index.ts');
