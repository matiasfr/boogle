// POST and GET /playdata (server/src/playdata.ts): a public endpoint, so the shape, the caps and the token.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig } from '../src/server.ts';
import type { ServerConfig } from '../src/server.ts';

async function start(env: Record<string, string> = {}, overrides: Partial<ServerConfig> = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-play-'));
  const cfg = loadConfig({ DATA_DIR: dataDir, REPORT_TOKEN: 'sesame', ...env }, { log: () => {}, ...overrides });
  const svc = createService(cfg);
  const base = `http://127.0.0.1:${await svc.listen(0)}`;
  const post = (body: unknown) =>
    fetch(`${base}/playdata`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  const get = (p: string, token = 'sesame') => fetch(`${base}${p}`, { headers: { authorization: `Bearer ${token}` } });
  return {
    base,
    dataDir,
    post,
    get,
    async stop() {
      await svc.close();
      await fs.rm(dataDir, { recursive: true, force: true });
    },
  };
}
const batch = (s: string, n = 0, ev: unknown[] = [{ t: 1, k: 'p', x: 3, z: -4 }], card = 'place') => ({
  s,
  card,
  n,
  now: 2,
  ev,
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('playdata: a batch appends a line per session, cleaned, and reads back with the token', async () => {
  const s = await start();
  try {
    const session = { t: 0, k: 'session', name: 'Ana', room: 'proto-place', touch: true, junk: { a: 1 } };
    assert.equal((await s.post(batch('abcd1234-aa', 0, [session, { t: 1, k: 'p', x: 3 }]))).status, 204);
    assert.equal((await s.post(batch('abcd1234-aa', 1, [{ t: 2, k: 'mark', name: 'x'.repeat(900) }]))).status, 204);
    const r = await s.get('/playdata/abcd1234-aa');
    assert.equal(r.status, 200);
    const lines = (await r.text())
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    assert.equal(lines.length, 2);
    assert.ok(lines[0].at);
    assert.equal(lines[0].ev[0].junk, undefined);
    assert.equal(lines[0].ev[0].touch, true);
    assert.equal(lines[1].ev[0].name.length, 300);
    const list = await (await s.get('/playdata')).json();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'abcd1234-aa');
    assert.equal(list[0].card, 'place');
    assert.equal(list[0].meta.name, 'Ana');
  } finally {
    await s.stop();
  }
});

test('playdata: junk is refused without harm, and unknown cards are not stored', async () => {
  const s = await start();
  try {
    const bad = [
      '{nope',
      [],
      'null',
      { s: '../../etc/passwd', card: 'place', n: 0, now: 0, ev: [{ t: 0, k: 'p' }] },
      batch('abcd1234-aa', -1),
      batch('abcd1234-aa', 0, []),
      batch('abcd1234-aa', 0, ['p']),
      batch('abcd1234-aa', 0, [{ t: 'soon', k: 'p' }]),
      batch('abcd1234-aa', 0, [{ t: 1, k: 'has space' }]),
      batch(
        'abcd1234-aa',
        0,
        Array.from({ length: 501 }, () => ({ t: 1, k: 'p' })),
      ),
    ];
    for (const b of bad) assert.equal((await s.post(b)).status, 400, JSON.stringify(b).slice(0, 60));
    assert.equal((await s.post(batch('abcd1234-aa', 0, undefined, 'not-a-card'))).status, 422);
    assert.equal((await s.post('x'.repeat(70 * 1024))).status, 413);
    assert.deepEqual(await (await s.get('/playdata')).json(), []);
    assert.equal((await s.post(batch('abcd1234-aa'))).status, 204); // still up
  } finally {
    await s.stop();
  }
});

test('playdata: a session stops at its cap, and the oldest sessions go past the total cap', async () => {
  const s = await start({}, { playMaxSessionBytes: 400, playMaxTotalBytes: 1000 });
  try {
    assert.equal((await s.post(batch('session-0001'))).status, 204);
    const big = batch('session-0001', 1, [{ t: 1, k: 'p', a: 'x'.repeat(290), b: 'y'.repeat(290) }]);
    assert.equal((await s.post(big)).status, 507);
    for (let i = 2; i <= 16; i++) {
      assert.equal((await s.post(batch(`session-${String(i).padStart(4, '0')}`))).status, 204);
      await sleep(2); // distinct write times
    }
    const list: { id: string }[] = await (await s.get('/playdata')).json();
    const files = await fs.readdir(path.join(s.dataDir, 'playdata'));
    assert.equal(files.length, list.length);
    assert.ok(list.length < 16, `${list.length} sessions kept`);
    assert.equal(list[0]!.id, 'session-0016');
    assert.ok(!list.some((l) => l.id === 'session-0001'));
  } finally {
    await s.stop();
  }
});

test('playdata: past the session count the oldest goes', async () => {
  const s = await start({}, { playMaxSessions: 2 });
  try {
    for (const id of ['session-0001', 'session-0002', 'session-0003']) {
      assert.equal((await s.post(batch(id))).status, 204);
      await sleep(5);
    }
    const files = (await fs.readdir(path.join(s.dataDir, 'playdata'))).sort();
    assert.deepEqual(files, ['session-0002.jsonl', 'session-0003.jsonl']);
  } finally {
    await s.stop();
  }
});

test('playdata: reads need the token, and 404 without one configured', async () => {
  const s = await start();
  const open = await start({ REPORT_TOKEN: '' });
  try {
    assert.equal((await s.get('/playdata', 'wrong')).status, 401);
    assert.equal((await s.get('/playdata/abcd1234-aa', 'wrong')).status, 401);
    assert.equal((await s.get('/playdata/abcd1234-aa')).status, 404);
    assert.equal((await s.get('/playdata/Bad..Id')).status, 400);
    assert.equal((await open.get('/playdata')).status, 404);
  } finally {
    await s.stop();
    await open.stop();
  }
});

test('playdata: the per-IP rate limit answers 429', async () => {
  const s = await start({ PLAY_RATE_PER_MIN: '2' });
  try {
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await s.post(batch('abcd1234-aa', i))).status);
    assert.deepEqual(codes, [204, 204, 429]);
  } finally {
    await s.stop();
  }
});
