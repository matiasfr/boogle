// Prototype: the departures board, v2 (?proto=board; docs/game-design/board.md). Only hubs (the two ends of the line)
// are fast travel: a hub's big flap board jumps you to the other hub or tells you which wagon to ride to a stop; a stop
// has a minimal sign (`&v=pole` flaps, `&v=plaque` a painted dial). Without the flag nothing loads (src/proto/board/
// is its own chunk). Serves DESIGN.md 8 (Designed for drop-in, drop-out) and 7 (Telegraph everything).
import { protoOn } from '../proto/flags.ts';
if (protoOn('board')) void import('../proto/board/index.ts');
