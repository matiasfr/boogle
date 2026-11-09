import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { cleanupSaves, cleanupLine } from '../src/save-cleanup.ts';
import { inventorySaves } from '../src/save-inventory.ts';
import { createStore } from '../src/store.ts';
import { createService, loadConfig } from '../src/server.ts';
import { WORLD_NS } from '../../src/world/namespace.ts';
import { RAILWAY_PLAY_NS } from '../../src/world/railway-namespace.ts';

const ns = { world: WORLD_NS, rail: RAILWAY_PLAY_NS };
const now = Date.UTC(2026, 10, 8);
const day = 86_400_000;
const stamp = (days: number) => new Date(now - days * day).toISOString();
async function put(dir: string, name: string, text = 'data', age = 2 * day) {
  const file = path.join(dir, name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, text);
  await fs.utimes(file, new Date(now - age), new Date(now - age));
}
async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-cleanup-'));
  const store = createStore({ dataDir: dir, maxRooms: 6 });
  return { dir, store, inventory: () => inventorySaves(dir, { ns, now }) };
}

test('cleanup moves exactly old-world, legacy and stale temp saves, manifests them, and frees room capacity', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.dir, { recursive: true, force: true }));
  const keep = [
    `${ns.world}-a.json`,
    `${ns.rail}-b.json`,
    `${ns.world}-v01-nested.json`,
    `${ns.rail}-b.json.12.abcdef01.tmp`,
    'v01-fresh.json.34.012345ab.tmp',
    'notes.txt',
    'reports/x.jsonl',
    'playdata/x.jsonl',
    'reviews/r/card.json',
  ];
  for (const name of keep) await put(f.dir, name, `keep:${name}`, name.includes('fresh') ? 0 : 40 * day);
  const moved = ['garden-1.json', 'rail-v02-old.json', 'v01-old.json', 'v01-old.json.12.abcdef01.tmp'];
  for (const name of moved) await put(f.dir, name, `move:${name}`);
  await put(f.dir, `.trash/${stamp(8)}/v01-expired.json`);
  await put(f.dir, `.trash/${stamp(6)}/v01-newer.json`);
  await put(f.dir, `.trash/${stamp(7)}/v01-boundary.json`);
  await f.store.init();
  assert.equal(f.store.count(), 6);
  const inv = await f.inventory();
  assert.ok(!inv.files.includes(`${ns.rail}-b.json.12.abcdef01.tmp`), 'even stale current temps stay');
  const result = await cleanupSaves(f.dir, inv, f.store, { now });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    result.moved.map((file) => file.name),
    moved,
  );
  assert.deepEqual(result.unknown, ['notes.txt']);
  assert.deepEqual(result.purged, [`.trash/${stamp(8)}`]);
  assert.equal(f.store.count(), 3);
  for (const name of keep) assert.equal(await fs.readFile(path.join(f.dir, name), 'utf8'), `keep:${name}`);
  for (const name of moved) {
    await assert.rejects(fs.stat(path.join(f.dir, name)), { code: 'ENOENT' });
    assert.equal(await fs.readFile(path.join(f.dir, result.trash!, name), 'utf8'), `move:${name}`);
  }
  const manifest = JSON.parse(await fs.readFile(path.join(f.dir, result.trash!, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest, {
    at: new Date(now).toISOString(),
    ns: ns.world,
    rail: ns.rail,
    files: moved.map((name) => ({
      name,
      bytes: Buffer.byteLength(`move:${name}`),
      reason: name.endsWith('.tmp') ? 'tmp' : name.startsWith('garden') ? 'legacy' : 'old-ns',
    })),
  });
  assert.deepEqual((await fs.readdir(path.join(f.dir, result.trash!))).sort(), [...moved, 'manifest.json'].sort());
  assert.ok(await fs.stat(path.join(f.dir, `.trash/${stamp(6)}`)));
  assert.ok(await fs.stat(path.join(f.dir, `.trash/${stamp(7)}`)));
  assert.equal(
    (await f.store.write(`${ns.world}-new`, { tick: 1, writerId: 'server', data: {}, updatedAt: '' })).status,
    200,
  );
  const before = await fs.readdir(path.join(f.dir, '.trash'));
  const again = await cleanupSaves(f.dir, await f.inventory(), f.store, { now });
  assert.deepEqual(again.moved, []);
  assert.deepEqual(again.purged, []);
  assert.equal(again.trash, null);
  assert.deepEqual(await fs.readdir(path.join(f.dir, '.trash')), before);
  // The exact seven-day boundary becomes eligible only once it is strictly older.
  const third = await cleanupSaves(f.dir, await f.inventory(), f.store, { now: now + 1 });
  assert.deepEqual(third.moved, []);
  assert.deepEqual(third.purged, [`.trash/${stamp(7)}`]);
  assert.match(cleanupLine(result), /moved 4 .*old-ns 2, legacy 1, tmp 1/);
  assert.match(cleanupLine(result), /unknown 1 \["notes.txt"\]/);
});

