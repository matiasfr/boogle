// Bank rules: the bank.wake op and the `bank` state: offline time already turned into helper freight (../../sim/bank.js).
// When a tab starts hosting a saved world, it submits bank.wake { ms } for the time nobody hosted; apply turns it into
// the helper huts' freight in the open site's Track ring (./sites.js), capped at one section, and the machine still
// waits for a player to start it. The op is hostOnly (../sync.js): only the host's own submit is stamped, so nobody can
// replay a broadcast wake, and a second wake from the same gap banks nothing because the gap subtracts `ms`.
// Lockstep: everything here runs the same on every peer (see ./README.md).
import { offlineFreight } from '../../sim/bank.js';
import { FNV_SEED, fold } from '../../sim/hash.js';
import { HELPER_EVERY } from '../../sim/sites.js';
import { costOf, TRACK, ROUTE } from '../../sim/route.js';
import { JUNK, bad } from './edit-gen.js';

export const name = 'bank';
const isInt = Number.isSafeInteger;
const TWO32 = 4294967296;

export function install(sync, land, rules) {
  const bank = { ms: 0 };
  const { sites } = rules;
  sync.registerOp('bank.wake', {
    hostOnly: true,
    validate: (e) => isInt(e.ms) && e.ms > 0,
    apply: (e) => {
      bank.ms += e.ms;
      const s = sites.sites.open;
      if (s >= ROUTE.length) return { n: 0 };
      return { n: sites.addFreight(offlineFreight(sites.helpers(), e.ms, HELPER_EVERY, costOf(s, TRACK))) };
    },
  });
  sync.registerState('bank', {
    serialize: () => ({ ms: bank.ms }),
    load: (json) => {
      if (!isInt(json?.ms) || json.ms < 0) throw new Error('bank: bad snapshot');
      bank.ms = json.ms;
    },
    // ms can pass 2^32 (weeks offline): fold its low and high words
    hash: () => fold(fold(FNV_SEED, bank.ms % TWO32), Math.floor(bank.ms / TWO32)),
  });
  return { bank, ms: () => bank.ms };
}

// Replay-test generators (./README.md): wakes from whoever (only the host's own pass), or junk.
export const edits = {
  'bank.wake': (r) => (r.chance(JUNK) ? bad(r, 'bank.wake') : { op: 'bank.wake', i: 0, j: 0, ms: 3600000 }),
};

export function invariants({ bank }) {
  return isInt(bank.ms) && bank.ms >= 0 ? null : `bank holds ${bank.ms} ms`;
}
