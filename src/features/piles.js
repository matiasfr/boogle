// Ground piles (src/adapters/piles.js): heaps of loose material anyone can walk over to pick up. Serves DESIGN.md 10
// (slapstick: a spilled stack lands where everyone can scoop it back) and 5 (nothing is ever lost, so nobody can
// grief it away). Lockstep piles, Local pieces.
import { onFrame, onStart } from '../loop.js';
import { updatePiles, piles } from '../adapters/piles.js';

onStart(() => window.boogle && (window.boogle.piles = piles)); // debug handle (scenarios)
onFrame(({ now }) => updatePiles(now), { phase: 'update', order: 30 });
