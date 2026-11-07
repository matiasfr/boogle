// Room messages for railway rooms (server/src/host/railway-requests.ts). The railway's state, acks and refusals arrive
// as replication packets (./replicate.ts); only the session handshake is its own message.
import type { RailAction } from '../sim/railway.ts';

export type RailwayRequest = { t: 'r:open' } | { t: 'r:edit'; e: RailAction & { at?: number[]; ms?: number } };
export type RailwayResponse = { t: 'r:session'; to: string; epoch: number; next: number };

export const RAILWAY_CLIENT_MESSAGES = new Set(['r:open', 'r:edit']);
