// Real rail.jobClock, with both line-one and line-two component sets. No production imports this spike.
import { createWorld, defineSystem, type AnyComponent, type World } from '../../../src/ecs/index.ts';
import { Job, JobRun, QJob, QJobRun } from '../../../src/sim/railway-components.ts';
import { jobClock } from '../../../src/sim/railway-sys-core.ts';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const components = [Job, JobRun, QJob, QJobRun];
export type Factory = (components: readonly AnyComponent[], opts?: { audit?: boolean }) => World;
export const inhouse: Factory = createWorld;

export async function bitReference(): Promise<{ make: Factory; provenance: unknown }> {
  const dir = path.resolve('.look/becsy-model/reference');
  const moduleUrl = pathToFileURL(path.join(dir, 'world.ts')).href;
  const reference = (await import(moduleUrl)) as {
    createWorld: (c: readonly AnyComponent[], o: { audit?: boolean; store: 'bitecs' }) => World;
  };
  return {
    make: (c, opts) => reference.createWorld(c, { ...opts, store: 'bitecs' }),
    provenance: JSON.parse(fs.readFileSync(path.join(dir, 'provenance.json'), 'utf8')) as unknown,
  };
}

// Recorded upstream changes are an input fixture, not another ported railway system.
const input = defineSystem<number>(
  'spike.clockInput',
  { writes: [Job, JobRun, QJob, QJobRun], phase: 'input', order: 0 },
  (w, tick) => {
    for (const [job, run] of [
      [Job, JobRun],
      [QJob, QJobRun],
    ] as const) {
      for (const id of w.ids(job)) {
        const r = w.mut(run, id)!;
        r.lastTick = tick;
        if (id % 3) r.elapsed++;
        if (tick % 13 === 0) w.mut(job, id)!.completion = tick;
      }
    }
  },
);

export function jobSlice(make: Factory, n: number, audit = false) {
  const w = make(components, { audit });
  for (let i = 0; i < n; i++) {
    const [job, run] = i % 2 ? [Job, JobRun] : [QJob, QJobRun];
    w.spawn([job, { slot: i, start: i % 3 ? 0 : -1 }], [run, { elapsed: i % 9, lastTick: 0 }]);
  }
  return {
    w,
    input: (tick: number) => w.run(input, tick),
    tick: () => w.run(jobClock, undefined),
    drain: () => components.filter((c) => c.track).forEach((c) => w.changes(c)),
  };
}
