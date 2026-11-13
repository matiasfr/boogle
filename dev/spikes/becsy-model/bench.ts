// Node-only slice cost; no renderer or server transport. Same input trace, sequential execution and awaits.
import { cpus, loadavg, platform, arch } from 'node:os';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { bitReference, inhouse, jobSlice } from './baseline.ts';
import { createBecsySlice, projectJobs } from './becsy.ts';

const bit = await bitReference();
const before = loadavg();
const rows: {
  backend: string;
  workload: string;
  entities: number;
  samplesUs: number[];
  medianUs: number;
  minUs: number;
  maxUs: number;
}[] = [];
for (const n of [300, 3000]) {
  for (const workload of ['settled', 'active']) {
    for (const backend of ['inhouse', 'bitecs facade', 'Becsy checked', 'Becsy perf']) {
      const reference = jobSlice(backend === 'bitecs facade' ? bit.make : inhouse, n);
      const model = backend.startsWith('Becsy')
        ? await createBecsySlice(projectJobs(reference.w), { perf: backend === 'Becsy perf', inspect: false })
        : null;
      const tick = async () => {
        if (model) await model.tick();
        else reference.tick();
      };
      const input = model ? (t: number) => model.input(t) : (t: number) => reference.input(t);
      const samplesUs: number[] = [];
      let step = 0;
      // Five warmup batches, fifteen measured. Drain marks outside each batch, equally for both E stores.
      // Active includes the identical recorded upstream input fixture; settled only runs jobClock/scheduling.
      for (let batch = -5; batch < 15; batch++) {
        const start = performance.now();
        for (let i = 0; i < 100; i++) {
          if (workload === 'active') input(++step);
          await tick();
        }
        const us = (performance.now() - start) * 10;
        if (!model) reference.drain();
        if (batch >= 0) samplesUs.push(us);
      }
      await model?.stop();
      const sorted = [...samplesUs].sort((a, b) => a - b);
      rows.push({
        backend,
        workload,
        entities: n,
        samplesUs,
        medianUs: sorted[7]!,
        minUs: sorted[0]!,
        maxUs: sorted.at(-1)!,
      });
    }
  }
}
const evidence = {
  date: new Date().toISOString(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  status: execFileSync('git', ['status', '--short'], { encoding: 'utf8' }),
  node: process.version,
  platform: platform(),
  arch: arch(),
  cpu: cpus()[0]?.model,
  loadBefore: before,
  loadAfter: loadavg(),
  reference: bit.provenance,
  method:
    '5 warmup + 15 measured batches of 100 ticks; audit off for E; active includes upstream input; settled includes no input; no projection/hash/network; Becsy includes idle tune system and declared schedule',
  rows,
};
fs.mkdirSync('.look/becsy-model', { recursive: true });
fs.writeFileSync('.look/becsy-model/bench.json', JSON.stringify(evidence, null, 2));
console.table(
  rows.map((row) => ({
    backend: row.backend,
    workload: row.workload,
    entities: row.entities,
    medianUs: row.medianUs,
    minUs: row.minUs,
    maxUs: row.maxUs,
  })),
);
console.log('load before/after', before, loadavg());
