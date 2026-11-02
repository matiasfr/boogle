// Prototype: the departures board (?proto=board; docs/game-design/board.md). Stations are the fast-travel board: a
// flap-display sign at each laid station shows the timetabled wagon's next calls, and Interact opens a picker of the
// other stations. `&v=hop` (default) travels there at once; `&v=ride` tells you which wagon to catch instead. Without
// the flag nothing loads (src/proto/board/ is its own chunk). Serves DESIGN.md 8 (Designed for drop-in, drop-out) and
// 7 (Telegraph everything).
import { protoOn } from '../proto/flags.ts';
if (protoOn('board')) void import('../proto/board/index.ts');
