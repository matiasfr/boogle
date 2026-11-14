// One room-facing interface. Prototype worlds keep their clock/checkpoint without pretending to own railway rules.
import { isRailwayRoom } from '../../../src/world/railway-namespace.ts';
import { createWorldHost } from './ordinary-host.ts';
import { createRailwayWorldHost, type RailwayHostOptions } from './world-host.ts';

type Ordinary = ReturnType<typeof createWorldHost>;
type Railway = ReturnType<typeof createRailwayWorldHost>;
export type RoomWorldHost = Pick<
  Ordinary,
  'sync' | 'onSend' | 'deliver' | 'step' | 'status' | 'close' | 'wake' | 'pause' | 'depart'
> & {
  roomStatus: () => ReturnType<Ordinary['roomStatus']> & Partial<ReturnType<Railway['roomStatus']>>;
};

export function createRoomWorldHost(options: RailwayHostOptions): RoomWorldHost {
  return isRailwayRoom(options.roomId) ? createRailwayWorldHost(options) : createWorldHost(options);
}
