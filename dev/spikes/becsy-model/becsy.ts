// An isolated native Becsy model. Scalar schemas and explicit access; no decorator transform or production switch.
import type * as Becsy from '@lastolivegames/becsy/lib/index.js';
import { TUNABLES, createTune, okTune, type Tune, type TuneKey } from '../../../src/sim/tune.ts';
import { ROUTE, TRACK, HELPER } from '../../../src/sim/route.ts';
import type { Sites } from '../../../src/sim/sites.ts';
import { Job, JobRun, QJob, QJobRun } from '../../../src/sim/railway-components.ts';
import type { World as EWorld } from '../../../src/ecs/index.ts';

export type Command = {
  op: 'tune.set' | 'tune.commit';
  key: string;
  v: number;
  expectedRevision?: number;
  requestId?: string;
};
export type TuneContext = { protoRoom: boolean; controller: boolean; sites: Sites };
export type JobRow = { id: number; line: number; job: Record<string, number>; run: Record<string, number> };
export type Projection = { tune: Tune; jobs: JobRow[] };

export async function runtime(perf = false): Promise<typeof Becsy> {
  // The perf entry has no .d.ts; its exports match index. Literal paths also let Vite/esbuild find both builds.
  return (
    perf
      ? await import('@lastolivegames/becsy/lib/perf.js' as string)
      : await import('@lastolivegames/becsy/lib/index.js')
  ) as typeof Becsy;
}

export function projectJobs(w: EWorld): JobRow[] {
  const out: JobRow[] = [];
  for (const [line, job, run] of [
    [1, Job, JobRun],
    [2, QJob, QJobRun],
  ] as const)
    for (const id of w.ids(job)) out.push({ id, line, job: { ...w.get(job, id)! }, run: { ...w.get(run, id)! } });
  return out.sort((a, b) => a.id - b.id);
}

function fits(sites: Sites, key: string, v: number): boolean {
  if (key === 'cost0') {
    const x = sites.list[sites.open];
    return !x || ROUTE[sites.open]!.age !== 0 || (x.t0 < 0 && v >= x.stock[TRACK]);
  }
  if (key === 'helper0')
    return sites.list.every(
      (x, s) => ROUTE[s]!.age !== 0 || (x.helpers || s < sites.open ? v >= x.stock[HELPER] : v > x.stock[HELPER]),
    );
  return true;
}

