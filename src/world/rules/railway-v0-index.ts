// The exact playable v0 registry at 3e37f124. Do not append current rules here.
// Common v0 rules retain their existing version/hash contract; any later version is refused below.
import * as gifts from './gifts.ts';
import * as roster from './roster.ts';
import * as stacks from './stacks.ts';
import * as piles from './piles.ts';
import * as sites from './sites.ts';
import * as sources from './sources.ts';
import * as bank from './bank.ts';
import * as ball from './ball.ts';
import * as tune from './tune-v0.ts';
import * as opening from './opening.ts';
import * as railway from './railway-v0.ts';
import type { SyncView, Land } from './types.ts';
import { RAILWAY_CATALOG, RAILWAY_T1, RAILWAY_SOURCES, RAILWAY_SUPPLY } from '../../sim/railway-layout.ts';

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
  'rail.session',
  'rail.reject',
  'rail.resume',
  'rail.wake',
  'rail.chop',
  'rail.deposit',
  'rail.drop',
  'rail.take',
];
const STATES = ['gifts', 'roster', 'stacks', 'piles', 'sites', 'sources', 'bank', 'ball', 'tune', 'opening', 'railway'];

export function installPlayableRailwayV0(sync: SyncView, land: Land) {
  // Keep the shared numeric catalog pinned, rather than silently replaying old accepted work on a new layout.
  const catalog = JSON.stringify([RAILWAY_CATALOG, RAILWAY_T1, RAILWAY_SOURCES, RAILWAY_SUPPLY]);
  let hash = 2166136261;
  for (let i = 0; i < catalog.length; i++) hash = Math.imul(hash ^ catalog.charCodeAt(i), 16777619) >>> 0;
  if (hash !== 1984590420) throw new Error('frozen T1 catalog changed');
  let opCount = 0,
    stateCount = 0;
  const view: SyncView = {
    ...sync,
    registerOp(key, handlers) {
      if (key !== OPS[opCount++]) throw new Error(`frozen T1 op registry changed: ${key}`);
      sync.registerOp(key, handlers);
    },
    registerState(key, handlers) {
      if (key !== STATES[stateCount++] || (handlers.version ?? 0) !== 0)
        throw new Error(`frozen T1 state registry changed: ${key}`);
      sync.registerState(key, { ...handlers, version: 0, migrate: {} });
    },
  };
  const rules: Record<string, unknown> = {};
  for (const m of [gifts, roster, stacks, piles, sites, sources, bank, ball, tune, opening])
    rules[m.name] = (m.install as (s: SyncView, l: Land, r: unknown) => unknown)(view, land, rules);
  const api = railway.install(view, land, { roster: rules.roster as roster.RosterApi }, { playable: true });
  if (opCount !== OPS.length || stateCount !== STATES.length) throw new Error('frozen T1 registry incomplete');
  return api;
}
