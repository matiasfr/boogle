import { worldStatus } from '../../world/sync.ts';
import { net, getRoomId, remotes } from '../../netplay/net.ts';
import { BUILD } from '../../build-id.ts';
import { productionRailway } from '../../proto/flags.ts';
import { railwayDump } from './inspect.ts';
import { command, note, more } from './ui.ts';
import { ok, type Tool } from './types.ts';

export async function roomSummary() {
  const status = worldStatus();
  return {
    room: getRoomId(),
    connection: net.state,
    transport: net.room?.transport ?? 'none',
    roomLead: net.room?.isLead() ? net.myPeer : 'another tab; identifier unavailable',
    localIsLead: net.room?.isLead() ?? false,
    build: BUILD,
    remoteBuilds: [...remotes].map(([peer, p]) => ({ peer, build: p.build ?? 'unavailable' })),
    peers: net.room?.peers().map((p) => p.peer) ?? [],
    clockReady: status.ready,
    placeAuthority: productionRailway ? railwayDump() : 'not a place route',
    note: productionRailway ? 'Shared state is replicated from the server.' : 'Server room clock; local preview.',
  };
}
export const tool: Tool = {
  id: 'room',
  label: 'Room health',
  scope: 'Read-only. No desync requests, snapshots, resets or shared commands.',
  commands: ['read'],
  available: () => null,
  async run() {
    return ok('Room health snapshot.', await roomSummary());
  },
  mount(parent, ctx) {
    command(parent, ctx, 'room', 'Refresh room health', 'read');
    note(more(parent), 'Read refreshes this snapshot. Unknown metrics stay unavailable.');
    return () => {};
  },
};
