// Room messages for the isolated T1 namespace only; normal rooms keep their existing wire contract.
import type { RailAction, RailResult } from '../sim/railway.ts';

export type RailwayRequest =
  { t: 'r:open' } | { t: 'r:edit'; e: RailAction } | { t: 'r:status'; epoch: number; request: number };
export type RailwayResponse =
  | { t: 'r:session'; to: string; epoch: number; next: number }
  | ({ t: 'r:result'; to: string } & RailResult)
  | {
      t: 'r:state';
      to: string;
      state: 'starting' | 'busy' | 'storage' | 'invalid' | 'snapshot-required';
      epoch?: number;
      request?: number;
    };

export const RAILWAY_CLIENT_MESSAGES = new Set(['r:open', 'r:edit', 'r:status']);
export const RAILWAY_HOST_MESSAGES = new Set(['r:session', 'r:result', 'r:state']);
