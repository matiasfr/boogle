// Bounded t1v02 upgrade: original railway-v0 or accepted supply-v1 with override-only tune-v0.
// Never resets the room or writes the old file; no other legacy profile is admitted here.
// The frozen verifier runs the ordinary recovery guards (registry, checksum, hash, tail); the live host then
// verifies the upgraded envelope again and atomically persists it before becoming ready.
import { createSync, type RecoveryEnvelope } from '../../../src/world/sync.ts';
import { createSync as createFrozenSync } from '../legacy/world/sync-v0.ts';
import { installPlayableRailwayV0 } from '../../../src/world/rules/railway-v0-index.ts';
import { installPlayableRailwaySupplyV1 } from '../../../src/world/rules/railway-supply-v1-index.ts';
import { installPlayableRailwayRules } from '../../../src/world/rules/railway-index.ts';
import type { Land } from '../../../src/world/rules/types.ts';
import { verifyRailwayV0Code } from './railway-v0-code.ts';
import * as tuneV0 from '../../../src/sim/tune-v0.ts';
import * as tuneSupplyV1 from '../../../src/sim/tune-supply-v1.ts';

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export async function migratePlayableRailwayV0(raw: unknown, land: Land): Promise<RecoveryEnvelope | undefined> {
  if (
    !object(raw) ||
    raw.namespace !== 't1v02' ||
    !object(raw.checkpoint) ||
    !object(raw.checkpoint.vers) ||
    raw.checkpoint.vers.tune !== 0 ||
    (raw.checkpoint.vers.railway !== 0 && raw.checkpoint.vers.railway !== 1)
  )
    return;
  await verifyRailwayV0Code();
  const old = createFrozenSync();
  if (raw.checkpoint.vers.railway === 0) installPlayableRailwayV0(old, land);
  else installPlayableRailwaySupplyV1(old, land);
  let verified: RecoveryEnvelope | undefined;
  old.attachWorld(
    { selfId: 'server', send() {}, onMessage: () => () => {}, onConnection: (fn) => (fn(true), () => {}) },
    {
      roomId: 't1v02-migration-verifier',
      host: true,
      recovery: {
        namespace: 't1v02',
        catalog: '1',
        read: () => raw,
        write: (envelope) => {
          verified = envelope;
          return Promise.resolve();
        },
      },
    },
  );
  await old.whenDurable();
  if (!verified || verified.tail.length || !old.worldStatus().ready) throw new Error('T1 v0 recovery did not verify');

  // The old hash omitted defaults. Preserve their frozen effective values only AFTER verification,
  // so a later default change cannot silently reinterpret an accepted old room. Newly added keys
  // in the original eight-key profile still receive the explicitly authorized current defaults.
  const checkpoint = structuredClone(verified.checkpoint);
  if (raw.checkpoint.vers.railway === 0) {
    const tuning = tuneV0.createTune();
    tuneV0.loadTune(tuning, checkpoint.data.tune);
    checkpoint.data.tune = { ...tuning.v };
  } else {
    const tuning = tuneSupplyV1.createTune();
    tuneSupplyV1.loadTune(tuning, checkpoint.data.tune);
    checkpoint.data.tune = { ...tuning.v };
  }
  const next = createSync();
  installPlayableRailwayRules(next, land);
  if (next.snapshot().vers.railway !== 1 || next.snapshot().vers.tune !== 2)
    throw new Error('unsupported T1 migration destination');
  // Only now may the versioned loaders add missing supply and the complete current tuning profile.
  if (!next.loadSnapshot(checkpoint) || next.worldStatus().loadErrors || next.worldStatus().newerSave)
    throw new Error('T1 v0 supply upgrade failed');
  const body: Omit<RecoveryEnvelope, 'checksum'> = {
    version: 1,
    namespace: 't1v02',
    catalog: '1',
    checkpoint: next.snapshot(),
    hash: next.worldHash(),
    tail: [],
    seq: verified.seq,
  };
  // Frozen recovery-envelope v1 FNV-1a rule from sync.ts at 3e37f124.
  const text = JSON.stringify(body);
  let checksum = 2166136261;
  for (let i = 0; i < text.length; i++) checksum = Math.imul(checksum ^ text.charCodeAt(i), 16777619) >>> 0;
  return { ...body, checksum };
}
