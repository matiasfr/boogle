// Mini-game toys (?proto=minis; docs/game-design/minis.md): two places with a prop near the court, from the research
// shortlist (docs/research/minigames-and-physics-minigames.md): one hole of ball golf and a mushroom hop line.
// `&v=golf` or `&v=hop` shows one; no `v` shows both. Toys only: no rewards, nothing gates.
// Serves DESIGN.md 1 (Toys before chores), 2 (Physics toys first) and 10. Everything here is Local.
import { protoV } from '../flags.ts';

const v = protoV('minis');
const all = !v || !['golf', 'hop'].includes(v);
export const loaded = Promise.all([
  all || v === 'golf' ? import('./golf.ts') : null,
  all || v === 'hop' ? import('./hop.ts') : null,
]);