test('writer locks recheck live rooms and file type, and do not accept forged current candidates', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.dir, { recursive: true, force: true }));
  await put(f.dir, 'v01-live.json');
  await put(f.dir, 'v01-live.json.12.abcdef01.tmp');
  await put(f.dir, 'v01-swap.json');
  await put(f.dir, 'v01-fresh.json.12.abcdef01.tmp');
  await put(f.dir, `${ns.world}-a.json`);
  await put(f.dir, `${ns.rail}-a.json.12.abcdef01.tmp`);
  await f.store.init();
  const inv = await f.inventory();
  inv.files.push(`${ns.world}-a.json`, `${ns.rail}-a.json.12.abcdef01.tmp`, '../outside.json');
  await fs.unlink(path.join(f.dir, 'v01-swap.json'));
  await fs.symlink(path.join(f.dir, `${ns.world}-a.json`), path.join(f.dir, 'v01-swap.json'));
  await put(f.dir, 'v01-fresh.json.12.abcdef01.tmp', 'fresh', 0);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const held = f.store.withLock('v01-live', () => gate);
  let live = false;
  const pending = cleanupSaves(f.dir, inv, f.store, { now, isLive: (id) => live && id === 'v01-live' });
  live = true;
  release();
  await held;
  const result = await pending;
  assert.deepEqual(result.moved, []);
  assert.deepEqual(result.errors, []);
  assert.ok(result.skipped.some((file) => file.name === 'v01-live.json' && file.reason === 'live'));
  assert.ok(result.skipped.some((file) => file.reason === 'fresh temp'));
  assert.ok(result.unknown.includes('v01-swap.json'));
  assert.equal(await fs.readFile(path.join(f.dir, 'v01-live.json'), 'utf8'), 'data');
  assert.equal(await fs.readFile(path.join(f.dir, `${ns.world}-a.json`), 'utf8'), 'data');
  assert.equal(await fs.readFile(path.join(f.dir, `${ns.rail}-a.json.12.abcdef01.tmp`), 'utf8'), 'data');
  await assert.rejects(fs.stat(path.join(f.dir, '.trash')), { code: 'ENOENT' });
});

test('purging preserves current/live files, unknown entries and symlinks in trash', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.dir, { recursive: true, force: true }));
  const rows = [
    [9, `${ns.world}-a.json`],
    [10, 'v01-live.json'],
    [11, 'notes.txt'],
  ] as const;
  for (const [age, name] of rows) await put(f.dir, `.trash/${stamp(age)}/${name}`);
  await put(f.dir, '.trash/unknown-folder/notes.txt');
  await fs.symlink(path.join(f.dir, '.trash/unknown-folder'), path.join(f.dir, '.trash', stamp(12)));
  await f.store.init();
  const result = await cleanupSaves(f.dir, await f.inventory(), f.store, { now, isLive: (id) => id === 'v01-live' });
  assert.deepEqual(result.purged, []);
  for (const [age, name] of rows)
    assert.equal(await fs.readFile(path.join(f.dir, `.trash/${stamp(age)}/${name}`), 'utf8'), 'data');
  assert.equal(result.skipped.length, 2);
  assert.equal(result.unknown.length, 3);
});

test('kill switch disables moves and purge; a symlinked trash root cannot redirect cleanup', async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.dir, { recursive: true, force: true }));
  await put(f.dir, 'v01-old.json');
  await put(f.dir, `.trash/${stamp(8)}/v01-archive.json`);
  await f.store.init();
  const disabled = await cleanupSaves(f.dir, await f.inventory(), f.store, { now, enabled: false });
  assert.equal(disabled.enabled, false);
  assert.deepEqual(disabled.moved, []);
  assert.deepEqual(disabled.purged, []);
  assert.ok(await fs.stat(path.join(f.dir, `.trash/${stamp(8)}/v01-archive.json`)));
  await fs.rename(path.join(f.dir, '.trash'), path.join(f.dir, 'outside'));
  await fs.symlink(path.join(f.dir, 'outside'), path.join(f.dir, '.trash'));
  const result = await cleanupSaves(f.dir, await f.inventory(), f.store, { now });
  assert.deepEqual(result.moved, []);
  assert.equal(result.errors.length, 1);
  assert.equal(await fs.readFile(path.join(f.dir, 'v01-old.json'), 'utf8'), 'data');
  assert.ok(await fs.stat(path.join(f.dir, `outside/${stamp(8)}/v01-archive.json`)));
});

