// Work-site rules: the site.stock op and the `sites` state (../../sim/sites.ts): pouring your stack into a site's Track
// or Helper ring, credited on its plaque. A pour must come from your own stack (./stacks.ts), in the material of the
// site's age, at the site that is open now. Lockstep: everything here runs the same on every peer (see ./README.md).
import {
  createSites,
  siteOpen,
  ringRoom,
  stock,
  canRun,
  startRun,
  finishRun,
  ageAt,
  isDone,
  helperFreight,
  addFreight,
  helpersOf,
  runOf,
  pointsOf,
  serializeSites,
  loadSites,
  hashSites,
} from '../../sim/sites.ts';
import { ROUTE, TRACK, HELPER, costOf } from '../../sim/route.ts';
import { materialOf } from '../../sim/materials.ts';
import { HARD_MAX } from '../../sim/stacks.ts';
import { JUNK, bad } from './edit-gen.ts';

import type { SyncView, Land, Stream } from './types.ts';
import type { RosterApi } from './roster.ts';
import type { StacksApi } from './stacks.ts';
import type { TuneApi } from './tune.ts';

export const name = 'sites';
export type SitesApi = ReturnType<typeof install>;
const isInt = (v: unknown): v is number => Number.isSafeInteger(v);

export function install(sync: SyncView, land: Land, rules: { roster: RosterApi; stacks: StacksApi; tune?: TuneApi }) {
  const sites = createSites();
  const { stacks, roster } = rules;
  // A ring's cost in this room: rules.tune (a later module, ./tune.ts) is read at run time, once everything is installed.
  const cost = (s: number, ring: number) => (rules.tune ? rules.tune.cost(s, ring) : costOf(s, ring));
  const doneFns: ((s: number, tick: number) => void)[] = []; // fn(s, tick) when section s is laid (later rules, such as sources, subscribe at install)

  // How many of n units pid can pour into ring at site s now (0: refused).
  function pourable(pid: string, s: unknown, ring: unknown, n: unknown): number {
    if (!siteOpen(sites, s) || (ring !== TRACK && ring !== HELPER) || !isInt(n) || n < 1 || n > HARD_MAX) return 0;
    if (stacks.kind(pid) !== materialOf(ROUTE[s].age)) return 0;
    return Math.min(n, stacks.count(pid), ringRoom(sites, s, ring, cost));
  }
  sync.registerOp<{ s: number; ring: number; n: number }>('site.stock', {
    validate: (e) => pourable(e.u, e.s, e.ring, e.n) > 0,
    apply: (e) => {
      const n = stacks.take(e.u, pourable(e.u, e.s, e.ring, e.n));
      if (!n) return null;
      return { s: e.s, ring: e.ring, n, ...stock(sites, e.s, e.ring, roster.indexOf(e.u), n, cost) };
    },
  });
  // Anyone can start the machine once the Track ring holds a whole section; it lays the section over MACHINE_RUN.
  sync.registerOp<{ s: number }>('site.run', {
    validate: (e) => canRun(sites, e.s, cost),
    apply: (e, tick) => {
      if (!canRun(sites, e.s, cost)) return null; // a second start stamped before the first applied
      startRun(sites, e.s, roster.ensure(e.u), tick);
      return { s: e.s, t0: tick };
    },
  });
  // Each tick: helper freight, then a run that has played out lays its section (R1 and anything else listening hear
  // it), and when an age's last section is laid the age moves on and whatever is left of the old material on anyone's
  // back pours into that last site, credited (decision 7: one material on your back, nothing lost).
  sync.onTick((t) => {
    helperFreight(sites, t, cost);
    const s = finishRun(sites, t, cost);
    if (s < 0) return;
    for (const fn of doneFns) fn(s, t);
    if (ageAt(sites) === ROUTE[s].age) return;
    const old = materialOf(ROUTE[s].age);
    for (let idx = 0; idx < roster.size(); idx++)
      if (stacks.kindAt(idx) === old) stock(sites, s, TRACK, idx, stacks.takeAt(idx, stacks.countAt(idx)), cost);
  }, 'sites');
  sync.registerState('sites', {
    serialize: () => serializeSites(sites),
    load: (json: unknown) => loadSites(sites, json),
    hash: () => hashSites(sites),
  });
  return {
    sites,
    onSectionDone: (fn: (s: number, tick: number) => void) => void doneFns.push(fn),
    age: () => ageAt(sites),
    isDone: (s: number) => isDone(sites, s),
    points: (pid: unknown) => (roster.indexOf(pid) < 0 ? 0 : pointsOf(sites, roster.indexOf(pid))),
    room: (s: number, ring: number) => ringRoom(sites, s, ring, cost),
    cost, // a ring's cost in this room (tuned in playtest rooms)
    canRun: (s: number) => canRun(sites, s, cost),
    run: (s: number, tick: number) => runOf(sites, s, tick), // { phase, name, progress, total, done } of site s's run at tick
    helpers: () => helpersOf(sites),
    addFreight: (n: number) => addFreight(sites, n, cost), // apply only: helper output into the open Track ring; returns what fit
  };
}

// Replay-test generators (./README.md): pour part of your stack into a ring of the open site (sometimes a closed one),
// or start the machine there.
export const edits = {
  'site.run': (r: Stream, view: { rules: { sites: SitesApi } }) =>
    r.chance(JUNK) ? bad(r, 'site.run') : { op: 'site.run', i: 0, j: 0, s: view.rules.sites.sites.open },
  'site.stock': (r: Stream, view: { rules: { sites: SitesApi } }) =>
    r.chance(JUNK)
      ? bad(r, 'site.stock')
      : {
          op: 'site.stock',
          i: 0,
          j: 0,
          s: r.chance(0.85) ? view.rules.sites.sites.open : r.int(0, ROUTE.length),
          ring: r.int(0, 1),
          n: r.int(1, 12),
        },
};

// Units are conserved per site (poured and freight in = what sits in the rings plus what was used), rings stay
// within their cost, and every plaque point is backed by a pour (or a run bonus).
// Ring caps use the room's tuned cost; plaque credit the age's default one.
export function invariants({ sites, cost: costIn }: SitesApi): string | null {
  for (let s = 0; s < sites.list.length; s++) {
    const x = sites.list[s];
    if (x.poured + x.freight !== x.stock[TRACK] + x.stock[HELPER] + x.used) return `site ${s} lost units`;
    if (x.stock[TRACK] > costIn(s, TRACK) && !isDone(sites, s)) return `site ${s} track over cost`;
    if (x.stock[HELPER] > costIn(s, HELPER)) return `site ${s} helper over cost`;
    const cost = costOf(s, TRACK);
    const credited = x.plaque.reduce((t, r) => t + r[1] * cost + r[2], 0);
    if (credited !== x.poured * 100 + x.bonus * cost) return `site ${s} plaque out of step`;
    if (x.plaque.some((r) => r[2] < 0 || r[2] >= cost)) return `site ${s} remainder out of range`;
  }
  return null;
}
