// Mini-game toys (?proto=minis; docs/game-design/minis.md): three places with a prop near the court, from the research
// shortlist (docs/research/minigames-and-physics-minigames.md): a topple stack, one hole of ball golf and a mushroom hop
// line. `&v=topple`, `&v=golf` or `&v=hop` shows one; no `v` shows all three. Toys only: no rewards, nothing gates.
// Serves DESIGN.md 1 (Toys before chores), 2 (Physics toys first) and 10. Everything here is Local.
// On the `?play` island all three load, and the variant only says which one the playlist takes you to (live).
import { ON_ISLAND, onVariant, protoV } from '../flags.ts';

const v = ON_ISLAND ? '' : protoV('minis');
const all = !v || !['topple', 'golf', 'hop'].includes(v);
if (all) onVariant('minis', ['', 'topple', 'golf', 'hop'], () => {});
export const loaded = Promise.all([
  all || v === 'topple' ? import('./topple.ts') : null,
  all || v === 'golf' ? import('./golf.ts') : null,
  all || v === 'hop' ? import('./hop.ts') : null,
]);