test('default service boot cleans before hosting, exposes the last cleanup and is a no-op on the next boot', async (t) => {
  const f = await fixture();
  const expired = new Date(Date.now() - 8 * day).toISOString();
  const newer = new Date(Date.now() - 6 * day).toISOString();
  const current = [`${ns.world}-a.json`, `${ns.rail}-b.json`, `${ns.world}-a.json.12.abcdef01.tmp`];
  for (const name of current) await put(f.dir, name, `keep:${name}`);
  const candidates = ['garden.json', 'rail-v02-old.json', 'v01-old.json', 'v01-old.json.12.abcdef01.tmp'];
  for (const name of candidates) await put(f.dir, name, `move:${name}`);
  await put(f.dir, 'v01-fresh.json.12.abcdef01.tmp');
  await fs.utimes(path.join(f.dir, 'v01-fresh.json.12.abcdef01.tmp'), new Date(), new Date());
  await put(f.dir, 'notes.txt', 'unknown');
  await put(f.dir, 'reports/x.jsonl', 'report');
  await put(f.dir, 'reviews/r/card.json', 'review');
  await put(f.dir, 'playdata/x.jsonl', 'play');
  await put(f.dir, `.trash/${expired}/v01-expired.json`);
  await put(f.dir, `.trash/${newer}/v01-newer.json`);
  const before = await Promise.all(current.map((name) => fs.stat(path.join(f.dir, name))));
  const logs: string[] = [];
  const config = () =>
    loadConfig(
      { DATA_DIR: f.dir, REPORT_TOKEN: 't' },
      {
        log: (...args) => {
          logs.push(args.map(String).join(' '));
        },
      },
    );
  let service = createService(config());
  t.after(async () => {
    await service.close({ save: false });
    await fs.rm(f.dir, { recursive: true, force: true });
  });
  let port = await service.listen(0);
  const get = async () => {
    const response = await fetch(`http://127.0.0.1:${port}/admin/saves`, { headers: { authorization: 'Bearer t' } });
    assert.equal(response.status, 200);
    return response.json();
  };
  const first = await get();
  assert.equal(first.current.count, 2);
  assert.deepEqual(first.files, []);
  assert.deepEqual(first.legacyFiles, []);
  assert.deepEqual(first.unknown, ['notes.txt']);
  assert.equal(first.lastCleanup.enabled, true);
  assert.deepEqual(first.lastCleanup.errors, []);
  assert.deepEqual(
    first.lastCleanup.moved.map((file: { name: string }) => file.name),
    candidates,
  );
  assert.deepEqual(first.lastCleanup.purged, [`.trash/${expired}`]);
  const manifest = JSON.parse(await fs.readFile(path.join(f.dir, first.lastCleanup.trash, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.files, first.lastCleanup.moved);
  assert.equal(logs.filter((line) => line.startsWith('save cleanup:')).length, 1);
  assert.match(
    logs.find((line) => line.startsWith('save cleanup:'))!,
    /unknown 1 \["notes.txt"\]/,
  );
  assert.ok(
    logs.findIndex((line) => line.startsWith('save cleanup:')) <
      logs.findIndex((line) => line.startsWith('hosting rooms:')),
  );
  const folders = await fs.readdir(path.join(f.dir, '.trash'));
  await service.close({ save: false });
  service = createService(config());
  port = await service.listen(0);
  const again = await get();
  assert.deepEqual(again.lastCleanup.moved, []);
  assert.deepEqual(again.lastCleanup.purged, []);
  assert.equal(again.lastCleanup.trash, null);
  assert.deepEqual(await fs.readdir(path.join(f.dir, '.trash')), folders);
  assert.equal(logs.filter((line) => line.startsWith('save cleanup:')).length, 2);
  for (const [index, name] of current.entries()) {
    assert.equal(await fs.readFile(path.join(f.dir, name), 'utf8'), `keep:${name}`);
    assert.equal((await fs.stat(path.join(f.dir, name))).mtimeMs, before[index]!.mtimeMs);
  }
  for (const name of [
    'notes.txt',
    'reports/x.jsonl',
    'reviews/r/card.json',
    'playdata/x.jsonl',
    'v01-fresh.json.12.abcdef01.tmp',
  ])
    assert.ok(await fs.stat(path.join(f.dir, name)));
});
