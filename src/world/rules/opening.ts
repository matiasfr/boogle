// Opening-day rules (vertical-slice S3; docs/plans/find-the-fun.md step 4): the `opening` state (the tick opening day
// started) and its ops, over ../../sim/era.ts. Once the age's last section is laid, anyone submits `open.start {}`;
// the first valid one wins and stamps the tick, later ones are rejected. A gathering call, the bell countdown and the
// era change that follows are a scripted run from that tick, so a late joiner sees the same moment, and the era stays
// derived. `open.here {}` ends the call early: any peer that sees every online player at the platform submits it, and
// the first one during the call stamps the tick (positions are presence, not lockstep, so this is a trusted hint; it
// can only shorten the call, once, never cancel or restart it).
// `open.lay {}` is the solo tester's shortcut: in a proto- room only (host-only fact `protoRoom`, set from the room id)
// it lays every remaining section at once. Lockstep: everything here runs the same on every peer (see ./README.md).
import {
  createOpening,
  canOpen,
  canGather,
  gather,
  startOpening,
  resetOpening,
  noteLaid,
  openingAt,
  openedAt,
  eraOf,
} from '../../sim/era.ts';
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
    apply: (_e, tick) => {
      const from = sites.open;
      const n = layRest(sites);
      if (n) noteLaid(opening, from, tick); // when they came, for a late joiner's wagon timetable
      return n ? { n } : null;
    },
  });
  sync.registerOp('open.here', {
    validate: (_e, ctx) => canGather(opening, ctx.tick),
    apply: (_e, tick) => {
      if (!canGather(opening, tick)) return null; // the call ran out, or a second one was stamped first
      gather(opening, tick);
      return { here: tick };
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
    bell: (tick: number) => openingAt(opening, tick), // the run's state at tick: phase 'call', then 'bell'
    era: (tick: number) => eraOf(rules.sites.age(), sites.open, openedAt(opening, tick)),
  };
}

// Replay-test generators (./README.md). The replay plays them on their own after the mix, since a laid route stays laid.
export const edits = {
  'open.start': (r: Stream) => (r.chance(JUNK) ? bad(r, 'open.start') : { op: 'open.start', i: 0, j: 0 }),
  'open.here': (r: Stream) => (r.chance(JUNK) ? bad(r, 'open.here') : { op: 'open.here', i: 0, j: 0 }),
  'open.lay': (r: Stream) => (r.chance(JUNK) ? bad(r, 'open.lay') : { op: 'open.lay', i: 0, j: 0 }),
};

// Opening day only ever starts once the age's last section is laid, and the call ends early only during it.
export function invariants({ opening }: OpeningApi, rules: { sites: SitesApi }): string | null {
  if (opening.t0 >= 0 && !openingReady(rules.sites.sites.open)) return `opening day at ${opening.t0} before the route`;
  if (opening.here >= 0 && (opening.t0 < 0 || opening.here < opening.t0)) return `call ended at ${opening.here}`;
  return null;
}
