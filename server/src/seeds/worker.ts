// Builds one jump-in seed off the room-host thread (../jump.ts runs one at a time, capped in memory and time). Posts
// { ok: true, doc } or { ok: false, error }; the caller writes nothing on an error.
import { parentPort, workerData } from 'node:worker_threads';
import { buildSeedDoc } from './build.ts';
import { isSeedStage } from '../../../src/sim/railway-seeds.ts';

const stage = String((workerData as { stage?: unknown } | null)?.stage);
try {
  if (!isSeedStage(stage)) throw new Error(`Unknown railway seed: ${stage}`);
  parentPort!.postMessage({ ok: true, doc: await buildSeedDoc(stage) });
} catch (error) {
  parentPort!.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
}
