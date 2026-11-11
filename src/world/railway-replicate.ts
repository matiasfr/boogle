// The railway as Server-kind state (docs/plans/replication.md, R1a; docs/plans/ecs-e.md, section 4): its replicated
// components are E components (src/sim/railway-components.ts, RAIL_REPLICATED) and the server's world is its own
// projection (./replicate-world.ts). This is the client's side: the mirror writes each packet into a world of the same
// components and rebuilds today's `Railway` read model from it, so views keep reading what they read and prediction
// runs the server's systems on a clone of that world. Headless and pure.
//
//   RAIL_SCHEMAS                       the replicated components: tree, hardwood, rock, pile, account, job, qjob,
//                                      beam, forge, rail
//   createRailwayMirror()              client: { mirror, railway, world(), at(tick), synced(), hash(), ... }
//
// Timed things are not replicated as they run: a funded job sends its start tick, `ahead` (ticks of offline catch-up
// beyond start, so elapsed = tick - start + ahead) and, once complete, its end tick. The client derives elapsed, used
// and allocation at its estimate of the server tick (at), with the same arithmetic the rule tick uses, so laying, feed
// flights and the panel count advance smoothly without a packet per rule tick. Outcomes (the request history) stay on
// the server; a client learns its own through ack/rej.
import { createWorld, type AnyComponent } from '../ecs/index.ts';
import { createMirror } from './replicate-client.ts';
import { railJobs, type Railway } from '../sim/railway.ts';
import { LINE1_STATIONS } from '../sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../sim/railway-line2-layout.ts';
import { lineSchedule } from '../sim/railway-line-schedule.ts';
import type { RailJob } from '../sim/railway-line.ts';
import type { RailQJob } from '../sim/railway-line2.ts';
import { createRailwayWorld, Rail, RAIL_COMPONENTS, RAIL_REPLICATED } from '../sim/railway-components.ts';
import { refreshRailway } from '../sim/railway-read-model.ts';
import { railwayOf } from './railway-predict.ts';

export const RAIL_SCHEMAS = RAIL_REPLICATED;
const TIMING_KEYS = [
  'depositMs',
  'feedIntervalMs',
  'logFlightMs',
  'stoneFlightMs',
  'beamFlightMs',
  'cruiseCmPerTick',
  'departureTicks',
] as const;
type AnyJob = RailJob | Railway | RailQJob;
type Clock = {
  ahead: number;
  end: number;
  key: string;
  total: number;
  schedule: ReturnType<typeof lineSchedule> | null;
};

/** Client: the confirmed mirror, its world, and today's `Railway` shape rebuilt from it, for views and their pure
 * helpers. Until a whole state has arrived the read model is a fresh railway (actions wait for it anyway). */
