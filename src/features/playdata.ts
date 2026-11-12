// Playtest data (src/proto/playdata/record.ts): the current game and any `?proto=` page upload what happened, so the director can
// read a session before hearing about it. `&notrack=1` turns it off. Loads in its own chunk only with a flag; without
// one the game is unchanged. Serves DESIGN.md "How we work".
import { pageQuery, productionRailway } from '../proto/flags.ts';
const q = pageQuery();
if ((q.has('proto') || productionRailway) && !q.has('notrack') && import.meta.env.VITE_BOOGLE_SERVER)
  void import('../proto/playdata/record.ts');
