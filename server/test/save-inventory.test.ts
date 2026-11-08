import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { classify, inventorySaves, assertNotCurrent } from '../src/save-inventory.ts';

const ns = { world: 'v19', rail: 'rail-v19' };
const now = Date.UTC(2026, 10, 8);
const old = now - 40 * 86_400_000;
const hash = (files: string[]) => crypto.createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 16);

test('classify separates current, old railway/classic, legacy, temps, directories and unknowns', () => {
  for (const name of ['v19-a.json', 'rail-v19-b.json', 'v19-v18-nested.json']) {
    assert.equal(classify(name, ns), 'current');
    assert.throws(() => assertNotCurrent(name, ns), /Current world save/);
  }
  assert.throws(() => assertNotCurrent('rail-v19-x.json', ns));
  for (const name of ['v18-c.json', 'rail-v17-d.json']) {
    assert.equal(classify(name, ns), 'old-ns');
    assert.doesNotThrow(() => assertNotCurrent(name, ns));
  }
  for (const name of ['garden-1.json', 't1v01-room.json']) assert.equal(classify(name, ns), 'legacy');
  assert.equal(classify('rail-v19-b.json.123.abcdef01.tmp', ns), 'tmp');
  for (const name of ['reports', 'playdata', 'reviews', '.trash']) assert.equal(classify(name, ns), 'dir');
  for (const name of ['notes.txt', '../v18-a.json', 'v18-a.json.12.xyz.tmp', 'V18-a.json', 'a'.repeat(33) + '.json'])
    assert.equal(classify(name, ns), 'unknown');
});

test('inventory measures without reading contents, keeps idle current rooms and hashes exact sorted lists', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-inventory-'));
  const files: Record<string, string> = {
    'v19-a.json': 'current',
    'rail-v19-b.json': 'rail current',
    'v19-v18-nested.json': 'nested',
    'v18-c.json': 'classic old',
    'v18-e.json': 'newest old',
    'rail-v17-d.json': 'rail old',
    'garden-1.json': 'legacy',
    't1v01-room.json': 'removed spine',
    'v18-c.json.123.abcdef01.tmp': 'old temp',
    'v19-a.json.456.123456ab.tmp': 'fresh temp',
    'reports/x.jsonl': 'report',
    'reviews/r/card.json': 'review',
    'playdata/x.jsonl': 'play',
    '.trash/old/save.json': 'trash',
    'notes.txt': 'unknown',
  };
  try {
    for (const [name, text] of Object.entries(files)) {
      const file = path.join(dir, name);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, text); // Deliberately not valid JSON: inventory never parses saves.
      const time = new Date(name === 'v19-a.json.456.123456ab.tmp' || name === 'v18-e.json' ? now : old);
      await fs.utimes(file, time, time);
    }
    const inv = await inventorySaves(dir, { ns, now });
    assert.equal(inv.ns, 'v19');
    assert.equal(inv.rail, 'rail-v19');
    assert.deepEqual(inv.current, { count: 3, bytes: 25, idle: { count: 3, bytes: 25 } });
    assert.deepEqual(inv.candidates.oldNs, {
      'rail-v17': { count: 1, bytes: 8, newest: new Date(old).toISOString() },
      v18: { count: 2, bytes: 21, newest: new Date(now).toISOString() },
    });
    assert.deepEqual(inv.candidates.legacy, { count: 2, bytes: 19 });
    assert.deepEqual(inv.candidates.tmp, { count: 1, bytes: 8 });
    assert.deepEqual(inv.dirs, { '.trash': 5, playdata: 4, reports: 6, reviews: 6 });
    assert.deepEqual(inv.unknown, ['notes.txt']);
    assert.deepEqual(inv.files, ['rail-v17-d.json', 'v18-c.json', 'v18-c.json.123.abcdef01.tmp', 'v18-e.json']);
    assert.deepEqual(inv.legacyFiles, ['garden-1.json', 't1v01-room.json']);
    assert.equal(inv.digest, hash(inv.files));
    assert.equal(inv.digestWithLegacy, hash([...inv.files, ...inv.legacyFiles].sort()));
    assert.equal((await inventorySaves(dir, { ns, now })).digest, inv.digest);
    for (const [name, text] of Object.entries(files))
      assert.equal(await fs.readFile(path.join(dir, name), 'utf8'), text);
    await fs.writeFile(path.join(dir, 'another-legacy.json'), 'x');
    const legacyAdded = await inventorySaves(dir, { ns, now });
    assert.equal(legacyAdded.digest, inv.digest);
    assert.notEqual(legacyAdded.digestWithLegacy, inv.digestWithLegacy);
    await fs.writeFile(path.join(dir, 'v16-new.json'), 'x');
    assert.notEqual((await inventorySaves(dir, { ns, now })).digest, inv.digest);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('inventory reports symlinks and unrecognized directories without following them', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-inventory-'));
  try {
    await fs.mkdir(path.join(dir, 'notes'));
    await fs.mkdir(path.join(dir, 'reviews'));
    await fs.writeFile(path.join(dir, 'notes/keep'), 'untouched');
    await fs.symlink(path.join(dir, 'notes/keep'), path.join(dir, 'v18-link.json'));
    await fs.symlink(dir, path.join(dir, 'reviews/loop'));
    const inv = await inventorySaves(dir, { ns, now });
    assert.deepEqual(inv.files, []);
    assert.deepEqual(inv.unknown, ['notes', 'v18-link.json']);
    assert.deepEqual(inv.dirs, { reviews: 0 });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
