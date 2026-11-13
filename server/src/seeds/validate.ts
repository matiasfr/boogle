// Validate a replacement/restore off the room thread, through the actual checkpoint loader.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore, type RoomDoc } from '../store.ts';
import { createRailwayWorldHost } from '../host/world-host.ts';
import { railwayRoomId } from '../../../src/world/railway-namespace.ts';
import type { SeedDoc } from './build.ts';

export type ValidatedSeed = { tick: number; hash: number };
export class SeedValidationBusyError extends Error {
  status = 429;
  constructor() {
    super('seed validation capacity reached');
  }
}
let active = 0;
export async function validateSeedDoc(doc: SeedDoc): Promise<ValidatedSeed> {
  if (active >= 2) throw new SeedValidationBusyError();
  active++;
  try {
    return await runWorker(doc);
  } finally {
    active--;
  }
}
function runWorker(doc: SeedDoc): Promise<ValidatedSeed> {
  const worker = new Worker(new URL('./validate.ts', import.meta.url), {
    workerData: doc,
    resourceLimits: { maxOldGenerationSizeMb: 192 },
  });
  return new Promise<ValidatedSeed>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('seed validation timed out')), 60_000);
    const finish = () => clearTimeout(timer);
    worker.once('message', (result: { value?: ValidatedSeed; error?: string }) => {
      finish();
      if (result.value) resolve(result.value);
      else reject(new Error(result.error ?? 'seed validation failed'));
    });
    worker.once('error', (error) => {
      finish();
      reject(error);
    });
    worker.once('exit', (code) => {
      finish();
      reject(new Error(`seed validator exited (${code})`));
    });
  }).finally(async () => {
    await worker.terminate();
  });
}

async function validate(doc: SeedDoc): Promise<ValidatedSeed> {
  if (!doc || !Number.isSafeInteger(doc.tick) || doc.tick < 0 || !doc.data || typeof doc.data !== 'object')
    throw new Error('invalid seed document');
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-validate-'));
  try {
    const roomId = railwayRoomId('validate');
    const store = createStore({ dataDir, maxRooms: 1 });
    await store.init();
    // Current time suppresses away credit: validation must read exactly the supplied checkpoint.
    const saved: RoomDoc = { ...doc, writerId: 'server', updatedAt: new Date().toISOString() };
    await store.write(roomId, saved);
    const host = createRailwayWorldHost({ roomId, store, tick: false });
    try {
      await host.whenReady();
      const status = host.status();
      if (!status.ready || status.badSave || status.recoveryError || status.tick !== doc.tick)
        throw new Error('seed checkpoint did not load cleanly');
      return { tick: status.tick, hash: host.sync.worldHash() };
    } finally {
      await host.close({ save: false });
    }
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
}

if (!isMainThread) {
  try {
    parentPort!.postMessage({ value: await validate(workerData as SeedDoc) });
  } catch (error) {
    parentPort!.postMessage({ error: String(error) });
  }
}
