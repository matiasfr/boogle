// Ground piles (src/adapters/piles.ts): heaps of loose material anyone can walk over to pick up. Serves DESIGN.md 10
// (slapstick: a spilled stack lands where everyone can scoop it back) and 5 (nothing is ever lost, so nobody can
// grief it away). Lockstep piles, Local pieces.
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import { onFrame, onStart } from '../loop.ts';
import { updatePiles, piles } from '../adapters/piles.ts';
import { identity } from '../player/identity.ts';
import { haulVariant } from '../player/haul-variant.ts';
import type { Pile } from '../sim/piles.ts';

// Ask for the whole pile, as much as your stack has room for; nothing of a kind you can't carry. With the barrow
// (?proto=haul&v=barrow) you scoop piles with it instead (src/proto/haul/barrow.ts).
const want = (p: Pile) =>
  haulVariant === 'barrow' ? 0 : Math.min(p.n, identity.pid ? rules.stacks.room(identity.pid, p.k) : 0);

const handle = window as unknown as { boogle?: Record<string, unknown> };
onStart(() => handle.boogle && (handle.boogle.piles = piles)); // debug handle (scenarios)
onFrame(({ now }: { now: number }) => updatePiles(now, want), { phase: 'update', order: 30 });
