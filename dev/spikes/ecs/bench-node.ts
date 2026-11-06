// node dev/spikes/ecs/bench-node.ts [--json]   (after `npm install` in dev/spikes/ecs)
import { runAll } from './bench.ts';

const r = runAll();
if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
else {
  console.table(
    r.timings.map((t) => ({
      ...t,
      ...Object.fromEntries(
        Object.entries(t).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 10) / 10 : v]),
      ),
    })),
  );
  console.table(r.determinism);
  console.log('same hashes across options:', r.crossOption, '| bitECS:', r.bitecs);
}
