// Opening-day rules (vertical-slice S3; docs/plans/find-the-fun.md step 4): the `opening` state (the tick opening day
// started) and its ops, over ../../sim/era.ts. Once the age's last section is laid, anyone submits `open.start {}`;
// the first valid one wins and stamps the tick, later ones are rejected. The bell countdown and the era change that
// follows are a scripted run from that tick, so a late joiner sees the same moment, and the era stays derived.
// `open.lay {}` is the solo tester's shortcut: in a proto- room only (host-only fact `protoRoom`, set from the room id)
// it lays every remaining section at once. Lockstep: everything here runs the same on every peer (see ./README.md).
import { createOpening, canOpen, startOpening, resetOpening, openingAt, openedAt, eraOf } from '../../sim/era.ts';
import { serializeOpening, loadOpening, hashOpening, openingReady } from '../../sim/era.ts';
import { layRest } from '../../sim/sites.ts';
import { ROUTE } from '../../sim/route.ts';
import { JUNK, bad } from './edit-gen.ts';

import type { SyncView, Land, Stream } from './types.ts';
import type { SitesApi } from './sites.ts';

export const name = 'opening';
export type OpeningApi = ReturnType<typeof install>;

export function install(sync: SyncView, land: Land, rules: { sites: SitesApi }) {
  const opening = createOpening();
  const { sites } = rules.sites;
  sync.registerOp('open.start', {
    validate: () => canOpen(opening, sites.open),
    apply: (_e, tick) => {
      if (!canOpen(opening, sites.open)) return null; // a second start stamped before the first applied
      startOpening(opening, tick);
      return { t0: tick };
    },
  });
  sync.registerOp('open.lay', {
    validate: (_e, ctx) => ctx.env.protoRoom === true && sites.open < ROUTE.length,
    apply: () => {
      const n = layRest(sites);
      return n ? { n } : null;
    },
  });
  // The playtest kit's haul reset (./tune.ts, an earlier module) empties the route: opening day goes back with it.
  sync.onApplied((e) => {
    if (e.op === 'tune.reset') resetOpening(opening);
  }, 'opening');
  sync.registerState('opening', {
    serialize: () => serializeOpening(opening),
    load: (json) => loadOpening(opening, json),
    hash: () => hashOpening(opening),
  });
  return {
    opening,
    ready: () => canOpen(opening, sites.open), // opening day can be started now
    bell: (tick: number) => openingAt(opening, tick), // the countdown's run state at tick
    era: (tick: number) => eraOf(rules.sites.age(), sites.open, openedAt(opening, tick)),
  };
}

// Replay-test generators (./README.md). The replay plays them on their own after the mix, since a laid route stays laid.
export const edits = {
  'open.start': (r: Stream) => (r.chance(JUNK) ? bad(r, 'open.start') : { op: 'open.start', i: 0, j: 0 }),
  'open.lay': (r: Stream) => (r.chance(JUNK) ? bad(r, 'open.lay') : { op: 'open.lay', i: 0, j: 0 }),
};

// Opening day only ever starts once the age's last section is laid.
export function invariants({ opening }: OpeningApi, rules: { sites: SitesApi }): string | null {
  return opening.t0 < 0 || openingReady(rules.sites.sites.open)
    ? null
    : `opening day at ${opening.t0} before the route`;
}
