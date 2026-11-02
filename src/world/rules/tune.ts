// Playtest tuning rules: the `tune` state (../../sim/tune.ts), the tune.set op that changes one of the haul loop's
// lockstep numbers for the whole room at once, tune.fill (fills the open Track
// ring), and tune.reset, which puts the haul (stacks, piles, sites, bundles) back
// to fresh. All only in `proto-` rooms: the host knows the room id (env.protoRoom), the rules don't. The earlier haul
// rules (stacks, sites, sources) read the tuned numbers through `rules.tune`, filled once every module is installed.
// Lockstep: everything here runs the same on every peer (see ./README.md).
import {
  createTune,
  okTune,
  setTune,
  costIn,
  serializeTune,
  loadTune,
  hashTune,
  specOf,
  TUNABLES,
  type TuneKey,
} from '../../sim/tune.ts';
import { createStacks } from '../../sim/stacks.ts';
import { createSites } from '../../sim/sites.ts';
import { refillAll } from '../../sim/sources.ts';
import { ROUTE, TRACK, HELPER } from '../../sim/route.ts';
import { JUNK, bad } from './edit-gen.ts';

import type { SyncView, Land, Stream, Ctx } from './types.ts';
import type { StacksApi } from './stacks.ts';
import type { PilesApi } from './piles.ts';
import type { SitesApi } from './sites.ts';
import type { SourcesApi } from './sources.ts';

export const name = 'tune';
export type TuneApi = ReturnType<typeof install>;
const allowed = (ctx: Ctx) => ctx.env.protoRoom === true;

export function install(
  sync: SyncView,
  land: Land,
  rules: { stacks: StacksApi; piles: PilesApi; sites: SitesApi; sources: SourcesApi },
) {
  const tune = createTune();
  const { sites } = rules.sites;
  // A cost change must leave every ring within its cost and nothing stuck: the open wood site's Track ring can't drop
  // below what it holds or change mid-run; a Helper ring still being filled must keep room for one more piece.
  function fits(key: TuneKey, v: number): boolean {
    if (key === 'cost0') {
      const x = sites.list[sites.open];
      return !x || ROUTE[sites.open].age !== 0 || (x.t0 < 0 && v >= x.stock[TRACK]);
    }
    if (key === 'helper0')
      return sites.list.every((x, s) => {
        if (ROUTE[s].age !== 0) return true;
        return x.helpers || s < sites.open ? v >= x.stock[HELPER] : v > x.stock[HELPER];
      });
    return true;
  }
  const ok = (key: unknown, v: unknown): key is TuneKey => okTune(key, v) && fits(key as TuneKey, v as number);
  sync.registerOp<{ key: string; v: number }>('tune.set', {
    validate: (e, ctx) => allowed(ctx) && ok(e.key, e.v),
    apply: (e) => {
      if (!ok(e.key, e.v)) return null; // the world moved on between stamp and apply
      setTune(tune, e.key, e.v);
      return { key: e.key, v: e.v };
    },
  });
  // The solo tester's shortcut (?proto=lay): fill the open site's Track ring at once, as freight (no plaque credit), so
  // the machine can start now.
  sync.registerOp('tune.fill', {
    validate: (e, ctx) => allowed(ctx) && rules.sites.room(sites.open, TRACK) > 0,
    apply: () => {
      const n = rules.sites.addFreight(rules.sites.room(sites.open, TRACK));
      return n ? { s: sites.open, n } : null;
    },
  });
  // Back to a fresh haul: nobody carries anything, no piles, no work done at any site, every bundle full. The tuning,
  // the roster and the bank stay.
  sync.registerOp('tune.reset', {
    validate: (e, ctx) => allowed(ctx),
    apply: () => {
      Object.assign(rules.stacks.stacks, createStacks());
      const { piles } = rules.piles;
      piles.list = [];
      piles.rev++;
      Object.assign(sites, createSites(), { rev: sites.rev + 1 });
      refillAll(rules.sources.sources);
      tune.rev++;
      return {};
    },
  });
  sync.registerState('tune', {
    serialize: () => serializeTune(tune),
    load: (json: unknown) => loadTune(tune, json),
    hash: () => hashTune(tune),
  });
  return { tune, cost: costIn(tune), get: (key: TuneKey) => tune.v[key] };
}

// Replay-test generators (./README.md): set a key somewhere in its bounds (the host refuses what doesn't fit the
// world), or reset the haul now and then.
export const edits = {
  'tune.set': (r: Stream) => {
    if (r.chance(JUNK)) return bad(r, 'tune.set');
    const t = r.pick(TUNABLES);
    const v = r.chance(0.5) ? t.def + r.int(-t.def + t.min, t.def) : r.int(t.min, t.max);
    return { op: 'tune.set', i: 0, j: 0, key: t.key, v: Math.min(t.max, Math.max(t.min, v)) };
  },
  'tune.fill': (r: Stream) =>
    r.chance(JUNK) ? bad(r, 'tune.fill') : r.chance(0.3) ? { op: 'tune.fill', i: 0, j: 0 } : null,
  'tune.reset': (r: Stream) =>
    r.chance(JUNK) ? bad(r, 'tune.reset') : r.chance(0.5) ? { op: 'tune.reset', i: 0, j: 0 } : null,
};

// Every value is a known key within its bounds.
export function invariants({ tune }: TuneApi): string | null {
  for (const [key, v] of Object.entries(tune.v)) if (!specOf(key) || !okTune(key, v)) return `tune ${key} = ${v}`;
  return null;
}
