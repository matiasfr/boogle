// Exact playable supply-v1 / override-only tune-v0 registry from 236f689a.
// Only the bounded recovery upgrade uses this registry; never install it in a live room.
import * as gifts from './gifts.ts';
import * as roster from './roster.ts';
import * as stacks from './stacks.ts';
import * as piles from './piles.ts';
import * as sites from './sites.ts';
import * as sources from './sources.ts';
import * as bank from './bank.ts';
import * as ball from './ball.ts';
import * as tune from './tune-supply-v1.ts';
import * as opening from './opening.ts';
import * as railway from './railway-supply-v1.ts';
import type { SyncView, Land } from './types.ts';

const OPS = [
  'gift.take',
  'gift.toss',
  'who.set',
  'pile.drop',
  'pile.take',
  'site.stock',
  'site.run',
  'src.take',
  'bank.wake',
  'ball.rest',
  'tune.set',
  'tune.fill',
  'tune.reset',
  'open.start',
  'open.lay',
  'open.here',
  'rail.supply',
  'rail.session',
  'rail.reject',
  'rail.resume',
  'rail.wake',
  'rail.chop',
  'rail.deposit',
  'rail.drop',
  'rail.take',
  'rail.rackTake',
];
const STATES = ['gifts', 'roster', 'stacks', 'piles', 'sites', 'sources', 'bank', 'ball', 'tune', 'opening', 'railway'];

export function installPlayableRailwaySupplyV1(sync: SyncView, land: Land) {
  let opCount = 0,
    stateCount = 0;
  const view: SyncView = {
    ...sync,
    registerOp(key, handlers) {
      if (key !== OPS[opCount++]) throw new Error(`frozen supply-v1 op registry changed: ${key}`);
      sync.registerOp(key, handlers);
    },
    registerState(key, handlers) {
      const version = key === 'railway' ? 1 : 0;
      if (key !== STATES[stateCount++] || (handlers.version ?? 0) !== version)
        throw new Error(`frozen supply-v1 state registry changed: ${key}`);
      sync.registerState(key, { ...handlers, version, migrate: {} });
    },
  };
  const rules: Record<string, unknown> = {};
  for (const m of [gifts, roster, stacks, piles, sites, sources, bank, ball, tune, opening])
    rules[m.name] = (m.install as (s: SyncView, l: Land, r: unknown) => unknown)(view, land, rules);
  const api = railway.install(
    view,
    land,
    {
      roster: rules.roster as roster.RosterApi,
      tune: rules.tune as tune.TuneApi,
    },
    { playable: true },
  );
  if (opCount !== OPS.length || stateCount !== STATES.length) throw new Error('frozen supply-v1 registry incomplete');
  return { railway: api, tune: rules.tune as tune.TuneApi };
}