export function createRailwayMirror() {
  const mirror = createMirror(RAIL_SCHEMAS);
  let world = createWorld(RAIL_COMPONENTS);
  const s = railwayOf(createRailwayWorld());
  const clocks: Clock[] = [...LINE1_STATIONS, ...LINE2_STATIONS].map(() => ({
    ahead: 0,
    end: -1,
    key: '',
    total: 0,
    schedule: null,
  }));
  let synced = false;
  let hashAt = -1,
    hashed = 0;
  // Each packet's changes go into the world: a replica keeps its server id, with this side's own bookkeeping
  // components at their defaults.
  for (const c of RAIL_SCHEMAS)
    mirror.onChange(c.kind, (rawId, f) => {
      const id = rawId as number;
      if (!f) {
        if (world.has(c, id)) world.despawn(id);
        return;
      }
      if (world.has(c, id)) Object.assign(world.mut(c, id)!, f);
      else {
        world.reserve(id);
        world.spawn([c, f], ...c.requires.map((r: AnyComponent) => [r, {}] as const));
      }
      if (c.kind === 'job' || c.kind === 'qjob') {
        const clock = clocks[(c.kind === 'job' ? 0 : LINE1_STATIONS.length) + (f.slot as number)];
        if (clock) Object.assign(clock, { ahead: f.ahead as number, end: f.end as number });
      }
    });
  // The read model follows the world: filled whole the first time it is whole, then patched from what each packet
  // changed. Until then the marks are dropped (nothing reads them).
  let filled = false;
  mirror.onPacket(() => {
    synced = mirror.whole();
    if (synced && world.count(Rail) === 1) {
      if (filled) refreshRailway(s, world);
      else railwayOf(world, s);
      filled = true;
    } else if (!filled) for (const c of RAIL_SCHEMAS) world.changes(c);
  });

  // elapsed, used and allocation of one job at tick, as the rule tick would leave them.
  function advance(
    job: AnyJob,
    c: Clock,
    station: (typeof LINE1_STATIONS)[number] | (typeof LINE2_STATIONS)[number],
    second: 'stone' | 'rails' | null,
    tick: number,
  ) {
    const bill = station.bill;
    const set = (used: number, usedSecond: number, done: boolean) => {
      job.used = used;
      job.allocation = done || job.start < 0 ? 0 : bill[0] - used;
      if (second === 'stone') {
        (job as RailJob).stoneUsed = usedSecond;
        (job as RailJob).stoneAllocation = done || job.start < 0 ? 0 : bill[1] - usedSecond;
      } else if (second === 'rails') {
        (job as RailQJob).railUsed = usedSecond;
        (job as RailQJob).railAllocation = done || job.start < 0 ? 0 : bill[1] - usedSecond;
      }
    };
    if (job.start < 0) {
      job.elapsed = 0;
      job.lastTick = 0;
      return set(0, 0, false);
    }
    const key = TIMING_KEYS.map((k) => job.timing![k]).join(',');
    if (c.key !== key || !c.schedule) {
      c.key = key;
      c.schedule = lineSchedule(station, job.timing!);
    }
    const sch = c.schedule;
    if (job.completion) {
      job.elapsed = sch.totalTicks;
      job.lastTick = c.end;
      return set(bill[0], second ? bill[1] : 0, true);
    }
    job.elapsed = Math.min(sch.totalTicks, Math.max(0, tick - job.start + c.ahead));
    job.lastTick = Math.max(job.start, tick);
    const laying = Math.max(0, job.elapsed - sch.depositTicks - sch.feedTicks);
    set(
      Math.min(bill[0], Math.floor((laying * bill[0]) / sch.layTicks)),
      second ? Math.min(bill[1], Math.floor((laying * bill[1]) / sch.layTicks)) : 0,
      false,
    );
  }

  return {
    mirror,
    railway: s,
    /** The mirror's world: the replicated components as sent, this side's bookkeeping at defaults. */
    world: () => world,
    /** Whether the whole state has arrived since the last reset. */
    synced: () => synced,
    /** A hash of every mirrored component (cached per packet): two peers at the same step agree on it. */
    hash() {
      if (hashAt === mirror.stats.applied) return hashed;
      let h = 2166136261;
      for (const schema of RAIL_SCHEMAS) {
        const rows = [...mirror.entries(schema.kind)].sort(([a], [b]) => (String(a) < String(b) ? -1 : 1));
        const text = JSON.stringify(rows.map(([id, f]) => [id, schema.names.map((n) => f[n])]));
        for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
      }
      hashAt = mirror.stats.applied;
      return (hashed = h >>> 0);
    },
    /** The server step the mirror is current to (-1 before a packet). */
    step: () => mirror.lastStep(),
    /** Bring every job's timed fields to the estimated server tick (views call it once per frame). `target` is this
     * mirror's railway or a copy of it (R1b's predicted state): the job clocks are the mirror's. */
    at(tick: number, target: Railway = s) {
      const jobs = railJobs(target);
      for (let k = 0; k < LINE1_STATIONS.length; k++)
        advance(jobs[k]!, clocks[k]!, LINE1_STATIONS[k]!, k > 0 ? 'stone' : null, tick);
      for (let k = 0; k < LINE2_STATIONS.length; k++)
        advance(target.line2!.jobs[k]!, clocks[LINE1_STATIONS.length + k]!, LINE2_STATIONS[k]!, 'rails', tick);
      return target;
    },
    /** A whole state is coming again (reconnect, resync): this one stays as it is, actions wait, until it has all
     * arrived and replaces it. */
    refill() {
      mirror.refill();
      synced = false;
    },
    reset() {
      mirror.reset();
      world = createWorld(RAIL_COMPONENTS);
      filled = false;
      s.piles = [];
      s.accounts = [];
      synced = false;
    },
  };
}
export type RailwayMirror = ReturnType<typeof createRailwayMirror>;
