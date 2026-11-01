// Wagon rules: the `wagon` state (../../sim/wagon-steam.ts), the loco's steam and the wagon's own clock, and the
// wagon.stoke op that puts logs from your stack into its firebox (anyone's logs count: DESIGN.md 4; `proto-` rooms
// only, like tune.set: the host knows the room id, env.protoRoom). Every tick the fire burns down and the clock moves
// on, faster with more steam, at walking pace while the wagon stands at a stop on the shipped line (wagonStandsAt, so a
// `?layout=` tab ticks the same as everyone else); the ?proto=wagon&v=stoke render reads the wagon's place as wagonAt
// at that clock (sections laid, t0 0, the room's pace), so its speed is the same on every tab. tune.reset empties the
// firebox. Lockstep: everything here runs the same on every peer (see ./README.md).
import {
  createSteam,
  stoke,
  stokeRoom,
  steamTick,
  serializeSteam,
  loadSteam,
  hashSteam,
  STEAM_MAX,
  RATE_ONE,
  STOKE_MAX,
} from '../../sim/wagon-steam.ts';
import { wagonStandsAt } from '../../sim/wagon.ts';
import { paceIn } from '../../sim/tune.ts';
import { JUNK, bad } from './edit-gen.ts';

import type { SyncView, Land, Stream } from './types.ts';
import type { StacksApi } from './stacks.ts';
import type { SitesApi } from './sites.ts';
import type { TuneApi } from './tune.ts';

export const name = 'wagon';
export type WagonApi = ReturnType<typeof install>;
export const LOGS = 0; // ../../sim/materials.ts: only logs burn
// Wire fields (on top of op, i, j): how many logs to put in.
export type StokeFields = { n: number };

export function install(sync: SyncView, land: Land, rules: { stacks: StacksApi; sites: SitesApi; tune: TuneApi }) {
  const steam = createSteam();
  const { stacks } = rules;
  const { sites } = rules.sites;
  const { tune } = rules.tune;
  // How many of the n logs asked for this player can put in now: their own, and room in the firebox.
  const stokable = (pid: unknown, n: unknown): number =>
    Number.isSafeInteger(n) && stacks.kind(pid) === LOGS
      ? stokeRoom(steam, Math.min(n as number, stacks.count(pid)))
      : 0;
  sync.registerOp<StokeFields>('wagon.stoke', {
    validate: (e, ctx) => ctx.env.protoRoom === true && stokable(e.u, e.n) > 0,
    apply: (e) => {
      const n = stacks.take(e.u, stokable(e.u, e.n));
      return n ? { n, steam: stoke(steam, n) } : null;
    },
  });
  sync.onTick(() => {
    const pace = paceIn(tune);
    steamTick(steam, pace.cruise, wagonStandsAt(sites.open, steam.tau / RATE_ONE, pace));
  }, 'wagon');
  sync.onApplied((e) => {
    if (e.op !== 'tune.reset') return;
    steam.steam = 0;
    steam.rev++;
  }, 'wagon');
  sync.registerState('wagon', {
    serialize: () => serializeSteam(steam),
    load: (json) => loadSteam(steam, json),
    hash: () => hashSteam(steam),
  });
  return { steam, stokable };
}

// Replay-test generators (./README.md): a few logs into the firebox, sometimes more than it holds, or junk.
export const edits = {
  'wagon.stoke': (r: Stream) =>
    r.chance(JUNK) ? bad(r, 'wagon.stoke') : { op: 'wagon.stoke', i: 0, j: 0, n: r.int(1, STOKE_MAX + 2) },
};

export function invariants({ steam }: WagonApi): string | null {
  const ok =
    steam.steam >= 0 &&
    steam.steam <= STEAM_MAX &&
    steam.rate >= 0 &&
    steam.rate <= RATE_ONE &&
    Number.isSafeInteger(steam.tau) &&
    steam.fed >= 0;
  return ok ? null : `wagon steam ${steam.steam}, rate ${steam.rate}, tau ${steam.tau}`;
}