export async function createBecsySlice(
  initialJobs: JobRow[],
  options: { perf?: boolean; inspect?: boolean; tune?: Tune } = {},
) {
  const { World, System, Type } = await runtime(options.perf);
  // Becsy binds component classes to a world. Define fresh classes for each room, not shared global decorators.
  function numeric(names: readonly string[]) {
    return class {
      static schema = Object.fromEntries(names.map((name) => [name, Type.float64]));
      [key: string]: number;
    };
  }
  const Values = numeric(TUNABLES.map((t) => t.key));
  const Revision = numeric(['revision', 'rev']);
  const Identity = numeric(['id']);
  const Job1 = numeric(Job.names),
    Run1 = numeric(JobRun.names);
  const Job2 = numeric(QJob.names),
    Run2 = numeric(QJobRun.names);
  const tune = options.tune ?? createTune();
  let inputTick: number | null = null;
  let pending: { command: Command; phase: 'admit' | 'apply'; context: TuneContext } | null = null;
  let result: unknown;
  let projection: Projection = { tune: structuredClone(tune), jobs: structuredClone(initialJobs) };

  class Inputs extends System {
    one = this.query((q) =>
      q.current
        .with(Identity)
        .read.with(Job1, Run1)
        .write.orderBy((e) => e.read(Identity).id!),
    );
    two = this.query((q) =>
      q.current
        .with(Identity)
        .read.with(Job2, Run2)
        .write.orderBy((e) => e.read(Identity).id!),
    );
    order = this.schedule((s) => s.before(TuneCommands));
    override execute() {
      if (inputTick === null) return;
      for (const [query, job, run] of [
        [this.one, Job1, Run1],
        [this.two, Job2, Run2],
      ] as const) {
        for (const e of query.current) {
          const r = e.write(run);
          r.lastTick = inputTick;
          if (e.read(Identity).id! % 3) r.elapsed!++;
          if (inputTick % 13 === 0) e.write(job).completion = inputTick;
        }
      }
      inputTick = null;
    }
  }
  class TuneCommands extends System {
    state = this.query((q) => q.current.with(Values, Revision).write);
    order = this.schedule((s) => s.after(Inputs).before(JobClock));
    override execute() {
      if (!pending) return;
      const { command: c, context, phase } = pending;
      pending = null;
      const e = this.state.current[0]!;
      const revision = e.read(Revision).revision!;
      const valid = okTune(c.key, c.v) && fits(context.sites, c.key, c.v);
      if (phase === 'admit') {
        result =
          context.protoRoom &&
          context.controller &&
          valid &&
          (c.op === 'tune.set' ||
            (typeof c.requestId === 'string' &&
              c.requestId.length > 0 &&
              c.requestId.length <= 80 &&
              c.expectedRevision === revision));
        return;
      }
      if (!valid || (c.op === 'tune.commit' && c.expectedRevision !== revision)) {
        result = c.op === 'tune.set' ? null : { requestId: c.requestId, status: 'rejected', revision };
        return;
      }
      e.write(Values)[c.key as TuneKey] = c.v;
      const rev = e.write(Revision);
      rev.revision!++;
      rev.rev!++;
      result =
        c.op === 'tune.set'
          ? { key: c.key, v: c.v }
          : { requestId: c.requestId, status: 'applied', key: c.key, v: c.v, revision: rev.revision };
    }
  }
  class JobClock extends System {
    one = this.query((q) =>
      q.current
        .with(Identity, Run1)
        .read.with(Job1)
        .write.orderBy((e) => e.read(Identity).id!),
    );
    two = this.query((q) =>
      q.current
        .with(Identity, Run2)
        .read.with(Job2)
        .write.orderBy((e) => e.read(Identity).id!),
    );
    order = this.schedule((s) => s.after(TuneCommands).before(Inspect));
    override execute() {
      for (const [query, job, run] of [
        [this.one, Job1, Run1],
        [this.two, Job2, Run2],
      ] as const) {
        for (const e of query.current) {
          const j = e.read(job),
            r = e.read(run);
          const ahead = j.start! >= 0 ? r.elapsed! - (r.lastTick! - j.start!) : 0;
          const end = j.completion ? r.lastTick! : -1;
          if (j.ahead !== ahead || j.end !== end) Object.assign(e.write(job), { ahead, end });
        }
      }
    }
  }
  const copy = (r: Readonly<Record<string, number>>, names: readonly string[]) =>
    Object.fromEntries(names.map((name) => [name, r[name]!]));
  class Inspect extends System {
    state = this.query((q) => q.current.with(Values, Revision).read);
    one = this.query((q) => q.current.with(Identity, Job1, Run1).read);
    two = this.query((q) => q.current.with(Identity, Job2, Run2).read);
    order = this.schedule((s) => s.after(JobClock));
    override execute() {
      if (options.inspect === false) return;
      const e = this.state.current[0]!;
      const rev = e.read(Revision);
      projection = {
        tune: {
          v: copy(
            e.read(Values),
            TUNABLES.map((t) => t.key),
          ) as Tune['v'],
          revision: rev.revision!,
          rev: rev.rev!,
        },
        jobs: [],
      };
      for (const [query, line, job, run, jobNames, runNames] of [
        [this.one, 1, Job1, Run1, Job.names, JobRun.names],
        [this.two, 2, Job2, Run2, QJob.names, QJobRun.names],
      ] as const)
        for (const entity of query.current)
          projection.jobs.push({
            id: entity.read(Identity).id!,
            line,
            job: copy(entity.read(job), jobNames),
            run: copy(entity.read(run), runNames),
          });
      projection.jobs.sort((a, b) => a.id - b.id);
    }
  }
  const world = await World.create({
    defs: [Values, Revision, Identity, Job1, Run1, Job2, Run2, Inputs, TuneCommands, JobClock, Inspect],
    maxEntities: initialJobs.length + 16,
    maxShapeChangesPerFrame: initialJobs.length * 5 + 64,
    maxWritesPerFrame: initialJobs.length * 4 + 64,
  });
  world.createEntity(Values, tune.v, Revision, { revision: tune.revision, rev: tune.rev });
  for (const row of initialJobs)
    world.createEntity(
      Identity,
      { id: row.id },
      row.line === 1 ? Job1 : Job2,
      row.job,
      row.line === 1 ? Run1 : Run2,
      row.run,
    );
  return {
    input(tick: number) {
      inputTick = tick;
    },
    tick: () => world.execute(0, 0.1),
    async command(command: Command, phase: 'admit' | 'apply', context: TuneContext) {
      pending = { command, phase, context };
      await world.execute(0, 0.1);
      return result;
    },
    read: () => structuredClone(projection),
    stop: () => world.terminate(),
  };
}
