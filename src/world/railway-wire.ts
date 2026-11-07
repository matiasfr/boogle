// Room messages for railway rooms (server/src/host/railway-requests.ts). The railway's state, acks and refusals arrive
// as replication packets (./replicate.ts); the session handshake and room status are their own messages.
import type { RailAction } from '../sim/railway.ts';

export type RailwayRequest =
  { t: 'r:open' } | { t: 'r:resync' } | { t: 'r:edit'; e: RailAction & { at?: number[]; ms?: number } };
export type RailwayResponse =
  | { t: 'r:session'; to: string; epoch: number; next: number }
  | { t: 'r:state'; to: string; state: 'starting' | 'storage' | 'full'; epoch?: number; request?: number };

export const RAILWAY_CLIENT_MESSAGES = new Set(['r:open', 'r:edit', 'r:resync']);
