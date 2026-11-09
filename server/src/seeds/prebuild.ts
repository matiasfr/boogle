// node server/src/seeds/prebuild.ts [--out server/seeds] [stage ...]: builds the jump-in seeds at image build time
// (server/Dockerfile), so the production VM never runs a ~5 s build on its room thread (docs/plans/playtest-jump-in.md).
// Writes <out>/<stage>.json ({ tick, data }) for each stage (default: every offered jump-in) and <out>/manifest.json
// ({ ns, stages }) last; the server ignores a manifest whose ns is not its own RAILWAY_PLAY_NS.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSeedDoc } from './build.ts';
import { isSeedStage, type SeedStage } from '../../../src/sim/railway-seeds.ts';
import { RAILWAY_PLAY_NS } from '../../../src/world/railway-namespace.ts';
import { OFFERED_STAGES } from '../../../src/world/railway-jump.ts';

export type SeedManifest = { ns: string; stages: SeedStage[] };

export async function prebuild(out: string, stages: readonly SeedStage[]) {
  await fs.mkdir(out, { recursive: true });
  for (const stage of stages) {
    const started = Date.now();
    const doc = await buildSeedDoc(stage);
    await fs.writeFile(path.join(out, `${stage}.json`), JSON.stringify(doc));
    console.log(`seed ${stage.padEnd(14)} ${((Date.now() - started) / 1000).toFixed(1)} s`);
  }
  const manifest: SeedManifest = { ns: RAILWAY_PLAY_NS, stages: [...stages] };
  await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest));
  console.log(`${stages.length} seeds for ${RAILWAY_PLAY_NS} in ${out}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--out');
  const out = at >= 0 ? args[at + 1] : 'server/seeds';
  if (!out || out.startsWith('--')) throw new Error('--out needs a directory');
  const named = args.filter((a, i) => !a.startsWith('--') && (at < 0 || i !== at + 1));
  const bad = named.filter((s) => !isSeedStage(s));
  if (bad.length) throw new Error(`Unknown railway seed: ${bad.join(', ')}`);
  await prebuild(out, named.length ? (named as SeedStage[]) : OFFERED_STAGES);
}
