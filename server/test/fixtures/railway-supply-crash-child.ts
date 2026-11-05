// The parent kills this process at a real accepted-supply durability boundary; never close gracefully.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { supplyFixture } from './railway-supply-fixture.ts';

const [dataDir, roomId, boundary] = process.argv.slice(2);
if (!dataDir || !roomId || !['published', 'replacement'].includes(boundary ?? ''))
  throw new Error('bad supply crash fixture arguments');
const f = await supplyFixture(dataDir, roomId);
await f.toStage(34);
f.host.sync.saveNow(true);
await f.host.sync.whenDurable();
const before = f.host.rules.railway.counts();
const prior = f.published.length;
f.advance(1);
await f.ticks(1);
assert.equal(f.stage(), 34, 'maturity stamp published before application');
assert.equal(f.published.length, prior + 1);
assert.equal(f.published.at(-1)?.op, 'rail.supply');
assert.equal(before.rack, 10);
assert.equal(before.produced, 0);
async function announce(extra: Record<string, unknown> = {}) {
  await new Promise<void>((resolve, reject) => {
    if (!process.send) throw new Error('supply crash fixture requires IPC');
    process.send({ roomId, boundary, before, now: f.now(), published: f.published.at(-1), ...extra }, (error) =>
      error ? reject(error) : resolve(),
    );
  });
}
if (boundary === 'replacement') {
  const rename = fs.rename;
  fs.rename = async (from, to) => {
    if (to === path.join(dataDir, `${roomId}.json`)) {
      await announce({ temporary: String(from) });
      await new Promise<void>(() => {});
    }
    await rename(from, to);
  };
  f.host.sync.saveNow(true);
  await f.host.sync.whenDurable();
} else await announce();
await new Promise<void>(() => {});
