// Bank rules: the bank.wake op and the `bank` state: offline time already turned into helper freight (../../sim/bank.ts).
// When a tab starts hosting a saved world, it submits bank.wake { ms } for the time nobody hosted; apply turns it into
// the helper huts' freight in the open site's Track ring (./sites.ts), capped at one section, and the machine still
// waits for a player to start it. The op is hostOnly (../sync.js): only the host's own submit is stamped, so nobody can
// replay a broadcast wake, and a second wake from the same gap banks nothing because the gap subtracts `ms`.
// Lockstep: everything here runs the same on every peer (see ./README.md).
import { offlineFreight } from '../../sim/bank.ts';
import { FNV_SEED, fold } from '../../sim/hash.ts';
import { HELPER_EVERY } from '../../sim/sites.ts';
import { TRACK, ROUTE } from '../../sim/route.ts';
import { JUNK, bad } from './edit-gen.ts';

import type { SyncView, Land, Stream } from './types.ts';
import type { SitesApi } from './sites.ts';

export const name = 'bank';
export type BankApi = ReturnType<typeof install>;
const isInt = (v: unknown): v is number => Number.isSafeInteger(v);
const TWO32 = 4294967296;

export function install(sync: SyncView, land: Land, rules: { sites: SitesApi }) {
  const bank = { ms: 0 };
  const { sites } = rules;
  sync.registerOp<{ ms: number }>('bank.wake', {
    hostOnly: true,
    validate: (e) => isInt(e.ms) && e.ms > 0,
    apply: (e) => {
      bank.ms += e.ms;
      const s = sites.sites.open;
      if (s >= ROUTE.length) return { n: 0 };
      return { n: sites.addFreight(offlineFreight(sites.helpers(), e.ms, HELPER_EVERY, sites.cost(s, TRACK))) };
    },
  });
  sync.registerState('bank', {
    serialize: () => ({ ms: bank.ms }),
    load: (json: unknown) => {
      const ms = (json as { ms?: unknown } | null)?.ms;
      if (!isInt(ms) || ms < 0) throw new Error('bank: bad snapshot');
      bank.ms = ms;
    },
    // ms can pass 2^32 (weeks offline): fold its low and high words
    hash: () => fold(fold(FNV_SEED, bank.ms % TWO32), Math.floor(bank.ms / TWO32)),
  });
  return { bank, ms: () => bank.ms };
}

// Replay-test generators (./README.md): wakes from whoever (only the host's own pass), or junk.
export const edits = {
  'bank.wake': (r: Stream) => (r.chance(JUNK) ? bad(r, 'bank.wake') : { op: 'bank.wake', i: 0, j: 0, ms: 3600000 }),
};

export function invariants({ bank }: BankApi): string | null {
  return isInt(bank.ms) && bank.ms >= 0 ? null : `bank holds ${bank.ms} ms`;
}
