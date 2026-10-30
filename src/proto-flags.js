// Prototype toggles (see src/sim/proto.js for the URL syntax). Room-wide: the host's URL wins. The bitmask is a
// registered world state (src/world/rules/proto.js), so a joiner adopts it with the snapshot and every tab shows the
// same features.
import { rules } from './world/game-world.js'; // first: the lockstep rules register before anything else
import { parseFlags, FLAGS } from './sim/proto.js';
import { onSnapshot, worldStatus } from './world/sync.js';

const mine = parseFlags(location.search);
export const proto = rules.proto.proto;
proto.set(mine);

onSnapshot(() => {
  // A host that loaded a persisted snapshot keeps its own URL's flags; a client adopts the room's.
  if (worldStatus().mode === 'host') proto.set(mine);
  else if (proto.s.mask !== mine.mask)
    console.info(
      `[proto] room flags differ from this URL; using the host's: on=${FLAGS.filter(proto.on).join(',') || 'none'}`,
    );
});

window.__proto = proto;
