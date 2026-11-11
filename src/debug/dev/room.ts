import { worldStatus } from '../../world/sync.ts';
import { net, getRoomId, remotes } from '../../netplay/net.ts';
import { BUILD } from '../../build-id.ts';
import { PROTO, productionRailway } from '../../proto/flags.ts';
import { inspectRailwayLegacy } from '../../entities/railway/state.ts';
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
    queued: status.queued,
    heldDropped: status.heldDropped,
    rejected: 'unavailable: no per-command rejection stream exposed by the current room adapter',
    hash: { ok: status.hashOk, bad: status.hashBad, lastBad: status.lastBad, subsystems: status.subsystems },
    placeAuthority: productionRailway
      ? inspectRailwayLegacy()
      : PROTO === 'place'
        ? (await import('./place.ts')).inspectPlace().authority
        : 'not a place route',
    note: productionRailway
      ? 'T1 material and completion use server Lockstep authority.'
      : 'Server Lockstep hashes and temporary place snapshots are separate. Place snapshot agreement is not Lockstep verification.',
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
