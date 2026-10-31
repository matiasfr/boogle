// Work-site rules: the site.stock op and the `sites` state (../../sim/sites.js): pouring your stack into a site's Track
// or Helper ring, credited on its plaque. A pour must come from your own stack (./stacks.js), in the material of the
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
  helperFreight,
  addFreight,
  helpersOf,
  runOf,
  pointsOf,
  serializeSites,
  loadSites,
  hashSites,
} from '../../sim/sites.js';
import { ROUTE, TRACK, HELPER, costOf } from '../../sim/route.js';
import { materialOf } from '../../sim/materials.js';
import { lengthOf, MACHINE_RUN } from '../../sim/scripted-run.js';
import { HARD_CAP } from '../../sim/stacks.js';
import { JUNK, bad } from './edit-gen.js';

export const name = 'sites';
const isInt = Number.isSafeInteger;

export function install(sync, land, rules) {
  const sites = createSites();
  const { stacks, roster } = rules;
  const doneFns = []; // fn(s, tick) when section s is laid (later rules, such as sources, subscribe at install)

  // How many of n units pid can pour into ring at site s now (0: refused).
  function pourable(pid, s, ring, n) {
    if (!siteOpen(sites, s) || (ring !== TRACK && ring !== HELPER) || !isInt(n) || n < 1 || n > HARD_CAP) return 0;
    if (stacks.kind(pid) !== materialOf(ROUTE[s].age)) return 0;
    return Math.min(n, stacks.count(pid), ringRoom(sites, s, ring));
  }
  sync.registerOp('site.stock', {
    validate: (e) => pourable(e.u, e.s, e.ring, e.n) > 0,
    apply: (e) => {
      const n = stacks.take(e.u, pourable(e.u, e.s, e.ring, e.n));
      if (!n) return null;
      return { s: e.s, ring: e.ring, n, ...stock(sites, e.s, e.ring, roster.indexOf(e.u), n) };
    },
  });
  // Anyone can start the machine once the Track ring holds a whole section; it lays the section over MACHINE_RUN.
  sync.registerOp('site.run', {
    validate: (e) => canRun(sites, e.s),
    apply: (e, tick) => {
      startRun(sites, e.s, roster.ensure(e.u), tick);
      return { s: e.s, t0: tick };
    },
  });
  // Each tick: helper freight, then a run that has played out lays its section (R1 and anything else listening hear
  // it), and when an age's last section is laid the age moves on and whatever is left of the old material on anyone's
  // back pours into that last site, credited (decision 7: one material on your back, nothing lost).
  sync.onTick((t) => {
    helperFreight(sites, t);
    const s = finishRun(sites, t);
    if (s < 0) return;
    for (const fn of doneFns) fn(s, t);
    const age = ageAt(sites);
    if (age !== sites.age) {
      const old = materialOf(sites.age);
      sites.age = age;
      for (let idx = 0; idx < roster.size(); idx++) {
        if (stacks.kindAt(idx) !== old) continue;
        const n = stacks.take(roster.roster.pids[idx], stacks.countAt(idx));
        stock(sites, s, TRACK, idx, n);
      }
    }
  }, 'sites');
  sync.registerState('sites', {
    serialize: () => serializeSites(sites),
    load: (json) => loadSites(sites, json),
    hash: () => hashSites(sites),
  });
  return {
    sites,
    onSectionDone: (fn) => doneFns.push(fn),
    age: () => sites.age,
    points: (pid) => (roster.indexOf(pid) < 0 ? 0 : pointsOf(sites, roster.indexOf(pid))),
    pointsAt: (idx) => pointsOf(sites, idx),
    room: (s, ring) => ringRoom(sites, s, ring),
    canRun: (s) => canRun(sites, s),
    run: (s, tick) => runOf(sites, s, tick), // { phase, name, progress, total, done } of site s's run at tick
    runLength: lengthOf(MACHINE_RUN),
    helpers: () => helpersOf(sites),
    addFreight: (n) => addFreight(sites, n), // apply only: helper output into the open Track ring; returns what fit
  };
}

// Replay-test generators (./README.md): pour part of your stack into a ring of the open site (sometimes a closed one),
// or start the machine there.
export const edits = {
  'site.run': (r, view) =>
    r.chance(JUNK) ? bad(r, 'site.run') : { op: 'site.run', i: 0, j: 0, s: view.rules.sites.sites.open },
  'site.stock': (r, view) =>
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
export function invariants({ sites }) {
  for (let s = 0; s < sites.list.length; s++) {
    const x = sites.list[s];
    if (x.poured + x.freight !== x.stock[TRACK] + x.stock[HELPER] + x.used) return `site ${s} lost units`;
    if (x.stock[TRACK] > costOf(s, TRACK) && !x.done) return `site ${s} track over cost`;
    if (x.stock[HELPER] > costOf(s, HELPER)) return `site ${s} helper over cost`;
    const cost = costOf(s, TRACK);
    const credited = x.plaque.reduce((t, r) => t + r[1] * cost + r[2], 0);
    if (credited !== x.poured * 100 + x.bonus * cost) return `site ${s} plaque out of step`;
    if (x.plaque.some((r) => r[2] < 0 || r[2] >= cost)) return `site ${s} remainder out of range`;
  }
  return null;
}
