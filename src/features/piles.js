// Ground piles (src/adapters/piles.js): heaps of loose material anyone can walk over to pick up. Serves DESIGN.md 10
// (slapstick: a spilled stack lands where everyone can scoop it back) and 5 (nothing is ever lost, so nobody can
// grief it away). Lockstep piles, Local pieces.
import { rules } from '../world/game-world.js'; // first: the lockstep rules register before anything else
import { onFrame, onStart } from '../loop.js';
import { updatePiles, piles } from '../adapters/piles.js';
import { identity } from '../player/identity.js';

// Ask for the whole pile, as much as your stack has room for; nothing of a kind you can't carry.
const want = (p) => Math.min(p.n, identity.pid ? rules.stacks.room(identity.pid, p.k) : 0);

onStart(() => window.boogle && (window.boogle.piles = piles)); // debug handle (scenarios)
onFrame(({ now }) => updatePiles(now, want), { phase: 'update', order: 30 });
