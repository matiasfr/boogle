// Stack rules: the `stacks` state (../../sim/stacks.ts): what each player carries, by roster index. No ops of its own:
// later rules move material on and off stacks inside their own apply (a pile.take adds, a site.stock pours), which is
// why this module comes before them in RULES. Lockstep: everything here runs the same on every peer (see ./README.md).
import {
  createStacks,
  addTo,
  takeFrom,
  countOf,
  kindOf,
  roomFor,
  serializeStacks,
  loadStacks,
  hashStacks,
  HARD_CAP,
  HARD_MAX,
  SOFT_CAP,
  SPILL,
  spillOf,
} from '../../sim/stacks.ts';
import { MAX_PLAYERS } from '../../sim/roster.ts';

import type { SyncView, Land } from './types.ts';
import type { RosterApi } from './roster.ts';
import type { TuneApi } from './tune.ts';

export const name = 'stacks';
export type StacksApi = ReturnType<typeof install>;

// rules.tune (a later module, ./tune.ts) is read at run time, once every module is installed: the room's tuned caps.
export function install(sync: SyncView, land: Land, rules: { roster: RosterApi; tune?: TuneApi }) {
  const stacks = createStacks();
  const { roster } = rules;
  const hard = () => rules.tune?.get('hard') ?? HARD_CAP;
  sync.registerState('stacks', {
    serialize: () => serializeStacks(stacks),
    load: (json: unknown) => loadStacks(stacks, json, roster.size()), // the roster loads first (RULES order)
    hash: () => hashStacks(stacks),
  });
  const idxOf = (pid: unknown) => roster.indexOf(pid);
  return {
    stacks,
    count: (pid: unknown) => (idxOf(pid) < 0 ? 0 : countOf(stacks, idxOf(pid))),
    kind: (pid: unknown) => (idxOf(pid) < 0 ? -1 : kindOf(stacks, idxOf(pid))),
    countAt: (idx: number) => countOf(stacks, idx),
    kindAt: (idx: number) => kindOf(stacks, idx),
    // How many of kind k this player could pick up (validate). A player the roster hasn't met yet starts empty, if
    // the roster has room for them.
    room(pid: unknown, k: number) {
      const idx = idxOf(pid);
      if (idx >= 0) return roomFor(stacks, idx, k, hard());
      return roster.size() < MAX_PLAYERS ? hard() : 0;
    },
    // The room's caps and how many of a stack of n a jump spills.
    soft: () => rules.tune?.get('soft') ?? SOFT_CAP,
    hard,
    spill: (n: number) => spillOf(n, rules.tune?.get('soft') ?? SOFT_CAP, rules.tune?.get('spill') ?? SPILL),
    // Apply only. Adds up to n of kind k to pid's stack (meeting them in the roster); returns how many fitted.
    add(pid: string, k: number, n: number) {
      const idx = roster.ensure(pid);
      return idx < 0 ? 0 : addTo(stacks, idx, k, n, hard());
    },
    // Apply only. Takes up to n off pid's stack; returns how many came off.
    take: (pid: unknown, n: number) => (idxOf(pid) < 0 ? 0 : takeFrom(stacks, idxOf(pid), n)),
    takeAt: (idx: number, n: number) => takeFrom(stacks, idx, n), // apply only, by roster index
  };
}

// Every stack is within the hard cap's ceiling (a stack over a lowered cap keeps what it has) and belongs to a roster
// entry.
export function invariants({ stacks }: StacksApi, rules: { roster: RosterApi }): string | null {
  for (let idx = 0; idx < stacks.n.length; idx++) {
    if (stacks.n[idx] < 0 || stacks.n[idx] > HARD_MAX) return `stack ${idx} holds ${stacks.n[idx]}`;
    if (stacks.n[idx] > 0 && idx >= rules.roster.size()) return `stack ${idx} has no roster entry`;
  }
  return null;
}
