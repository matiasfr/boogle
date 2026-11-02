// The island's trees and rocks with no view: their colliders, owned by one entity for its lifetime, so despawning it
// takes them with it. The game loads this through ./index.ts, and `npm run sim` loads it alone (dev/sim/README.md).
import { defineKind, spawn } from '../../entity/entity.ts';
import { placements, propBodies } from './state.ts';

defineKind('props', {});

spawn({
  kind: 'props',
  bodies: propBodies,
  describe: () => ({ placements: placements.length, bodies: propBodies.length }),
});
