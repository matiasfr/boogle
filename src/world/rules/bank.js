// Bank rules: the bank.wake op and the `bank` state: offline time already turned into helper freight (../../sim/bank.js).
// When a tab starts hosting from a save, it submits bank.wake { ms } for the time nobody hosted; apply turns it into the
// helper huts' freight in the open site's Track ring (./sites.js), capped at one section, and the machine still waits
// for a player to start it. Only the host's own wake, with the exact gap it measured, passes validate: that gap and the
// host's selfId are host-only env facts set just for that submit and cleared after, so nobody can replay a broadcast
// wake. Lockstep: everything here runs the same on every peer (see ./README.md).
import { offlineFreight } from '../../sim/bank.js';
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
    validate: (e, ctx) => isInt(e.ms) && e.ms > 0 && ctx.from === ctx.env.hostSelf && e.ms === ctx.env.gapMs,
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
    hash: () => {
      const lo = bank.ms % TWO32,
        hi = Math.floor(bank.ms / TWO32);
      return Math.imul(Math.imul(2166136261 ^ lo, 16777619) ^ hi, 16777619) >>> 0;
    },
  });
  return { bank, ms: () => bank.ms };
}

// Replay-test generators (./README.md): wakes from whoever (only a host with matching env passes; the replay peers
// set it, see test/world-replay.test.mjs), or junk.
export const edits = {
  'bank.wake': (r) => (r.chance(JUNK) ? bad(r, 'bank.wake') : { op: 'bank.wake', i: 0, j: 0, ms: 3600000 }),
};

export function invariants({ bank }) {
  return isInt(bank.ms) && bank.ms >= 0 ? null : `bank holds ${bank.ms} ms`;
}
