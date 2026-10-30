// Prototype flag rules: the `proto` state, a room-wide bitmask of which experimental features are on
// (../../sim/proto.js). It starts all on; the adapter (src/proto-flags.js) sets it from this tab's URL, and a joiner
// adopts the host's with the snapshot. Lockstep: everything here runs the same on every peer (see ./README.md).
import { createProtoState, ALL } from '../../sim/proto.js';

export const name = 'proto';

export function install(sync) {
  const proto = createProtoState({ mask: ALL });
  sync.registerState('proto', { serialize: proto.serialize, load: proto.load, hash: proto.hash });
  return { proto };
}
